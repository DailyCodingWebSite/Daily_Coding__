const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');

const router = express.Router();

// GET /student/quizzes - return upcoming/recent quizzes for the logged-in student
router.get('/quizzes', auth(true), requireRole(['student']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.classId) {
      return res.json({ success: true, quizzes: [] });
    }

    // Get quizzes for student's class for today or most recent
    const today = new Date().toISOString().split('T')[0];
    const quizzes = await Quiz.find({ classId: user.classId, date: { $lte: today } })
      .sort({ date: -1, createdAt: -1 })
      .limit(3)
      .populate('questionIds');

    // Shape response with populated questions as the frontend expects
    const shaped = quizzes.map(q => ({
      _id: q._id,
      scheduledAt: new Date(`${q.date}T${q.startTime}:00`),
      questions: q.questionIds.map(qq => ({ _id: qq._id, text: qq.text, options: qq.options }))
    }));

    return res.json({ success: true, quizzes: shaped });
  } catch (err) {
    console.error('GET /student/quizzes error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /student/attempt - submit answers and compute score
// Expects { quizId, answers: [{questionId, selectedOption}] }
router.post('/attempt', auth(true), requireRole(['student']), async (req, res) => {
  try {
    const { quizId, answers } = req.body || {};
    if (!quizId || !Array.isArray(answers) || answers.length < 1) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    // Load the quiz and questions
    const quiz = await Quiz.findById(quizId).populate('questionIds');
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    // Build a quick lookup for correct indices
    const correctMap = new Map(); // questionId -> correctIndex
    quiz.questionIds.forEach(q => correctMap.set(String(q._id), q.correctIndex));

    // Grade
    let score = 0;
    const detailedResults = [];
    answers.forEach((a, idx) => {
      const qId = String(a.questionId);
      const correctIndex = correctMap.get(qId);
      const selected = a.selectedOption;
      const isCorrect = typeof correctIndex === 'number' && selected === correctIndex;
      if (isCorrect) score += 1;
      const qDoc = quiz.questionIds.find(q => String(q._id) === qId);
      detailedResults.push({
        questionId: qId,
        questionText: qDoc?.text || `Question ${idx + 1}`,
        studentAnswer: ['A','B','C','D'][selected],
        correctAnswer: typeof correctIndex === 'number' ? ['A','B','C','D'][correctIndex] : undefined,
        isCorrect
      });
    });

    // Save attempt
    const attempt = await Attempt.create({
      quizId: quiz._id,
      studentId: req.user.id,
      answers: answers.map(a => a.selectedOption),
      score
    });

    return res.json({ success: true, score, attemptId: attempt._id, detailedResults });
  } catch (err) {
    console.error('POST /student/attempt error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
