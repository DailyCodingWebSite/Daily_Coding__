const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const ClassModel = require('../models/Class');

const router = express.Router();

// Helper to compose scheduledAt from date + startTime (local time)
function toScheduledAt(date, startTime) {
  try {
    const dt = new Date(`${date}T${startTime}:00`);
    return dt;
  } catch {
    return new Date();
  }
}

// POST /quizzes  (admin) create a quiz for a class with question ids
router.post('/', auth(true), requireRole(['admin']), async (req, res) => {
  try {
    const { className, classId, questionIds, date, startTime, endTime } = req.body || {};
    if ((!className && !classId) || !Array.isArray(questionIds) || questionIds.length < 1 || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    let clsId = classId || null;
    if (!clsId) {
      let cls = await ClassModel.findOne({ name: className });
      if (!cls) cls = await ClassModel.create({ name: className });
      clsId = cls._id;
    }

    // Validate questions exist
    const count = await Question.countDocuments({ _id: { $in: questionIds } });
    if (count !== questionIds.length) {
      return res.status(400).json({ success: false, message: 'Some questionIds are invalid' });
    }

    const quiz = await Quiz.create({ classId: clsId, questionIds, date, startTime, endTime });
    return res.status(201).json({ success: true, quiz });
  } catch (err) {
    console.error('Create quiz error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /quizzes  list all (admin)
router.get('/', auth(true), requireRole(['admin']), async (_req, res) => {
  try {
    const list = await Quiz.find().populate('classId').populate('questionIds');
    res.json({ success: true, quizzes: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
