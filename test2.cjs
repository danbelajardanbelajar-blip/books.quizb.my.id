const bsql = require('./node_modules/better-sqlite3');
const db = bsql('D:\\database_maktabah_golden\\maktabah.db');
try {
    const stmt = db.prepare(`
      SELECT p.id as page_id, p.book_id, p.part, p.page, snippet(pages_fts, -1, '<b>', '</b>', '...', 15) as snippet 
      FROM pages_fts f
      JOIN pages p ON f.rowid = p.rowid
      WHERE pages_fts MATCH 'محمد'
      LIMIT 10;
    `);
    console.log(stmt.all());
} catch (e) {
    console.error("Error:", e.message);
}
