const bsql = require('./node_modules/better-sqlite3');
const db = bsql('D:\\database_maktabah_golden\\maktabah.db', { verbose: console.log });
try {
    console.log("Checking database...");
    const row = db.prepare("SELECT * FROM pages_fts WHERE pages_fts MATCH 'محمد' LIMIT 1").get();
    console.log("Result:", row);
} catch (e) {
    console.error("Error Message:", e.message);
    console.error("Error Code:", e.code);
}
