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
// Support both Render rootDirectory=backend (../frontend) and rootDirectory=repo-root (./frontend)
const fs = require('fs');
const FRONTEND_DIR_CANDIDATES = [
  path.resolve(__dirname, '../frontend'),
  path.resolve(__dirname, './frontend')
];
let FRONTEND_DIR = FRONTEND_DIR_CANDIDATES.find((p) => fs.existsSync(p));
if (!FRONTEND_DIR) {
  // Last resort: use repo root guess used by Render when rootDirectory is repo root
  FRONTEND_DIR = path.resolve(process.cwd(), 'frontend');
}
console.log('Serving frontend from:', FRONTEND_DIR);

app.use(express.static(FRONTEND_DIR));
app.get('/', (req, res) => {
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Frontend index.html not found. Expected at: ' + indexPath);
  }
});

// Root logout endpoint for frontend compatibility
app.post('/logout', (req, res) => {
  return res.json({ success: true });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
