const { Router } = require('express');
const { strict } = require('../middleware/rateLimiter');
const { requireApiKey } = require('../middleware/auth');
const db = require('../services/valowDb');

const router = Router();

const VALID_PRODUCTS = ['T-Shirts', 'Hoodies', 'Sweaters', 'Trackpants'];

// GET /api/valow/votes
router.get('/votes', (req, res) => {
  res.json({ success: true, votes: db.getVotes() });
});

// POST /api/valow/vote
router.post('/vote', strict, (req, res) => {
  const { product } = req.body || {};
  if (!product) return res.status(400).json({ success: false, error: 'Product name required' });
  if (!VALID_PRODUCTS.includes(product)) return res.status(400).json({ success: false, error: 'Invalid product' });

  const votes = db.getVotes();
  votes[product] = (votes[product] || 0) + 1;
  db.saveVotes(votes);

  const history = db.getHistory();
  history.push({ product, timestamp: new Date().toISOString() });
  db.saveHistory(history);

  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  res.json({ success: true, votes, total });
});

// GET /api/valow/admin/stats
// Aggregate vote counts are public info on the storefront; strict-limited rather than key-gated.
router.get('/admin/stats', strict, (req, res) => {
  const votes = db.getVotes();
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const products = Object.entries(votes).map(([name, count]) => ({
    name,
    count,
    percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
  }));
  products.sort((a, b) => b.count - a.count);
  res.json({ success: true, total, products, timestamp: new Date().toISOString() });
});

// GET /api/valow/admin/history
router.get('/admin/history', strict, (req, res) => {
  const history = db.getHistory().slice(-200);
  res.json({ success: true, total_votes: history.length, history });
});

module.exports = router;
