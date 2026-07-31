const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { requireJwt } = require('../../middleware/auth');
const db = require('../../services/db');

const router = Router();

router.use(requireJwt);

router.get('/', (req, res) => {
  const { course, method } = req.query;
  let sql = 'SELECT g.*, gm.user_id AS member_id FROM groups_ g LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?';
  const params = [req.userId];
  const conditions = [];
  if (course) { conditions.push("g.course = ?"); params.push(course); }
  if (method) { conditions.push("g.study_method = ?"); params.push(method); }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY g.created_at DESC';

  const groups = db.q(sql, params);
  const result = groups.map(g => {
    const count = db.qOne('SELECT COUNT(*) AS cnt FROM group_members WHERE group_id = ?', [g.id]);
    const members = db.q(
      'SELECT u.id, u.name, u.is_online, u.last_seen FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ?', [g.id]
    );
    return {
      id: g.id, name: g.name, course: g.course, study_method: g.study_method,
      frequency: g.frequency, max_members: g.max_members, member_count: count ? count.cnt : 0,
      members, is_member: !!g.member_id, created_by: g.created_by,
    };
  });
  res.json({ groups: result });
});

router.get('/mine', (req, res) => {
  const groups = db.q(
    'SELECT g.* FROM groups_ g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? ORDER BY g.created_at DESC', [req.userId]
  );
  const result = groups.map(g => {
    const count = db.qOne('SELECT COUNT(*) AS cnt FROM group_members WHERE group_id = ?', [g.id]);
    const members = db.q(
      'SELECT u.id, u.name, u.is_online, u.last_seen FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ?', [g.id]
    );
    return {
      id: g.id, name: g.name, course: g.course, study_method: g.study_method,
      frequency: g.frequency, max_members: g.max_members, member_count: count ? count.cnt : 0,
      members, is_member: true, created_by: g.created_by,
    };
  });
  res.json({ groups: result });
});

router.get('/:id', (req, res) => {
  const group = db.qOne('SELECT * FROM groups_ WHERE id = ?', [req.params.id]);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const count = db.qOne('SELECT COUNT(*) AS cnt FROM group_members WHERE group_id = ?', [group.id]);
  const members = db.q(
    'SELECT u.id, u.name, u.total_hours, u.is_online, u.last_seen, gm.role, gm.joined_at FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ?', [group.id]
  );
  res.json({ group: { ...group, member_count: count ? count.cnt : 0, members } });
});

router.post('/', [
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('course').trim().notEmpty().withMessage('Course is required'),
  body('study_method').trim().notEmpty().withMessage('Study method is required'),
  body('frequency').optional().trim(),
  body('max_members').optional().isInt({ min: 2, max: 20 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { name, course, study_method, frequency, max_members } = req.body;
  const id = uuidv4();
  db.qRun(
    'INSERT INTO groups_ (id, name, course, study_method, frequency, max_members, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, course, study_method, frequency || 'Weekly', max_members || 4, req.userId]
  );
  db.qRun('INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)', [uuidv4(), id, req.userId, 'admin']);
  const group = db.qOne('SELECT * FROM groups_ WHERE id = ?', [id]);
  res.status(201).json({ group });
});

router.post('/:id/join', (req, res) => {
  const group = db.qOne('SELECT * FROM groups_ WHERE id = ?', [req.params.id]);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const existing = db.qOne('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (existing) return res.status(409).json({ error: 'Already a member' });
  const count = db.qOne('SELECT COUNT(*) AS cnt FROM group_members WHERE group_id = ?', [req.params.id]);
  if (count && count.cnt >= group.max_members) return res.status(400).json({ error: 'Group is full' });
  db.qRun('INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)', [uuidv4(), req.params.id, req.userId, 'member']);
  const members = db.q('SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?', [req.params.id, req.userId]);
  const user = db.qOne('SELECT name FROM users WHERE id = ?', [req.userId]);
  members.forEach(m => {
    db.qRun('INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), m.user_id, 'info', 'New member joined', `${user.name} joined ${group.name}`]);
  });
  res.json({ message: 'Joined group successfully' });
});

router.post('/:id/leave', (req, res) => {
  const existing = db.qOne('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!existing) return res.status(400).json({ error: 'Not a member' });
  db.qRun('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ message: 'Left group successfully' });
});

module.exports = router;
