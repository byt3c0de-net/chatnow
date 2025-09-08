const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

// --- CHAT LOGIC ---
const onlineUsers = new Set();
const messagesByChannel = { general: [], random: [] };

io.on('connection', socket => {
  console.log('✅ User connected');

  // Add username from client
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

  socket.on('disconnect', () => console.log('❌ User disconnected'));
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
