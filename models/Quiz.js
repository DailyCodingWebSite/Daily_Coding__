const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true }],
  date: { type: String, required: true }, // YYYY-MM-DD
  startTime: { type: String, required: true }, // HH:mm
  endTime: { type: String, required: true }, // HH:mm
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
