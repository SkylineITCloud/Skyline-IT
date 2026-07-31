const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTACT_LOG = path.join(ROOT, 'data', 'contacts.jsonl');

if (!fs.existsSync(path.dirname(CONTACT_LOG))) {
  fs.mkdirSync(path.dirname(CONTACT_LOG), { recursive: true });
}

const db = {
  insertContact({ name, email, message, company, ip }) {
    const entry = {
      id: uuidv4(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: (company || '').trim(),
      message: message.trim(),
      ip: ip || '',
      timestamp: new Date().toISOString(),
    };
    fs.appendFileSync(CONTACT_LOG, JSON.stringify(entry) + '\n');
    return entry;
  },

  getContacts(limit = 50) {
    if (!fs.existsSync(CONTACT_LOG)) return [];
    const lines = fs.readFileSync(CONTACT_LOG, 'utf-8').trim().split('\n').filter(Boolean);
    const entries = lines.map(l => JSON.parse(l));
    return entries.slice(-limit).reverse();
  },

  contactCount() {
    if (!fs.existsSync(CONTACT_LOG)) return 0;
    const data = fs.readFileSync(CONTACT_LOG, 'utf-8').trim();
    return data ? data.split('\n').length : 0;
  },
};

module.exports = db;
