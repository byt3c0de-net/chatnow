const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;  // Render sets PORT
const MESSAGE_FILE = path.join(__dirname, 'messages.json');

// Serve static files (everything inside frontend/)
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve index.html from frontend/
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Ensure message file exists
if (!fs.existsSync(MESSAGE_FILE)) {
  fs.writeFileSync(MESSAGE_FILE, JSON.stringify([]));
}

// Load messages
function loadMessages() {
  const data = fs.readFileSync(MESSAGE_FILE);
  const messages = JSON.parse(data);
  return messages.map(m => typeof m === 'string' ? { username: 'Unknown', message: m } : m);
}

// Save messages
function saveMessage(msgObj) {
  const messages = loadMessages();
  messages.push(msgObj);
  fs.writeFileSync(MESSAGE_FILE, JSON.stringify(messages, null, 2));
}

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.emit('chat history', loadMessages());

  socket.on('chat message', (msgObj) => {
    saveMessage(msgObj);
    io.emit('chat message', msgObj);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
