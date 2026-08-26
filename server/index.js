import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let db;
// Gunakan variabel environment DB_PATH, atau fallback ke alamat PC
const dbPath = process.env.DB_PATH || "D:\\database_maktabah_golden\\maktabah.db";

try {
  if (fs.existsSync(dbPath)) {
    db = new Database(dbPath, { fileMustExist: true });
    console.log("Database connected at:", dbPath);
  } else {
    console.log("Database not found at:", dbPath);
  }
} catch (err) {
  console.error("Failed to connect to database:", err);
}

app.get('/api/search', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    let cat_ids = [];
    if (req.query.cat_id) {
      cat_ids = req.query.cat_id.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }
    
    const offset = (page - 1) * limit;

    let total = 0;
    let results = [];

    if (cat_ids.length > 0) {
      const placeholders = cat_ids.map(() => '?').join(',');
      const countStmt = db.prepare(`
        SELECT COUNT(*) as total 
        FROM pages_fts f
        JOIN pages p ON f.rowid = p.rowid
        JOIN books_meta b ON p.book_id = b.bkid
        WHERE pages_fts MATCH ? AND b.cat IN (${placeholders})
      `);
      const totalRow = countStmt.get(query, ...cat_ids);
      total = totalRow ? totalRow.total : 0;

      const stmt = db.prepare(`
        SELECT p.id as page_id, p.book_id, p.part, p.page, b.bk as book_name, snippet(pages_fts, -1, '<b>', '</b>', '...', 15) as snippet 
        FROM pages_fts f
        JOIN pages p ON f.rowid = p.rowid
        JOIN books_meta b ON p.book_id = b.bkid
        WHERE pages_fts MATCH ? AND b.cat IN (${placeholders})
        LIMIT ? OFFSET ?;
      `);
      results = stmt.all(query, ...cat_ids, limit, offset);
    } else {
      const countStmt = db.prepare(`SELECT COUNT(*) as total FROM pages_fts WHERE pages_fts MATCH ?`);
      const totalRow = countStmt.get(query);
      total = totalRow ? totalRow.total : 0;

      const stmt = db.prepare(`
        SELECT p.id as page_id, p.book_id, p.part, p.page, b.bk as book_name, snippet(pages_fts, -1, '<b>', '</b>', '...', 15) as snippet 
        FROM pages_fts f
        JOIN pages p ON f.rowid = p.rowid
        JOIN books_meta b ON p.book_id = b.bkid
        WHERE pages_fts MATCH ? 
        LIMIT ? OFFSET ?;
      `);
      results = stmt.all(query, limit, offset);
    }
    
    res.json({ results, total, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/book/:id', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.id);
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

    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/book/:id/page/:pageId', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.id);
    const pageId = parseInt(req.params.pageId);
    let data;
    
    if (pageId) {
      const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? AND id = ?`);
      data = stmt.get(bookId, pageId);
    } else {
      const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? ORDER BY id ASC LIMIT 1`);
      data = stmt.get(bookId);
    }
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/book/:id/page', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.id);
    const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? ORDER BY id ASC LIMIT 1`);
    const data = stmt.get(bookId);
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/book/:id/next/:currentPageId', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.id);
    const currentPageId = parseInt(req.params.currentPageId);
    const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? AND id > ? ORDER BY id ASC LIMIT 1`);
    const data = stmt.get(bookId, currentPageId);
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/book/:id/prev/:currentPageId', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.id);
    const currentPageId = parseInt(req.params.currentPageId);
    const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? AND id < ? ORDER BY id DESC LIMIT 1`);
    const data = stmt.get(bookId, currentPageId);
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/matn_sharh/:bookId/:pageId', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.bookId);
    const pageId = parseInt(req.params.pageId);
    const asMatn = db.prepare(`
      SELECT sharh as linked_book_id, sharh_id as linked_page_id, 'sharh' as type 
      FROM matn_sharh_pages 
      WHERE matn = ? AND matn_id = ?
    `).all(bookId, pageId);

    const asSharh = db.prepare(`
      SELECT matn as linked_book_id, matn_id as linked_page_id, 'matn' as type 
      FROM matn_sharh_pages 
      WHERE sharh = ? AND sharh_id = ?
    `).all(bookId, pageId);

    const relations = [...asMatn, ...asSharh];
    res.json({ data: relations, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quran/surahs', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const data = db.prepare(`SELECT id, name FROM quran_surah ORDER BY id ASC`).all();
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quran/surah/:id', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const surahId = parseInt(req.params.id);
    const data = db.prepare(`SELECT id, ayah_no, text, page FROM quran_ayah WHERE surah_id = ? ORDER BY ayah_no ASC`).all(surahId);
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rowa/search', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const queryStr = req.query.q;
    if (!queryStr || typeof queryStr !== 'string' || queryStr.trim() === '') {
      return res.status(400).json({ data: [], error: 'Query is empty' });
    }
    const sanitizedQuery = queryStr.replace(/"/g, '""');
    const ftsQuery = `"${sanitizedQuery}"`;

    const data = db.prepare(`
      SELECT 
        r.id, r.Name, r.ROTBA, r.R_ZAHBI, r.birth, r.death
      FROM rowa_fts f
      JOIN rowa r ON f.rowid = r.id
      WHERE rowa_fts MATCH ?
      LIMIT 100
    `).all(ftsQuery);
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rowa/:id', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const rowaId = parseInt(req.params.id);
    const data = db.prepare(`SELECT * FROM rowa WHERE id = ?`).get(rowaId);
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/toc/:bookId', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.bookId);
    const stmt = db.prepare(`
      SELECT id, lvl, sub, tit FROM titles WHERE book_id = ? ORDER BY id ASC
    `);
    const data = stmt.all(bookId);
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/categories', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const data = db.prepare(`SELECT id, name FROM categories ORDER BY catord ASC`).all();
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/category/:id/books', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const catId = parseInt(req.params.id);
    const data = db.prepare(`
      SELECT b.bkid, b.bk, a.auth as author_name
      FROM books_meta b
      LEFT JOIN authors a ON b.authno = a.authid
      WHERE b.cat = ?
      ORDER BY b.bk ASC
    `).all(catId);
    res.json({ data, error: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static frontend files in production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.dev.html'));
  });
}

app.listen(port, () => {
  console.log(`Web Server running at http://localhost:${port}`);
});
