const { Router } = require('express');
const { requireApiKey } = require('../middleware/auth');
const { strict, admin } = require('../middleware/rateLimiter');
const { contactRules, subscribeRules, handleValidationErrors } = require('../middleware/validate');
const db = require('../services/mzansiDb');

const router = Router();

router.post('/contact', strict, contactRules, handleValidationErrors, (req, res) => {
  const { name, email, message, company } = req.body;
  const entry = db.insertContact({ name, email, message, company });
  res.status(201).json({ id: entry.id, message: "Message received. We'll be in touch." });
});

router.get('/contact', requireApiKey, (req, res) => {
  res.json(db.getContacts());
});

router.post('/subscribe', strict, subscribeRules, handleValidationErrors, (req, res) => {
  const { email } = req.body;
  const entry = db.subscribe(email);
  if (!entry) {
    return res.status(200).json({ message: 'Already subscribed.' });
  }
  res.status(201).json({ id: entry.id, message: 'Subscribed successfully.' });
});

router.get('/subscribe', requireApiKey, (req, res) => {
  res.json(db.getSubscribers());
});

router.get('/admin/stats', admin, requireApiKey, (req, res) => {
  res.json({ contacts: db.contactCount(), subscribers: db.subscriberCount() });
});

router.get('/admin/contacts', admin, requireApiKey, (req, res) => {
  res.json(db.getContacts());
});

router.get('/admin/subscribers', admin, requireApiKey, (req, res) => {
  res.json(db.getSubscribers());
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

module.exports = router;
