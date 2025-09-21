const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// GET /faculty/students - list students in the faculty's class
router.get('/students', auth(true), requireRole(['faculty']), async (req, res) => {
  try {
    const faculty = await User.findById(req.user.id);
    if (!faculty || !faculty.classId) {
      return res.json({ success: true, students: [] });
    }

    const students = await User.find({ role: 'student', classId: faculty.classId })
      .select('_id fullName username');

    const shaped = students.map(s => ({
      _id: s._id,
      fullName: s.fullName || s.username,
      class: '',
    }));

    res.json({ success: true, students: shaped });
  } catch (err) {
    console.error('GET /faculty/students error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
