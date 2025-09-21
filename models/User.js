const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'faculty', 'student'], required: true },
  fullName: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
