const express = require('express');
const { getDb } = require('../services/mzansiCompareDb');
const { auth } = require('../middleware/mzansiCompareAuth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { page = 1, limit = 20, category } = req.query;
  const offset = (page - 1) * limit;

  let query = `SELECT p.*, 
    (SELECT MIN(price) FROM product_listings WHERE product_id = p.id) as lowest_price,
    (SELECT MAX(price) FROM product_listings WHERE product_id = p.id) as highest_price,
    (SELECT COUNT(*) FROM product_listings WHERE product_id = p.id) as store_count
    FROM products p`;
  let countQuery = 'SELECT COUNT(*) as total FROM products';
  const params = [];

  if (category && category !== 'all') {
    query += ' WHERE p.category = ?';
    countQuery += ' WHERE category = ?';
    params.push(category);
  }

  query += ' ORDER BY p.name LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const products = db.prepare(query).all(...params);
  const { total } = db.prepare(countQuery).get(...(category && category !== 'all' ? [category] : []));

  res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
});

router.get('/categories', (req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  res.json({ categories: categories.map(c => c.category) });
});

router.get('/saved/list', auth, (req, res) => {
  const db = getDb();
  const saved = db.prepare(`
    SELECT p.*, sp.saved_at,
      (SELECT MIN(price) FROM product_listings WHERE product_id = p.id) as lowest_price,
      (SELECT COUNT(*) FROM product_listings WHERE product_id = p.id) as store_count
    FROM saved_products sp
    JOIN products p ON p.id = sp.product_id
    WHERE sp.user_id = ?
    ORDER BY sp.saved_at DESC
  `).all(req.user.id);
  res.json({ products: saved });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const listings = db.prepare('SELECT * FROM product_listings WHERE product_id = ? ORDER BY price ASC').all(req.params.id);
  product.listings = listings;
  res.json({ product });
});

router.post('/:id/save', auth, (req, res) => {
  const db = getDb();
  try {
    db.prepare('INSERT OR IGNORE INTO saved_products (user_id, product_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    res.json({ message: 'Saved' });
  } catch (e) {
    res.status(400).json({ error: 'Could not save' });
  }
});

router.delete('/:id/save', auth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM saved_products WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.id);
  res.json({ message: 'Removed' });
});

module.exports = router;
