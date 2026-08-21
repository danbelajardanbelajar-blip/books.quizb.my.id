const bsql = require('./node_modules/better-sqlite3');
const db = bsql('D:\\database_maktabah_golden\\maktabah.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables.map(t => t.name));
