const Database = require('better-sqlite3');
const db = new Database("D:\\database_maktabah_golden\\maktabah.db");
const bookId = 1;
const pageId = parseInt(""); // NaN
let data;
if (pageId) {
  console.log("if block");
} else {
  console.log("else block");
  const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? ORDER BY id ASC LIMIT 1`);
  data = stmt.get(bookId);
}
console.log(data.id);
