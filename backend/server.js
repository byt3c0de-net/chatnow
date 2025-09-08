require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authRouter = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Chat data
const onlineUsers = new Set();
const messagesByChannel = { general: [], random: [] };

// JWT auth for Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.username = decoded.email;
    return next();
  } catch (err) {
    return next(new Error('Authentication error'));
  }
});

// Socket.IO events
io.on('connection', socket => {
  console.log(`User connected: ${socket.username}`);
  onlineUsers.add(socket.username);
  io.emit('update users', Array.from(onlineUsers));

  socket.on('join channel', channel => {
    socket.join(channel);
    if (!messagesByChannel[channel]) messagesByChannel[channel] = [];
    socket.emit('chat history', messagesByChannel[channel]);
  });

  socket.on('chat message', msgObj => {
    const channel = msgObj.channel || 'general';
    if (!messagesByChannel[channel]) messagesByChannel[channel] = [];
    messagesByChannel[channel].push(msgObj);
    io.to(channel).emit('chat message', msgObj);
  });

  socket.on('typing', user => socket.broadcast.emit('typing', user));
  socket.on('stop typing', user => socket.broadcast.emit('stop typing', user));

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.username);
    io.emit('update users', Array.from(onlineUsers));
    console.log(`User disconnected: ${socket.username}`);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
