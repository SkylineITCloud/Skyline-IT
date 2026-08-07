const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'valow');
const VOTES_FILE = path.join(DATA_DIR, 'votes.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(VOTES_FILE)) fs.writeFileSync(VOTES_FILE, '{}');
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, '[]');

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
  getVotes() {
    return read(VOTES_FILE, {});
  },

  saveVotes(votes) {
    write(VOTES_FILE, votes);
  },

  getHistory() {
    return read(HISTORY_FILE, []);
  },

  saveHistory(history) {
    write(HISTORY_FILE, history);
  },
};

module.exports = db;
