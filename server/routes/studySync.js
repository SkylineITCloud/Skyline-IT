const { Router } = require('express');
const { auth: authLimiter } = require('../middleware/rateLimiter');

const router = Router();

router.use('/auth', authLimiter, require('./studysync/auth'));
router.use('/users', require('./studysync/users'));
router.use('/groups', require('./studysync/groups'));
router.use('/sessions', require('./studysync/sessions'));
router.use('/tasks', require('./studysync/tasks'));
router.use('/messages', require('./studysync/messages'));
router.use('/pomodoro', require('./studysync/pomodoro'));
router.use('/notifications', require('./studysync/notifications'));
router.use('/admin', require('./studysync/admin'));

module.exports = router;
