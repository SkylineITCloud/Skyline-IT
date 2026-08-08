const { Router } = require('express');
const { requireApiKey } = require('../middleware/auth');
const { strict, admin } = require('../middleware/rateLimiter');
const { contactRules, inquiryRules, handleValidationErrors } = require('../middleware/validate');
const db = require('../services/circuitForgeDb');

const router = Router();

router.post('/contact', strict, contactRules, handleValidationErrors, (req, res) => {
  const { name, email, message, company } = req.body;
  const entry = db.insertContact({ name, email, message, company });
  res.status(201).json({ id: entry.id, message: "Message received. We'll be in touch." });
});

router.get('/contact', requireApiKey, (req, res) => {
  res.json(db.getContacts());
});

router.post('/inquiry', strict, inquiryRules, handleValidationErrors, (req, res) => {
  const { name, email, company, service_type, description } = req.body;
  const entry = db.insertInquiry({ name, email, company, service_type, description });
  res.status(201).json({ id: entry.id, message: 'Inquiry received. We will review and respond shortly.' });
});

router.get('/inquiry', requireApiKey, (req, res) => {
  res.json(db.getInquiries());
});

router.get('/admin/stats', admin, requireApiKey, (req, res) => {
  res.json({ contacts: db.contactCount(), inquiries: db.inquiryCount() });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

module.exports = router;
