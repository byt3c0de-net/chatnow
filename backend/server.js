const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-key',
  resave: false,
  saveUninitialized: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

// ---- AUTH ----
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing fields');
  const hashed = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed], err => {
    if (err) return res.status(400).send('User already exists');
    res.send('Registered successfully');
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (!user) return res.status(400).send('Invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send('Invalid credentials');
    req.session.user = { id: user.id, username: user.username };
    res.send('Logged in');
  });
});

app.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).send('Not logged in');
  res.json(req.session.user);
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.send('Logged out'));
});

// ---- CHAT ----
const messagesByChannel = { general: [], random: [] };
const onlineUsers = {};

io.on('connection', socket => {
  socket.on('join channel', ({ channel, username }) => {
    socket.username = username;
    onlineUsers[socket.id] = username;
    socket.join(channel);
    socket.emit('chat history', messagesByChannel[channel] || []);
    io.emit('update users', Object.values(onlineUsers));
  });

  socket.on('chat message', msg => {
    const channel = msg.channel || 'general';
    if (!messagesByChannel[channel]) messagesByChannel[channel] = [];
    messagesByChannel[channel].push(msg);
    io.to(channel).emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    io.emit('update users', Object.values(onlineUsers));
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
