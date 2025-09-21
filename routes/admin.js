const express = require('express');
const bcrypt = require('bcryptjs');
const { auth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const ClassModel = require('../models/Class');

const router = express.Router();

// Create or update a user
router.post('/users', auth(false), async (req, res) => {
  try {
    const allowOpen = process.env.ALLOW_OPEN_WRITE === 'true';
    if (!allowOpen) {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
    }
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
    const user = await User.findOneAndUpdate(
      { username },
      { username, passwordHash, role, fullName, classId },
      { upsert: true, new: true }
    );
    console.log('User upserted:', user.username, user._id.toString());
    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('Admin create user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// List users (optionally by role)
router.get('/users', auth(false), async (req, res) => {
  const allowOpen = process.env.ALLOW_OPEN_WRITE === 'true';
  if (!allowOpen) {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  }
  const { role } = req.query;
  const filter = role ? { role } : {};
  const users = await User.find(filter).populate('classId');
  res.json({ success: true, users });
});

module.exports = router;
