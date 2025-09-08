require('dotenv').config(); // Load .env variables
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // allow frontend connections
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

// Data structures
const onlineUsers = new Set();
const messagesByChannel = { general: [], random: [] };

// JWT middleware for Socket.IO authentication
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.username = decoded.email; // or decoded.username if you store it
    return next();
  } catch (err) {
    return next(new Error('Authentication error'));
  }
});

io.on('connection', socket => {
  console.log(`User connected: ${socket.username}`);
  onlineUsers.add(socket.username);
  io.emit('update users', Array.from(onlineUsers));

  // Join channel
  socket.on('join channel', channel => {
    socket.join(channel);
    if (!messagesByChannel[channel]) messagesByChannel[channel] = [];
    socket.emit('chat history', messagesByChannel[channel]);
  });

  // Chat messages
  socket.on('chat message', msgObj => {
    const channel = msgObj.channel || 'general';
    if (!messagesByChannel[channel]) messagesByChannel[channel] = [];
    messagesByChannel[channel].push(msgObj);
    io.to(channel).emit('chat message', msgObj);
  });

  // Typing indicators
  socket.on('typing', user => socket.broadcast.emit('typing', user));
  socket.on('stop typing', user => socket.broadcast.emit('stop typing', user));

  // Disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.username);
    io.emit('update users', Array.from(onlineUsers));
    console.log(`User disconnected: ${socket.username}`);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
