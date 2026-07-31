const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'circuit-forge');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(INQUIRIES_FILE)) fs.writeFileSync(INQUIRIES_FILE, '[]');
if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, '[]');

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

  insertInquiry({ name, email, company, service_type, description }) {
    const inquiries = read(INQUIRIES_FILE);
    const entry = { id: Date.now(), name, email, company: company || null, service_type, description, created_at: new Date().toISOString() };
    inquiries.push(entry);
    write(INQUIRIES_FILE, inquiries);
    return entry;
  },

  getInquiries() {
    return read(INQUIRIES_FILE).reverse();
  },

  inquiryCount() {
    return read(INQUIRIES_FILE).length;
  },
};

module.exports = db;
