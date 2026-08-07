const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

router.use(authenticate);

router.post('/complete', [
  body('duration').isInt({ min: 1 }).withMessage('Duration in minutes is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { duration } = req.body;
  const id = uuidv4();

  db.qRun('INSERT INTO pomodoro_sessions (id, user_id, duration) VALUES (?, ?, ?)', [id, req.userId, duration]);

  const hours = duration / 60;
  db.qRun('UPDATE users SET total_hours = total_hours + ?, weekly_hours = weekly_hours + ? WHERE id = ?', [hours, hours, req.userId]);

  res.status(201).json({ id, message: 'Pomodoro session recorded' });
});

router.get('/stats', (req, res) => {
  const total = db.qOne('SELECT COUNT(*) AS count, COALESCE(SUM(duration), 0) AS total_minutes FROM pomodoro_sessions WHERE user_id = ?', [req.userId]);
  const recent = db.q('SELECT * FROM pomodoro_sessions WHERE user_id = ? ORDER BY completed_at DESC LIMIT 10', [req.userId]);

  res.json({ stats: { count: total ? total.count : 0, total_minutes: total ? total.total_minutes : 0 }, recent });
});

module.exports = router;
