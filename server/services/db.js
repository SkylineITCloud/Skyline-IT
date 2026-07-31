const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.STUDYSYNC_DB_PATH || path.join(__dirname, '..', '..', 'data', 'studysync.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let _db = null;
let _SQL = null;

async function createDb() {
  if (_db) return _db;

  const initSqlJs = require('sql.js');
  _SQL = await initSqlJs({
    locateFile: file => path.join(path.dirname(require.resolve('sql.js')), '..', 'dist', file)
  });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new _SQL.Database(fileBuffer);
  } else {
    _db = new _SQL.Database();
  }

  _db.run('PRAGMA foreign_keys = ON');

  _db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    name TEXT NOT NULL, course TEXT DEFAULT '', study_method TEXT DEFAULT 'Pomodoro',
    availability TEXT DEFAULT '[]', streak INTEGER DEFAULT 0, total_hours REAL DEFAULT 0,
    weekly_hours REAL DEFAULT 0, dark_mode INTEGER DEFAULT 0, dnd INTEGER DEFAULT 0,
    show_leaderboard INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  _db.run(`CREATE TABLE IF NOT EXISTS groups_ (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, course TEXT NOT NULL,
    study_method TEXT NOT NULL, frequency TEXT DEFAULT 'Weekly',
    max_members INTEGER DEFAULT 4, created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  _db.run(`CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups_(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(group_id, user_id)
  )`);
  _db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups_(id) ON DELETE CASCADE,
    name TEXT NOT NULL, session_date TEXT NOT NULL, session_time TEXT NOT NULL,
    duration INTEGER DEFAULT 60, type TEXT DEFAULT 'focus',
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  _db.run(`CREATE TABLE IF NOT EXISTS session_attendees (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(session_id, user_id)
  )`);
  _db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups_(id) ON DELETE CASCADE,
    title TEXT NOT NULL, assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed INTEGER DEFAULT 0, emoji TEXT DEFAULT '\u2b50',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  _db.run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups_(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL, type TEXT DEFAULT 'text',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  _db.run(`CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL, completed_at TEXT DEFAULT (datetime('now'))
  )`);
  _db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'info', title TEXT NOT NULL, message TEXT DEFAULT '',
    read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.run("CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id)");
  _db.run("CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id)");
  _db.run("CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id)");
  _db.run("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)");

  try {
    _db.run("ALTER TABLE users ADD COLUMN last_seen TEXT DEFAULT NULL");
    _db.run("ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0");
  } catch (_) {}

  saveDb();
  return _db;
}

function saveDb() {
  if (!_db) return;
  const data = _db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function q(sql, params = []) {
  if (!_db) throw new Error('Database not initialized');
  const trimmed = sql.trim().toUpperCase();
  const isQuery = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.startsWith('PRAGMA');

  try {
    if (isQuery) {
      const stmt = _db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } else {
      _db.run(sql, params);
      saveDb();
      return [];
    }
  } catch (err) {
    console.error('SQL Error:', err.message);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw err;
  }
}

function qOne(sql, params = []) {
  const rows = q(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function qRun(sql, params = []) {
  return q(sql, params);
}

module.exports = { createDb, q, qOne, qRun, saveDb, getDb: () => _db };
