const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const notifs = db.q(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.userId]
  );
  res.json({ notifications: notifs });
});

router.put('/:id/read', (req, res) => {
  db.qRun('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ message: 'Marked as read' });
});

router.put('/read-all', (req, res) => {
  db.qRun('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.userId]);
  res.json({ message: 'All notifications marked as read' });
});

module.exports = router;
