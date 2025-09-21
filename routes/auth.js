const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ClassModel = require('../models/Class');

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, fullName, className } = req.body || {};
    if (!username || !password || !role || !fullName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let classId = null;
    if (className) {
      let cls = await ClassModel.findOne({ name: className });
      if (!cls) cls = await ClassModel.create({ name: className });
      classId = cls._id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash, role, fullName, classId });

    return res.status(201).json({ success: true, user: { _id: user._id, username, role, fullName, classId } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Missing credentials' });
    }

    const user = await User.findOne({ username }).populate('classId');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (role && user.role !== role) {
      return res.status(403).json({ success: false, message: 'Role mismatch' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        class: user.classId?.name || ''
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /logout (stateless JWT; respond OK for client cleanup)
router.post('/logout', (req, res) => {
  return res.json({ success: true });
});

module.exports = router;
