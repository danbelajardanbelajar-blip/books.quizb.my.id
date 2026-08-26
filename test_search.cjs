const Database = require('better-sqlite3');
const db = new Database("D:\\database_maktabah_golden\\maktabah.db");

const stmt = db.prepare(`
  SELECT 
    p.id as page_id, 
    p.book_id, 
    p.part, 
    p.page, 
    b.bk as book_name,
    snippet(pages_fts, -1, '<b>', '</b>', '...', 15) as snippet 
  FROM pages_fts f
  JOIN pages p ON f.rowid = p.rowid
  LEFT JOIN books_meta b ON p.book_id = b.bkid
  WHERE pages_fts MATCH ? 
  LIMIT 2 OFFSET 0;
`);
console.log(stmt.all('صيام'));
