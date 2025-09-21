const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: { type: [String], required: true, validate: v => v.length >= 2 },
  correctIndex: { type: Number, required: true },
  tags: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
