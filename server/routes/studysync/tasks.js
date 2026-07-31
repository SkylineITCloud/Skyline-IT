const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { requireJwt } = require('../../middleware/auth');
const db = require('../../services/db');

const router = Router();

router.use(requireJwt);

router.get('/', (req, res) => {
  const { group_id } = req.query;
  let sql = 'SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to';
  const params = [];
  if (group_id) {
    sql += ' WHERE t.group_id = ?';
    params.push(group_id);
  } else {
    sql += ' WHERE t.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)';
    params.push(req.userId);
  }
  sql += ' ORDER BY t.created_at DESC';
  res.json({ tasks: db.q(sql, params) });
});

router.post('/', [
  body('group_id').notEmpty().withMessage('Group ID is required'),
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('assigned_to').optional(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { group_id, title, assigned_to } = req.body;
  const member = db.qOne('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [group_id, req.userId]);
  if (!member) return res.status(403).json({ error: 'Not a member of this group' });
  const id = uuidv4();
  db.qRun('INSERT INTO tasks (id, group_id, title, assigned_to, created_by) VALUES (?, ?, ?, ?, ?)', [id, group_id, title, assigned_to || null, req.userId]);
  if (assigned_to && assigned_to !== req.userId) {
    const user = db.qOne('SELECT name FROM users WHERE id = ?', [req.userId]);
    db.qRun('INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)', [uuidv4(), assigned_to, 'info', 'Task assigned', `${user.name} assigned you: ${title}`]);
  }
  const tasks = db.q('SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = ?', [id]);
  res.status(201).json({ task: tasks[0] || {} });
});

router.put('/:id', (req, res) => {
  const { completed, emoji } = req.body;
  const task = db.qOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (completed !== undefined) db.qRun('UPDATE tasks SET completed = ? WHERE id = ?', [completed ? 1 : 0, req.params.id]);
  if (emoji !== undefined) db.qRun('UPDATE tasks SET emoji = ? WHERE id = ?', [emoji, req.params.id]);
  const tasks = db.q('SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = ?', [req.params.id]);
  res.json({ task: tasks[0] || {} });
});

router.delete('/:id', (req, res) => {
  db.qRun('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
