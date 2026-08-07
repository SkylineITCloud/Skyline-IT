const express = require('express');
const { getDb } = require('../services/mzansiCompareDb');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { q, category, sort = 'price_asc', page = 1, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const offset = (page - 1) * limit;
  const searchTerm = `%${q.trim()}%`;
  const params = [searchTerm, searchTerm];

  let query = `
    SELECT DISTINCT p.*,
      (SELECT MIN(price) FROM product_listings WHERE product_id = p.id) as lowest_price,
      (SELECT MAX(price) FROM product_listings WHERE product_id = p.id) as highest_price,
      (SELECT COUNT(*) FROM product_listings WHERE product_id = p.id) as store_count
    FROM products p
    WHERE (p.name LIKE ? OR p.brand LIKE ?)
  `;
  let countQuery = `SELECT COUNT(DISTINCT p.id) as total FROM products p WHERE (p.name LIKE ? OR p.brand LIKE ?)`;
  const countParams = [searchTerm, searchTerm];

  if (category && category !== 'all') {
    query += ' AND p.category = ?';
    countQuery += ' AND p.category = ?';
    params.push(category);
    countParams.push(category);
  }

  switch (sort) {
    case 'price_asc': query += ' ORDER BY lowest_price ASC'; break;
    case 'price_desc': query += ' ORDER BY lowest_price DESC'; break;
    case 'name': query += ' ORDER BY p.name ASC'; break;
    default: query += ' ORDER BY lowest_price ASC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const products = db.prepare(query).all(...params);
  const { total } = db.prepare(countQuery).get(...countParams);

  if (total > 0) {
    db.prepare('INSERT INTO search_history (query) VALUES (?)').run(q.trim());
  }

  res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit), query: q.trim() });
});

router.get('/trending', (req, res) => {
  const db = getDb();
  const trending = db.prepare(`
    SELECT query, COUNT(*) as count
    FROM search_history
    WHERE searched_at > datetime('now', '-7 days')
    GROUP BY query
    ORDER BY count DESC
    LIMIT 10
  `).all();
  res.json({ trending });
});

module.exports = router;
