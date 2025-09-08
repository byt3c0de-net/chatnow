const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// Configure Nodemailer (example using Gmail)
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const user = new User({ email, passwordHash, verificationCode });
  await user.save();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'ChatNow Verification Code',
    text: `Your verification code is: ${verificationCode}`
  });

  res.json({ message: 'Verification code sent to email' });
});

// Verify
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'User not found' });
  if (user.verificationCode !== code) return res.status(400).json({ error: 'Invalid code' });

  user.isVerified = true;
  user.verificationCode = '';
  await user.save();
  res.json({ message: 'Email verified' });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'User not found' });
  if (!user.isVerified) return res.status(400).json({ error: 'Email not verified' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ error: 'Invalid password' });

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

module.exports = router;
