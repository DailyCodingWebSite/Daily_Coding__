const express = require('express');
const { auth } = require('../middleware/auth');
const Question = require('../models/Question');

const router = express.Router();

// Create a question
router.post('/', auth(false), async (req, res) => {
  try {
    const allowOpen = process.env.ALLOW_OPEN_WRITE === 'true';
    if (!allowOpen) {
      // Require admin when not in open-write mode
      if (!req.user || req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
    }
    let { text, options, correctIndex, correctAnswer, tags } = req.body || {};
    if (!text || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Invalid question payload' });
    }
    if (typeof correctIndex !== 'number') {
      // accept letter form 'A'|'B'|'C'|'D'
      const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      if (typeof correctAnswer === 'string' && correctAnswer.toUpperCase() in map) {
        correctIndex = map[correctAnswer.toUpperCase()];
      }
    }
    if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= options.length) {
      return res.status(400).json({ success: false, message: 'Missing or invalid correct answer' });
    }
    const q = await Question.create({ text, options, correctIndex, tags: tags || [] });
    console.log('Question created:', q._id, q.text);
    return res.status(201).json({ success: true, question: q });
  } catch (err) {
    console.error('Create question error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// List questions
router.get('/', auth(false), async (_req, res) => {
  try {
    const list = await Question.find().sort({ createdAt: -1 });
    // Return as array for convenience
    res.json(list);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a question by id
router.delete('/:id', auth(false), async (req, res) => {
  try {
    const allowOpen = process.env.ALLOW_OPEN_WRITE === 'true';
    if (!allowOpen) {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
    }
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
