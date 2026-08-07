const { Router } = require('express');
const { strict } = require('../middleware/rateLimiter');
const db = require('../services/storeDb');

const router = Router();

const ADMIN_CODE = process.env.ADMIN_CODE || 'cf-circuit-admin-2026';
const FREE_SHIP_THRESHOLD = 2500;
const FLAT_SHIP = 120;
const VALID_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

function requireAdmin(req, res, next) {
  const code = req.get('X-Admin-Code');
  if (!code || code !== ADMIN_CODE) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// ─── PUBLIC API ───

// GET /api/store/products
router.get('/products', (req, res) => {
  const products = db.getProducts().map(({ stock, ...p }) => p);
  res.json({ success: true, products });
});

// GET /api/store/products/:id
router.get('/products/:id', (req, res) => {
  const product = db.getProducts().find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  const { stock, ...pub } = product;
  res.json({ success: true, product: pub });
});

// POST /api/store/orders
router.post('/orders', strict, (req, res) => {
  const { customer, items } = req.body || {};

  if (!customer || typeof customer !== 'object') {
    return res.status(400).json({ success: false, error: 'Customer details required' });
  }
  const name = String(customer.name || '').trim();
  const email = String(customer.email || '').trim().toLowerCase();
  const phone = String(customer.phone || '').trim();
  const address = String(customer.address || '').trim();

  if (!name || name.length > 100) return res.status(400).json({ success: false, error: 'Valid name required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: 'Valid email required' });
  if (!phone || phone.length > 30) return res.status(400).json({ success: false, error: 'Valid phone required' });
  if (!address || address.length > 300) return res.status(400).json({ success: false, error: 'Valid address required' });

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Cart must not be empty' });
  }
  if (items.length > 50) return res.status(400).json({ success: false, error: 'Too many items' });

  const products = db.getProducts();
  const processed = [];
  let subtotal = 0;

  for (const item of items) {
    const id = String(item.productId || '').trim();
    const qty = Number(item.qty);
    if (!id || !Number.isInteger(qty) || qty < 1 || qty > 10) {
      return res.status(400).json({ success: false, error: 'Invalid cart item' });
    }
    const product = products.find(p => p.id === id);
    if (!product) return res.status(400).json({ success: false, error: `Unknown product: ${id}` });
    if (product.stock < qty) {
      return res.status(409).json({ success: false, error: `Not enough stock for ${product.name}` });
    }
    const lineTotal = Number((product.price * qty).toFixed(2));
    subtotal += lineTotal;
    processed.push({ productId: id, name: product.name, price: product.price, qty, lineTotal });
  }

  const shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : FLAT_SHIP;
  const total = Number((subtotal + shipping).toFixed(2));

  const order = {
    id: db.newOrderId(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    customer: { name, email, phone, address },
    items: processed.map(({ productId, name, price, qty, lineTotal }) => ({ productId, name, price, qty, lineTotal })),
    subtotal: Number(subtotal.toFixed(2)),
    shipping,
    total
  };

  const orders = db.getOrders();
  orders.push(order);
  db.saveOrders(orders);

  db.saveProducts(products.map(p => {
    const sold = processed.find(i => i.productId === p.id);
    return sold ? { ...p, stock: p.stock - sold.qty } : p;
  }));

  res.status(201).json({ success: true, order: { id: order.id, total: order.total, shipping: order.shipping } });
});

// ─── ADMIN API (gated by X-Admin-Code) ───

// GET /api/store/admin/orders
router.get('/admin/orders', requireAdmin, (req, res) => {
  const orders = [...db.getOrders()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, orders });
});

// PATCH /api/store/admin/orders/:id
router.patch('/admin/orders/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }
  const orders = db.getOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
  order.status = status;
  db.saveOrders(orders);
  res.json({ success: true, order });
});

// GET /api/store/admin/stats
router.get('/admin/stats', requireAdmin, (req, res) => {
  const orders = db.getOrders();
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((a, o) => a + o.total, 0);
  const pending = orders.filter(o => o.status === 'pending').length;
  const units = orders.reduce((a, o) => a + o.items.reduce((x, i) => x + i.qty, 0), 0);
  res.json({ success: true, stats: { totalOrders: orders.length, revenue, pending, units } });
});

module.exports = router;
