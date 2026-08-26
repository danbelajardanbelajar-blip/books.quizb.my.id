const Database = require('better-sqlite3');
const db = new Database("D:\\database_maktabah_golden\\maktabah.db");

const bookId = 1;
const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? ORDER BY id ASC LIMIT 1`);
const data = stmt.get(bookId);
console.log(data);
