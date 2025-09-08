// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

// Email transporter (Gmail with App Password)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// -------------------- REGISTER --------------------
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const user = new User({
      email,
      password: hashed,
      verificationCode: code,
      verified: false
    });

    await user.save();

    // Send verification email
    await transporter.sendMail({
      from: `"ChatNow" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your ChatNow account',
      text: `Your verification code is: ${code}`
    });

    return res.status(201).json({ message: 'Verification code sent to email' });
  } catch (err) {
    console.error('❌ Error in /register:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// -------------------- VERIFY --------------------
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.verified) return res.status(400).json({ error: 'Already verified' });
    if (user.verificationCode !== code) return res.status(400).json({ error: 'Invalid code' });

    user.verified = true;
    user.verificationCode = undefined;
    await user.save();

    return res.json({ message: 'Account verified. You can now log in.' });
  } catch (err) {
    console.error('❌ Error in /verify:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// -------------------- LOGIN --------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    if (!user.verified) return res.status(400).json({ error: 'Please verify your email first' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.json({ token, username: user.email });
  } catch (err) {
    console.error('❌ Error in /login:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
