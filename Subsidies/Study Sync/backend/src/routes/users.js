const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

router.use(authenticate);

router.get('/profile', (req, res) => {
  const user = db.qOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password_hash, ...safe } = user;
  res.json({ user: safe });
});

router.put(
  '/profile',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('course').optional().trim(),
    body('study_method').optional().trim(),
    body('availability').optional().isArray(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, course, study_method, availability } = req.body;

    db.qRun(
      "UPDATE users SET name = ?, course = ?, study_method = ?, availability = ?, updated_at = datetime('now') WHERE id = ?",
      [name, course || '', study_method || 'Pomodoro', JSON.stringify(availability || []), req.userId]
    );

    const user = db.qOne('SELECT * FROM users WHERE id = ?', [req.userId]);
    const { password_hash, ...safe } = user;
    res.json({ user: safe });
  }
);

router.put(
  '/settings',
  [
    body('dark_mode').optional().isBoolean(),
    body('dnd').optional().isBoolean(),
    body('show_leaderboard').optional().isBoolean(),
  ],
  (req, res) => {
    const { dark_mode, dnd, show_leaderboard } = req.body;
    const updates = [];
    const params = [];

    if (dark_mode !== undefined) { updates.push('dark_mode = ?'); params.push(dark_mode ? 1 : 0); }
    if (dnd !== undefined) { updates.push('dnd = ?'); params.push(dnd ? 1 : 0); }
    if (show_leaderboard !== undefined) { updates.push('show_leaderboard = ?'); params.push(show_leaderboard ? 1 : 0); }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(req.userId);
      db.qRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const user = db.qOne('SELECT * FROM users WHERE id = ?', [req.userId]);
    const { password_hash, ...safe } = user;
    res.json({ user: safe });
  }
);

router.get('/leaderboard', (req, res) => {
  const users = db.q(
    'SELECT id, name, total_hours, weekly_hours, streak FROM users WHERE show_leaderboard = 1 ORDER BY total_hours DESC LIMIT 50'
  );
  res.json({ leaderboard: users });
});

router.delete('/account', (req, res) => {
  db.qRun('DELETE FROM users WHERE id = ?', [req.userId]);
  res.json({ message: 'Account deleted permanently' });
});

router.post('/heartbeat', (req, res) => {
  db.qRun("UPDATE users SET is_online = 1, last_seen = datetime('now') WHERE id = ?", [req.userId]);
  res.json({ status: 'ok' });
});

module.exports = router;
