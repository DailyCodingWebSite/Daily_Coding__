// server.js - Daily Coding Challenge backend (MongoDB Community / local ready)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(bodyParser.json());

// ---------- MongoDB Connection ----------
// Prefer .env (MONGO_URI). Fallback to local MongoDB Community
// Example local: mongodb://127.0.0.1:27017/Daily_coding_challenge
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Daily_coding_challenge';

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected:', MONGO_URI))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// ---------- Routes ----------
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/faculty', require('./routes/faculty'));
app.use('/student', require('./routes/student'));
app.use('/questions', require('./routes/questions'));
app.use('/quizzes', require('./routes/quizzes'));
app.use('/classes', require('./routes/classes'));

// ---------- Static Frontend ----------
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
 const path = require('path');
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');
app.use(express.static(FRONTEND_DIR));
app.get('*', (_req, res) => { res.sendFile(path.join(FRONTEND_DIR, 'index.html')); });


// Root logout endpoint for frontend compatibility
app.post('/logout', (req, res) => {
  return res.json({ success: true });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
