const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { requireJwt } = require('../../middleware/auth');
const db = require('../../services/db');

const router = Router();

router.use(requireJwt);

router.get('/', (req, res) => {
  const { group_id } = req.query;
  let sql = 'SELECT * FROM sessions';
  const params = [];
  if (group_id) {
    sql += ' WHERE group_id = ?';
    params.push(group_id);
  } else {
    sql += ' WHERE group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)';
    params.push(req.userId);
  }
  sql += ' ORDER BY session_date, session_time';
  const sessions = db.q(sql, params);
  const result = sessions.map(s => {
    const attendees = db.q('SELECT u.id, u.name FROM session_attendees sa JOIN users u ON u.id = sa.user_id WHERE sa.session_id = ?', [s.id]);
    return { ...s, attendees };
  });
  res.json({ sessions: result });
});

router.post('/', [
  body('group_id').notEmpty().withMessage('Group ID is required'),
  body('name').trim().notEmpty().withMessage('Session name is required'),
  body('session_date').notEmpty().withMessage('Date is required'),
  body('session_time').notEmpty().withMessage('Time is required'),
  body('duration').optional().isInt({ min: 15 }),
  body('type').optional().isIn(['focus', 'video', 'inperson']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { group_id, name, session_date, session_time, duration, type } = req.body;
  const member = db.qOne('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [group_id, req.userId]);
  if (!member) return res.status(403).json({ error: 'Not a member of this group' });
  const id = uuidv4();
  db.qRun('INSERT INTO sessions (id, group_id, name, session_date, session_time, duration, type, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, group_id, name, session_date, session_time, duration || 60, type || 'focus', req.userId]);
  const members = db.q('SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?', [group_id, req.userId]);
  members.forEach(m => {
    db.qRun('INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), m.user_id, 'info', 'New session scheduled', `${name} on ${session_date} at ${session_time}`]);
  });
  const session = db.qOne('SELECT * FROM sessions WHERE id = ?', [id]);
  res.status(201).json({ session });
});

router.post('/:id/attend', (req, res) => {
  const session = db.qOne('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const existing = db.qOne('SELECT id FROM session_attendees WHERE session_id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (existing) return res.status(409).json({ error: 'Already attending' });
  db.qRun('INSERT INTO session_attendees (id, session_id, user_id) VALUES (?, ?, ?)', [uuidv4(), req.params.id, req.userId]);
  const hours = session.duration / 60;
  db.qRun('UPDATE users SET total_hours = total_hours + ?, weekly_hours = weekly_hours + ?, streak = streak + 1 WHERE id = ?', [hours, hours, req.userId]);
  res.json({ message: 'Marked as attending' });
});

module.exports = router;
