const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'circuit-forge');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, '[]');
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');

function read(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

const db = {
  getProducts() {
    return read(PRODUCTS_FILE, []);
  },

  saveProducts(products) {
    write(PRODUCTS_FILE, products);
  },

  getOrders() {
    return read(ORDERS_FILE, []);
  },

  saveOrders(orders) {
    write(ORDERS_FILE, orders);
  },

  newOrderId() {
    return 'CF-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  },
};

module.exports = db;
