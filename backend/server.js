// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// ----------------- DATABASE -----------------
const db = new sqlite3.Database('./chat.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);
});

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

// ----------------- AUTH ENDPOINTS -----------------

// Register new account
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Username validation
  const usernameRegex = /^[A-Za-z0-9_]{3,14}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).send('Username must be 3–14 characters, only letters, numbers, or underscore.');
  }

  if (!password || password.length < 4) {
    return res.status(400).send('Password must be at least 4 characters.');
  }

  const hashed = await bcrypt.hash(password, 10);

  db.run(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hashed],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).send('Username already taken.');
        }
        return res.status(500).send('Database error.');
      }
      res.send('Account created successfully!');
    }
  );
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).send('Database error.');
    if (!user) return res.status(400).send('Invalid username or password.');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send('Invalid username or password.');

    req.session.user = { id: user.id, username: user.username };
    res.send('Logged in successfully!');
  });
});

// Get current user
app.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).send('Not logged in.');
  res.json(req.session.user);
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.send('Logged out.'));
});

// ----------------- CHAT SYSTEM -----------------
const messagesByChannel = { general: [], random: [] };
const onlineUsers = {};

io.on('connection', socket => {
  console.log('User connected');

  socket.on('join channel', ({ channel, username }) => {
    socket.username = username;
    onlineUsers[socket.id] = username;
    socket.join(channel);

    // Send chat history
    socket.emit('chat history', messagesByChannel[channel] || []);

    // Update users
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
    console.log('User disconnected');
  });
});

// ----------------- START SERVER -----------------
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
