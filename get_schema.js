import Database from 'better-sqlite3';
const db = new Database("D:\\database_maktabah_golden\\maktabah.db");
console.log(db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('categories', 'books_meta')").all());
