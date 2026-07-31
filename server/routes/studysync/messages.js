const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { requireJwt } = require('../../middleware/auth');
const db = require('../../services/db');

const router = Router();

router.use(requireJwt);

router.get('/', (req, res) => {
  const { group_id, limit } = req.query;
  if (!group_id) return res.status(400).json({ error: 'group_id is required' });
  const numLimit = Math.min(parseInt(limit, 10) || 100, 200);
  const messages = db.q(
    'SELECT m.*, u.name AS user_name FROM messages m JOIN users u ON u.id = m.user_id WHERE m.group_id = ? ORDER BY m.created_at ASC LIMIT ?', [group_id, numLimit]
  );
  res.json({ messages });
});

router.post('/', [
  body('group_id').notEmpty().withMessage('Group ID is required'),
  body('content').trim().notEmpty().withMessage('Message content is required'),
  body('type').optional().isIn(['text', 'shoutout']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { group_id, content, type } = req.body;
  const member = db.qOne('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [group_id, req.userId]);
  if (!member) return res.status(403).json({ error: 'Not a member of this group' });
  const id = uuidv4();
  db.qRun('INSERT INTO messages (id, group_id, user_id, content, type) VALUES (?, ?, ?, ?, ?)', [id, group_id, req.userId, content, type || 'text']);
  const messages = db.q('SELECT m.*, u.name AS user_name FROM messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?', [id]);
  res.status(201).json({ message: messages[0] || {} });
});

router.post('/shoutout', [
  body('group_id').notEmpty(),
  body('member_id').notEmpty(),
  body('message').trim().notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { group_id, member_id, message } = req.body;
  const user = db.qOne('SELECT name FROM users WHERE id = ?', [req.userId]);
  const member = db.qOne('SELECT name FROM users WHERE id = ?', [member_id]);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  const shoutContent = `\uD83C\uDF89 Shout-Out! ${user.name} praises ${member.name}: ${message}`;
  const id = uuidv4();
  db.qRun('INSERT INTO messages (id, group_id, user_id, content, type) VALUES (?, ?, ?, ?, ?)', [id, group_id, req.userId, shoutContent, 'shoutout']);
  const messages = db.q('SELECT m.*, u.name AS user_name FROM messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?', [id]);
  res.status(201).json({ message: messages[0] || {} });
});

module.exports = router;
