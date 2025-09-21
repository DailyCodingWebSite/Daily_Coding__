const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const ClassModel = require('../models/Class');

const router = express.Router();

// Create class
router.post('/', auth(true), requireRole(['admin']), async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const cls = await ClassModel.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
    res.status(201).json({ success: true, class: cls });
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// List classes
router.get('/', auth(false), async (_req, res) => {
  try {
    const list = await ClassModel.find().sort({ name: 1 });
    res.json({ success: true, classes: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
