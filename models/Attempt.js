const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{ type: Number, required: true }], // indices selected per question
  score: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Attempt', attemptSchema);
