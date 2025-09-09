// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// ----------------- MIDDLEWARE -----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-key',
  resave: false,
  saveUninitialized: false,
}));

// ----------------- FRONTEND -----------------
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ----------------- AUTH -----------------
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  const usernameRegex = /^[A-Za-z0-9_]{3,14}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).send('Username must be 3–14 characters, letters/numbers/_ only.');
  }
  if (!password || password.length < 4) {
    return res.status(400).send('Password must be at least 4 characters.');
  }

  const normalized = username.toLowerCase();

  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, username_normalized, password) VALUES ($1, $2, $3)',
      [username, normalized, hashed]
    );
    res.send('Account created successfully!');
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).send('Username already taken (case-insensitive).');
    }
    console.error(err);
    res.status(500).send('Database error.');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const normalized = username.toLowerCase();

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username_normalized = $1',
      [normalized]
    );
    const user = rows[0];
    if (!user) return res.status(400).send('Invalid username or password.');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send('Invalid username or password.');

    req.session.user = { id: user.id, username: user.username }; // keep original case for display
    res.send('Logged in successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

app.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).send('Not logged in.');
  res.json(req.session.user);
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.send('Logged out.'));
});

// ----------------- CHAT -----------------
const messagesByChannel = { general: [], random: [] };
const onlineUsers = {};

io.on('connection', socket => {
  console.log('User connected');

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

  socket.on('typing', user => socket.broadcast.emit('typing', user));
  socket.on('stop typing', user => socket.broadcast.emit('stop typing', user));

  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    io.emit('update users', Object.values(onlineUsers));
    console.log('User disconnected');
  });
});

// ----------------- START SERVER -----------------
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
