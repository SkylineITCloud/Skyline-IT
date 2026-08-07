const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'mzansi');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const dbPath = path.join(DATA_DIR, 'mzansi.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    lowest_price REAL,
    highest_price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS product_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    store_name TEXT NOT NULL,
    store_logo TEXT,
    price REAL NOT NULL,
    price_was REAL,
    url TEXT NOT NULL,
    in_stock INTEGER DEFAULT 1,
    delivery_info TEXT,
    rating REAL,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS saved_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    query TEXT NOT NULL,
    searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const hashed = bcrypt.hashSync('password123', 10);
db.prepare('INSERT OR IGNORE INTO users (name, email, password) VALUES (?, ?, ?)').run('Thandi Mokoena', 'thandi@example.com', hashed);

const products = [
  { name: 'iPhone 15 Pro Max 256GB', brand: 'Apple', category: 'Phones & Tablets', image_url: 'https://via.placeholder.com/400x400/007A4B/FFFFFF?text=iPhone+15+Pro+Max', description: 'Apple iPhone 15 Pro Max with A17 Pro chip, 48MP camera system, and titanium design.' },
  { name: 'Samsung Galaxy S24 Ultra 512GB', brand: 'Samsung', category: 'Phones & Tablets', image_url: 'https://via.placeholder.com/400x400/002395/FFFFFF?text=Galaxy+S24+Ultra', description: 'Samsung Galaxy S24 Ultra with AI-powered features, S Pen, and 200MP camera.' },
  { name: 'Samsung Galaxy Tab S9 FE', brand: 'Samsung', category: 'Phones & Tablets', image_url: 'https://via.placeholder.com/400x400/FFB612/000000?text=Galaxy+Tab+S9+FE', description: 'Samsung Galaxy Tab S9 FE with S Pen included, perfect for students.' },
  { name: 'Nike Air Max 270', brand: 'Nike', category: 'Fashion', image_url: 'https://via.placeholder.com/400x400/DE3831/FFFFFF?text=Air+Max+270', description: 'Nike Air Max 270 with large Air unit for all-day comfort.' },
  { name: 'Adidas Ultraboost Light', brand: 'Adidas', category: 'Fashion', image_url: 'https://via.placeholder.com/400x400/007A4B/FFFFFF?text=Ultraboost+Light', description: 'Adidas Ultraboost Light with light-responsive cushioning.' },
  { name: 'Dell XPS 15 Laptop', brand: 'Dell', category: 'Computers & Laptops', image_url: 'https://via.placeholder.com/400x400/002395/FFFFFF?text=Dell+XPS+15', description: 'Dell XPS 15 with Intel Core i7, 16GB RAM, 512GB SSD, and InfinityEdge display.' },
  { name: 'MacBook Air M3 15-inch', brand: 'Apple', category: 'Computers & Laptops', image_url: 'https://via.placeholder.com/400x400/FFB612/000000?text=MacBook+Air+M3', description: 'Apple MacBook Air with M3 chip, 15-inch Liquid Retina display.' },
  { name: 'Sony WH-1000XM5 Headphones', brand: 'Sony', category: 'Audio', image_url: 'https://via.placeholder.com/400x400/DE3831/FFFFFF?text=WH-1000XM5', description: 'Industry-leading noise cancelling headphones with 30-hour battery life.' },
  { name: 'Apple AirPods Pro 2nd Gen', brand: 'Apple', category: 'Audio', image_url: 'https://via.placeholder.com/400x400/007A4B/FFFFFF?text=AirPods+Pro+2', description: 'Apple AirPods Pro 2nd generation with Adaptive Audio and USB-C.' },
  { name: 'Samsung 65" Neo QLED 4K TV', brand: 'Samsung', category: 'TV & Home Theatre', image_url: 'https://via.placeholder.com/400x400/002395/FFFFFF?text=Neo+QLED+65', description: 'Samsung 65-inch Neo QLED 4K Smart TV with Quantum Matrix Technology.' },
  { name: 'PlayStation 5 Slim', brand: 'Sony', category: 'Gaming', image_url: 'https://via.placeholder.com/400x400/FFB612/000000?text=PS5+Slim', description: 'PlayStation 5 Slim console with 1TB SSD and DualSense controller.' },
  { name: 'Nintendo Switch OLED', brand: 'Nintendo', category: 'Gaming', image_url: 'https://via.placeholder.com/400x400/DE3831/FFFFFF?text=Switch+OLED', description: 'Nintendo Switch OLED model with vivid 7-inch OLED screen.' },
  { name: 'Dyson V15 Detect Vacuum', brand: 'Dyson', category: 'Home & Kitchen', image_url: 'https://via.placeholder.com/400x400/007A4B/FFFFFF?text=Dyson+V15', description: 'Dyson V15 Detect cordless vacuum with laser dust detection.' },
  { name: 'KitchenAid Artisan Stand Mixer', brand: 'KitchenAid', category: 'Home & Kitchen', image_url: 'https://via.placeholder.com/400x400/002395/FFFFFF?text=KitchenAid+Artisan', description: 'KitchenAid Artisan Series 5-Quart Stand Mixer in matte black.' },
  { name: 'Fitbit Charge 6', brand: 'Fitbit', category: 'Wearables', image_url: 'https://via.placeholder.com/400x400/FFB612/000000?text=Fitbit+Charge+6', description: 'Fitbit Charge 6 with built-in GPS, heart rate tracking, and Google integration.' },
  { name: 'Garmin Forerunner 265', brand: 'Garmin', category: 'Wearables', image_url: 'https://via.placeholder.com/400x400/DE3831/FFFFFF?text=Forerunner+265', description: 'Garmin Forerunner 265 with AMOLED display and advanced running features.' },
  { name: 'Apple Watch Series 9', brand: 'Apple', category: 'Wearables', image_url: 'https://via.placeholder.com/400x400/007A4B/FFFFFF?text=Apple+Watch+S9', description: 'Apple Watch Series 9 with S9 chip, double tap gesture, and brighter display.' }
];

const insertProduct = db.prepare(`INSERT OR IGNORE INTO products (name, brand, category, image_url, description) VALUES (?, ?, ?, ?, ?)`);
const insertListing = db.prepare(`INSERT OR IGNORE INTO product_listings (product_id, store_name, store_logo, price, price_was, url, in_stock, delivery_info, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const stores = ['Takealot', 'Makro', 'Game', 'Woolworths', 'Incredible Connection', 'HiFi Corp', 'DionWired', 'Loot', 'Superbalist', 'Zando'];

const priceRanges = [
  { min: 26999, max: 32999 }, { min: 21999, max: 28999 }, { min: 6499, max: 8999 },
  { min: 2499, max: 3299 }, { min: 3499, max: 4299 }, { min: 18999, max: 24999 },
  { min: 19999, max: 25999 }, { min: 4299, max: 5499 }, { min: 3499, max: 4299 },
  { min: 15999, max: 21999 }, { min: 9499, max: 11999 }, { min: 5499, max: 6999 },
  { min: 8999, max: 11999 }, { min: 7499, max: 9999 }, { min: 2999, max: 3999 },
  { min: 4999, max: 6499 }, { min: 7499, max: 9999 }
];

const storeUrls = {
  'Takealot': 'https://www.takealot.com',
  'Makro': 'https://www.makro.co.za',
  'Game': 'https://www.game.co.za',
  'Woolworths': 'https://www.woolworths.co.za',
  'Incredible Connection': 'https://www.incredible.co.za',
  'HiFi Corp': 'https://www.hificorp.co.za',
  'DionWired': 'https://www.dionwired.co.za',
  'Loot': 'https://www.loot.co.za',
  'Superbalist': 'https://www.superbalist.com',
  'Zando': 'https://www.zando.co.za'
};

const deliveryOptions = ['Free delivery', 'R50 delivery fee', 'Free delivery over R500', '2-5 business days', 'Next day delivery', 'Collect in store'];

products.forEach((product, idx) => {
  const res = insertProduct.run(product.name, product.brand, product.category, product.image_url, product.description);
  const productId = res.lastInsertRowid || idx + 1;

  const range = priceRanges[idx];
  const numListings = 2 + Math.floor(Math.random() * 4);

  const usedStores = new Set();
  for (let i = 0; i < numListings && i < stores.length; i++) {
    let storeIdx;
    do { storeIdx = Math.floor(Math.random() * stores.length); } while (usedStores.has(storeIdx));
    usedStores.add(storeIdx);

    const storeName = stores[storeIdx];
    const basePrice = range.min + Math.floor(Math.random() * (range.max - range.min));
    const priceWas = basePrice + Math.floor(Math.random() * 4000) + 500;
    const inStock = Math.random() > 0.15 ? 1 : 0;
    const rating = (3.5 + Math.random() * 1.5).toFixed(1);
    const delivery = deliveryOptions[Math.floor(Math.random() * deliveryOptions.length)];
    const url = `${storeUrls[storeName]}/product-${productId}-${i}`;

    insertListing.run(productId, storeName, '', basePrice, priceWas, url, inStock, delivery, parseFloat(rating));
  }
});

db.exec(`
  UPDATE products SET
    lowest_price = (SELECT MIN(price) FROM product_listings WHERE product_id = products.id),
    highest_price = (SELECT MAX(price) FROM product_listings WHERE product_id = products.id)
`);

console.log('  Database seeded with:');
console.log('     - Demo user (thandi@example.com / password123)');
console.log('     - ' + products.length + ' products');
console.log('     - Multiple store listings per product');
