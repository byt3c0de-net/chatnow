const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

// Data structures
const onlineUsers = new Set();
const messagesByChannel = { general: [], random: [] };
const typingUsers = new Set();

io.on('connection', socket => {
  // New user
  socket.on('new user', username => {
    socket.username = username;
    onlineUsers.add(username);
    io.emit('update users', Array.from(onlineUsers));
  });

  // Join channel
  socket.on('join channel', channel => {
    socket.join(channel);
    if(!messagesByChannel[channel]) messagesByChannel[channel] = [];
    socket.emit('chat history', messagesByChannel[channel]);
  });

  // Chat messages
  socket.on('chat message', msgObj => {
    const channel = msgObj.channel || 'general';
    if(!messagesByChannel[channel]) messagesByChannel[channel] = [];
    messagesByChannel[channel].push(msgObj);
    io.to(channel).emit('chat message', msgObj);
  });

  // Typing
  socket.on('typing', user => socket.broadcast.emit('typing', user));
  socket.on('stop typing', user => socket.broadcast.emit('stop typing', user));

  // Disconnect
  socket.on('disconnect', () => {
    if(socket.username) onlineUsers.delete(socket.username);
    io.emit('update users', Array.from(onlineUsers));
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
