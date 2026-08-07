// jsonStore — tiny JSON-file-backed collection store
// Used for the Mzansi Connect product APIs (replaces Supabase for local dev).
const fs = require('fs');
const path = require('path');

function createStore(dir, file, seed = []) {
  const p = path.join(dir, file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(seed, null, 2), 'utf-8');
  }
  return {
    file: p,
    all() {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return Array.isArray(data) ? data : [];
      } catch {
        return Array.isArray(seed) ? seed : [];
      }
    },
    save(items) {
      fs.writeFileSync(p, JSON.stringify(items, null, 2), 'utf-8');
    },
    find(fn) {
      return this.all().find(fn);
    },
    where(fn) {
      return this.all().filter(fn);
    },
    insert(item) {
      const items = this.all();
      items.push(item);
      this.save(items);
      return item;
    },
  };
}

module.exports = { createStore };
