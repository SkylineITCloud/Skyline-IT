const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

router.use(authenticate);

router.get('/users', (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = (page - 1) * limit;

  const users = db.q(
    'SELECT id, email, name, course, study_method, streak, total_hours, weekly_hours, is_online, last_seen, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  const total = db.qOne('SELECT COUNT(*) AS cnt FROM users');

  res.json({ users, total: total ? total.cnt : 0, page, limit });
});

router.post(
  '/users',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('course').optional().trim(),
    body('study_method').optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email, password, course, study_method } = req.body;

    const existing = db.qOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 12);

    db.qRun(
      'INSERT INTO users (id, email, password_hash, name, course, study_method) VALUES (?, ?, ?, ?, ?, ?)',
      [id, email, password_hash, name, course || '', study_method || 'Pomodoro']
    );

    const user = db.qOne('SELECT id, email, name, course, study_method, is_online, created_at FROM users WHERE id = ?', [id]);
    res.status(201).json({ user });
  }
);

router.put('/users/:id/toggle-online', (req, res) => {
  const user = db.qOne('SELECT id, is_online FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const newStatus = user.is_online ? 0 : 1;
  db.qRun('UPDATE users SET is_online = ?, last_seen = datetime(\'now\') WHERE id = ?', [newStatus, req.params.id]);

  res.json({ message: 'User online status toggled', is_online: newStatus });
});

router.delete('/users/:id', (req, res) => {
  const user = db.qOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.qRun('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'User deleted' });
});

module.exports = router;
