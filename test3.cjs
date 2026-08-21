const bsql = require('./node_modules/better-sqlite3');
const db = bsql('D:\\database_maktabah_golden\\maktabah.db');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name='pages'").get());
