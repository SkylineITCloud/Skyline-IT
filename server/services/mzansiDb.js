const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'mzansi');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const SUBS_FILE = path.join(DATA_DIR, 'subscribers.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, '[]');
if (!fs.existsSync(SUBS_FILE)) fs.writeFileSync(SUBS_FILE, '[]');

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const db = {
  insertContact({ name, email, message, company }) {
    const contacts = read(CONTACTS_FILE);
    const entry = { id: Date.now(), name, email, message, company: company || null, created_at: new Date().toISOString() };
    contacts.push(entry);
    write(CONTACTS_FILE, contacts);
    return entry;
  },

  getContacts() {
    return read(CONTACTS_FILE).reverse();
  },

  contactCount() {
    return read(CONTACTS_FILE).length;
  },

  subscribe(email) {
    const subs = read(SUBS_FILE);
    if (subs.find(s => s.email === email)) return null;
    const entry = { id: Date.now(), email, created_at: new Date().toISOString() };
    subs.push(entry);
    write(SUBS_FILE, subs);
    return entry;
  },

  getSubscribers() {
    return read(SUBS_FILE);
  },

  subscriberCount() {
    return read(SUBS_FILE).length;
  },
};

module.exports = db;
