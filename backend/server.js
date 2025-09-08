const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

// --- CHAT DATA ---
const messagesByChannel = { general: [], random: [] };
const onlineUsers = {}; // socket.id → username

io.on('connection', socket => {
  console.log('User connected');

  // Listen for join
  socket.on('join channel', ({ channel, username }) => {
    socket.username = username;
    onlineUsers[socket.id] = username;
    socket.join(channel);

    if (!messagesByChannel[channel]) messagesByChannel[channel] = [];
    socket.emit('chat history', messagesByChannel[channel]);

    io.emit('update users', Object.values(onlineUsers)); // update everyone
  });

  socket.on('chat message', msg => {
    const channel = msg.channel || 'general';
    if (!messagesByChannel[channel]) messagesByChannel[channel] = [];
    messagesByChannel[channel].push(msg);
    io.to(channel).emit('chat message', msg);
  });

  socket.on('typing', user => socket.broadcast.emit('typing', user));
  socket.on('stop typing', user => socket.broadcast.emit('stop typing', user));

  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    io.emit('update users', Object.values(onlineUsers));
    console.log('User disconnected');
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
