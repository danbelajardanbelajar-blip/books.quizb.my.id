import Database from 'better-sqlite3';
const db = new Database("D:\\database_maktabah_golden\\maktabah.db");

const bookId = 1;
const stmt = db.prepare(`
  SELECT b.bkid, b.bk, b.inf as book_inf, b.betaka, c.name as category, a.auth, a.inf as author_inf, a.HigriD, a.AD
  FROM books_meta b
  LEFT JOIN categories c ON b.cat = c.id
  LEFT JOIN authors a ON b.authno = a.authid
  WHERE b.bkid = ?
`);
const data = stmt.get(bookId);

if (data) {
  const countStmt = db.prepare(`SELECT COUNT(*) as total_pages FROM pages WHERE book_id = ?`);
  const totalRow = countStmt.get(bookId);
  data.total_pages = totalRow ? totalRow.total_pages : 0;
}
console.log(data);
