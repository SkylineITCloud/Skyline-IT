const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const config = require('../config');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

function sanitizeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('course').optional().trim(),
    body('study_method').optional().trim(),
    body('availability').optional().isArray(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email, password, course, study_method, availability } = req.body;

    const existing = db.qOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 12);

    db.qRun(
      'INSERT INTO users (id, email, password_hash, name, course, study_method, availability) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, email, password_hash, name, course || '', study_method || 'Pomodoro', JSON.stringify(availability || [])]
    );

    db.qRun("UPDATE users SET is_online = 1, last_seen = datetime('now') WHERE id = ?", [id]);

    const user = db.qOne('SELECT * FROM users WHERE id = ?', [id]);
    const token = signToken(user);

    // Create demo groups with demo members
    const demoGroups = [
      { name: 'CS Algorithms Crew', course: 'Computer Science', method: 'Pomodoro', freq: '3× weekly' },
      { name: 'Math Warriors', course: 'Mathematics', method: 'Active Recall', freq: 'Daily' },
      { name: 'Physics Lab Group', course: 'Physics', method: 'Flashcards', freq: 'Weekly' },
      { name: 'CS Finals Sprint', course: 'Computer Science', method: 'Revision Quizzes', freq: 'Daily' },
    ];

    const demoMemberIds = [];
    for (let i = 0; i < 3; i++) {
      const mid = uuidv4();
      const demos = ['Jamie K.', 'Priya M.', 'Sam T.'];
      const methods = ['Pomodoro', 'Active Recall', 'Flashcards'];
      const existing = db.qOne('SELECT id FROM users WHERE email = ?', [`demo${i+1}@studysync.edu`]);
      if (existing) {
        demoMemberIds.push(existing.id);
      } else {
        demoMemberIds.push(mid);
        db.qRun(
          'INSERT INTO users (id, email, password_hash, name, course, study_method) VALUES (?, ?, ?, ?, ?, ?)',
          [mid, `demo${i+1}@studysync.edu`, bcrypt.hashSync('password123', 12), demos[i], 'Computer Science', methods[i]]
        );
      }
    }

    const existingUserGroups = db.q('SELECT group_id FROM group_members WHERE user_id = ?', [id]);
    if (existingUserGroups.length === 0) {
      demoGroups.forEach(g => {
        const gid = uuidv4();
        db.qRun('INSERT INTO groups_ (id, name, course, study_method, frequency, max_members, created_by) VALUES (?, ?, ?, ?, ?, 4, ?)', [gid, g.name, g.course, g.method, g.freq, id]);
        db.qRun('INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)', [uuidv4(), gid, id, 'member']);
        demoMemberIds.forEach(dmid => {
          db.qRun('INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)', [uuidv4(), gid, dmid, 'member']);
        });
      });
    }

    res.status(201).json({ token, user: sanitizeUser(user) });
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const user = db.qOne('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    db.qRun("UPDATE users SET is_online = 1, last_seen = datetime('now') WHERE id = ?", [user.id]);

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  }
);

router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  const user = db.qOne('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: sanitizeUser(user) });
});

module.exports = router;
