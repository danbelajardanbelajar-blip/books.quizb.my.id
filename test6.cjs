const Database = require('better-sqlite3');
const db = new Database("D:\\database_maktabah_golden\\maktabah.db");
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='matn_sharh_pages'").get());
