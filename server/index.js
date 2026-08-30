import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('./vendor/docx.cjs');
import 'dotenv/config';

import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.join(__dirname, '..', 'cpanel_error.log');

process.on('uncaughtException', (err) => {
    try { fs.appendFileSync(logPath, new Date().toISOString() + ' uncaughtException: ' + (err.stack || err) + '\n'); } catch(e) {}
});
process.on('unhandledRejection', (reason, promise) => {
    try { fs.appendFileSync(logPath, new Date().toISOString() + ' unhandledRejection: ' + (reason && reason.stack ? reason.stack : reason) + '\n'); } catch(e) {}
});

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

let db;
// Gunakan variabel environment DB_PATH, atau fallback ke alamat PC
const dbPath = process.env.DB_PATH || "D:\\database_maktabah_golden\\maktabah.db";

// Cache untuk query AI
const askCache = new Map();

try {
  if (fs.existsSync(dbPath)) {
    db = new Database(dbPath, { fileMustExist: true });
    console.log("Database connected at:", dbPath);
    
    // Bikin tabel log otomatis
    try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS search_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS ask_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            response TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
    } catch(e) { console.error("Gagal membuat tabel log:", e.message); }
  } else {
    console.log("Database not found at:", dbPath);
  }
} catch (err) {
  console.error("Failed to connect to database:", err);
}

// === LOGGING ENDPOINTS ===
app.get('/api/stats', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not loaded' });
    try {
        const totalBooks = db.prepare("SELECT COUNT(bkid) as count FROM books_meta").get().count;
        const totalCategories = db.prepare("SELECT COUNT(id) as count FROM categories").get().count;
        let totalSearches = 0;
        try {
            totalSearches = db.prepare("SELECT COUNT(id) as count FROM search_logs").get().count;
        } catch(e) { } // Table might not exist
        
        let totalVisits = 105432; // Placeholder if no activity log
        let onlineUsers = Math.floor(Math.random() * 15) + 5;
        
        res.json({
            total_books: totalBooks,
            total_categories: totalCategories,
            total_searches: totalSearches,
            total_visits: totalVisits,
            online_users: onlineUsers
        });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.get('/api/recent-searches', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not loaded' });
    try {
        const limit = parseInt(req.query.limit) || 10;
        const data = db.prepare("SELECT query FROM search_logs WHERE length(trim(query)) >= 3 ORDER BY id DESC LIMIT 200").all();
        const unique = [];
        const result = [];
        for (const row of data) {
            const q = row.query.toLowerCase().trim();
            if (!unique.includes(q)) {
                unique.push(q);
                result.push({ query: row.query });
                if (result.length >= limit) break;
            }
        }
        res.json({ data: result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/recent-questions', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not loaded' });
    try {
        const limit = parseInt(req.query.limit) || 10;
        const data = db.prepare("SELECT question FROM ask_logs WHERE length(trim(question)) >= 5 ORDER BY id DESC LIMIT 200").all();
        const unique = [];
        const result = [];
        for (const row of data) {
            const q = row.question.toLowerCase().trim();
            if (!unique.includes(q)) {
                unique.push(q);
                result.push({ query: row.question });
                if (result.length >= limit) break;
            }
        }
        res.json({ data: result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === DIAGNOSTIC ENDPOINT: tes koneksi Gemini langsung dari Passenger ===
app.get('/api/test-gemini', async (req, res) => {
  const envKeys = process.env.GEMINI_API_KEY || '';
  const apiKeys = envKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  const results = [];
  
  // Test only the FIRST key with multiple models
  const key = apiKeys.find(k => k.startsWith('AQ.'));
  if (!key) return res.json({ error: 'No active AQ key' });
  const keyPreview = key.substring(0, 10) + '...';
  
  const models = ['gemini-1.5-flash8b', 'gemini-1.5-flash', 'gemini-flash-latest'];
  for (const model of models) {
    const startTime = Date.now();
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Jawab singkat: 1+1=' }] }] })
      });
      const elapsed = Date.now() - startTime;
      const data = await response.json();
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'no text';
      results.push({ model, status: response.status, elapsed: elapsed + 'ms', answer: answer.substring(0, 100) });
    } catch (err) {
      const elapsed = Date.now() - startTime;
      results.push({ model, error: err.message, elapsed: elapsed + 'ms' });
    }
  }
  
  res.json({
    nodeVersion: process.version,
    totalKeys: apiKeys.length,
    fetchAvailable: typeof fetch !== 'undefined',
    results
  });
});


const activeTokens = new Set();
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  if (token && activeTokens.has(token)) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '123') {
    const token = crypto.randomBytes(32).toString('hex');
    activeTokens.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// ========= ADMIN: CATEGORIES =========

app.get('/api/admin/categories', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const cats = db.prepare(`
      SELECT c.id, c.name, c.catord, c.lvl, COUNT(b.bkid) as book_count
      FROM categories c
      LEFT JOIN books_meta b ON b.cat = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
    res.json({ data: cats, total: cats.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/category/:id', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const { name } = req.body;
    const id = parseInt(req.params.id);
    const info = db.prepare(`UPDATE categories SET name = ? WHERE id = ?`).run(name, id);
    if (info.changes > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Category not found' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/category/:id', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const id = parseInt(req.params.id);
    const bookCount = db.prepare(`SELECT COUNT(*) as cnt FROM books_meta WHERE cat = ?`).get(id).cnt;
    if (bookCount > 0) {
      return res.status(400).json({ error: `Kategori memiliki ${bookCount} kitab. Pindahkan kitab terlebih dahulu.` });
    }
    const info = db.prepare(`DELETE FROM categories WHERE id = ?`).run(id);
    if (info.changes > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Category not found' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ========= ADMIN: BOOKS =========

app.get('/api/admin/books', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;
    const catId = req.query.cat ? parseInt(req.query.cat) : null;
    const query = req.query.q || '';

    let whereClause = '';
    let params = [];
    if (catId) { whereClause += (whereClause ? ' AND' : ' WHERE') + ' b.cat = ?'; params.push(catId); }
    if (query) { whereClause += (whereClause ? ' AND' : ' WHERE') + ' b.bk LIKE ?'; params.push(`%${query}%`); }

    const data = db.prepare(`SELECT b.bkid, b.bk, b.cat, c.name as cat_name FROM books_meta b LEFT JOIN categories c ON b.cat = c.id ${whereClause} ORDER BY b.bk ASC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) as total FROM books_meta b ${whereClause}`).get(...params).total;
    res.json({ data, total, page, limit });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/book/:id', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const { bk, cat, inf } = req.body;
    const bookId = parseInt(req.params.id);
    const info = db.prepare(`UPDATE books_meta SET bk = ?, cat = ?, inf = ? WHERE bkid = ?`).run(bk, cat || null, inf || null, bookId);
    if (info.changes > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Book not found' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/book/:id', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.id);
    db.prepare(`DELETE FROM pages WHERE book_id = ?`).run(bookId);
    const info = db.prepare(`DELETE FROM books_meta WHERE bkid = ?`).run(bookId);
    if (info.changes > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Book not found' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ========= ADMIN: PAGES (CONTENT) =========

app.get('/api/admin/book/:id/pages', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.id);
    const pageNum = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (pageNum - 1) * limit;
    const data = db.prepare(`SELECT id, book_id, part, page, SUBSTR(nass, 1, 200) as preview FROM pages WHERE book_id = ? ORDER BY part ASC, page ASC LIMIT ? OFFSET ?`).all(bookId, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) as total FROM pages WHERE book_id = ?`).get(bookId).total;
    res.json({ data, total, page: pageNum, limit });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/admin/page/:bookId/:pageId', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.bookId);
    const pageId = parseInt(req.params.pageId);
    const data = db.prepare(`SELECT id, book_id, part, page, nass FROM pages WHERE book_id = ? AND id = ?`).get(bookId, pageId);
    if (data) res.json({ data });
    else res.status(404).json({ error: 'Page not found' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/page/:bookId/:pageId', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.bookId);
    const pageId = parseInt(req.params.pageId);
    const { nass, part, page } = req.body;
    const info = db.prepare(`UPDATE pages SET nass = ?, part = ?, page = ? WHERE book_id = ? AND id = ?`).run(nass, part, page, bookId, pageId);
    if (info.changes > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Page not found' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/page/:bookId/:pageId', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.bookId);
    const pageId = parseInt(req.params.pageId);
    const info = db.prepare(`DELETE FROM pages WHERE book_id = ? AND id = ?`).run(bookId, pageId);
    if (info.changes > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Page not found' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});



// ========= FILE UPLOAD SETUP =========
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ========= BOOK SUBMISSION (BASE64) =========
app.post('/api/book-submit', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const { email, name, book_title, book_author, category_id, notes, file_data, file_name } = req.body;
    if (!email || !book_title) return res.status(400).json({ error: 'Email dan judul kitab wajib diisi' });

    let savedFilePath = null;
    let fileType = null;
    let finalFileName = null;

    if (file_data && file_name) {
       const matches = file_data.match(/^data:(.+);base64,(.+)$/);
       if (matches && matches.length === 3) {
           const ext = path.extname(file_name).toLowerCase();
           if (!['.pdf', '.docx', '.doc'].includes(ext)) {
               return res.status(400).json({ error: 'Hanya file PDF dan DOCX yang diizinkan' });
           }
           fileType = ext;
           finalFileName = file_name;
           const buffer = Buffer.from(matches[2], 'base64');
           const safeFileName = Date.now() + '_' + Math.random().toString(36).slice(2) + ext;
           savedFilePath = path.join(uploadDir, safeFileName);
           fs.writeFileSync(savedFilePath, buffer);
       } else {
           return res.status(400).json({ error: 'Format file tidak valid' });
       }
    }

    db.prepare('INSERT INTO book_submissions (email, name, book_title, book_author, category_id, file_path, file_name, file_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      email, name || null, book_title, book_author || null, category_id || null,
      savedFilePath, finalFileName, fileType, notes || null
    );
    res.json({ success: true, message: 'Kitab berhasil dikirimkan. Terima kasih atas kontribusinya!' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});


// ========= ADMIN: FEEDBACK MANAGEMENT =========
app.get('/api/admin/feedback', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const data = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) as total FROM feedback').get().total;
    res.json({ data, total, page, limit });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/feedback/:id', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    db.prepare('DELETE FROM feedback WHERE id = ?').run(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ========= ADMIN: BOOK REQUESTS =========
app.get('/api/admin/book-requests', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const data = db.prepare('SELECT r.*, c.name as category_name FROM book_requests r LEFT JOIN categories c ON r.category_id = c.id ORDER BY r.created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) as total FROM book_requests').get().total;
    res.json({ data, total, page, limit });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/book-request/:id', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const { status } = req.body;
    db.prepare('UPDATE book_requests SET status = ? WHERE id = ?').run(status, parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/book-request/:id', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    db.prepare('DELETE FROM book_requests WHERE id = ?').run(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ========= ADMIN: BOOK SUBMISSIONS =========
app.get('/api/admin/book-submissions', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const data = db.prepare('SELECT s.*, c.name as category_name FROM book_submissions s LEFT JOIN categories c ON s.category_id = c.id ORDER BY s.created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) as total FROM book_submissions').get().total;
    res.json({ data, total, page, limit });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/admin/book-submission/:id', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const { status } = req.body;
    db.prepare('UPDATE book_submissions SET status = ? WHERE id = ?').run(status, parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/admin/book-submission/:id', requireAdmin, (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const row = db.prepare('SELECT file_path FROM book_submissions WHERE id = ?').get(parseInt(req.params.id));
    if (row?.file_path && fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
    db.prepare('DELETE FROM book_submissions WHERE id = ?').run(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/search', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const rawQuery = req.query.q || '';
    const query = rawQuery.trim();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Log pencarian
    if (page === 1 && query && query.length >= 3) {
        try {
            db.prepare("INSERT INTO search_logs (query) VALUES (?)").run(query);
        } catch(e) {}
    }
    
    let cat_ids = [];
    if (req.query.cat_id) {
      cat_ids = req.query.cat_id.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }
    
    let exactPhrase = '';
    let andMatch = '';
    const words = query.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length > 1 && !query.includes('"')) {
      exactPhrase = '"' + words.join(' ') + '"';
      andMatch = '(' + words.join(' AND ') + ') NOT ' + exactPhrase;
    } else {
      // If single word or already contains quotes
      exactPhrase = query;
      andMatch = '';
    }

    let total = 0;
    let results = [];

    const getQuery = (isCount, isExact) => {
       const selectFields = isCount ? 'COUNT(*) as total' : `p.id as page_id, p.book_id, p.part, p.page, b.bk as book_name, snippet(pages_fts, -1, '<b>', '</b>', '...', 15) as snippet, ${isExact ? 1 : 0} as is_exact`;
       let sql = `
          SELECT ${selectFields}
          FROM pages_fts f
          JOIN pages p ON f.rowid = p.rowid
          JOIN books_meta b ON p.book_id = b.bkid
          WHERE pages_fts MATCH ?
       `;
       if (cat_ids.length > 0) {
          const placeholders = cat_ids.map(() => '?').join(',');
          sql += ` AND b.cat IN (${placeholders})`;
       }
       if (!isCount) {
          sql += ` LIMIT ? OFFSET ?`;
       }
       return sql;
    };

    if (andMatch !== '') {
        // Dual query mode (Exact Phrase priority)
        const countExactStmt = db.prepare(getQuery(true, true));
        const totalExact = cat_ids.length > 0 ? countExactStmt.get(exactPhrase, ...cat_ids).total : countExactStmt.get(exactPhrase).total;
        
        const countAndStmt = db.prepare(getQuery(true, false));
        const totalAnd = cat_ids.length > 0 ? countAndStmt.get(andMatch, ...cat_ids).total : countAndStmt.get(andMatch).total;
        
        total = totalExact + totalAnd;
        
        if (offset < totalExact) {
            // Fetch exact matches
            const fetchExactStmt = db.prepare(getQuery(false, true));
            const params = cat_ids.length > 0 ? [exactPhrase, ...cat_ids, limit, offset] : [exactPhrase, limit, offset];
            results = fetchExactStmt.all(...params);
            
            // If exact matches didn't fill the limit, fetch the rest from AND matches
            if (results.length < limit && totalAnd > 0) {
                const remLimit = limit - results.length;
                const fetchAndStmt = db.prepare(getQuery(false, false));
                const params2 = cat_ids.length > 0 ? [andMatch, ...cat_ids, remLimit, 0] : [andMatch, remLimit, 0];
                const extraResults = fetchAndStmt.all(...params2);
                results = results.concat(extraResults);
            }
        } else {
            // Fetch only AND matches (offset adjusted)
            const andOffset = offset - totalExact;
            const fetchAndStmt = db.prepare(getQuery(false, false));
            const params = cat_ids.length > 0 ? [andMatch, ...cat_ids, limit, andOffset] : [andMatch, limit, andOffset];
            results = fetchAndStmt.all(...params);
        }
    } else {
        // Single query mode
        const countStmt = db.prepare(getQuery(true, true));
        total = cat_ids.length > 0 ? countStmt.get(exactPhrase, ...cat_ids).total : countStmt.get(exactPhrase).total;
        
        const fetchStmt = db.prepare(getQuery(false, true));
        const params = cat_ids.length > 0 ? [exactPhrase, ...cat_ids, limit, offset] : [exactPhrase, limit, offset];
        results = fetchStmt.all(...params);
    }
    
    res.json({ results, total, error: null });
  } catch (error) {
    try {
        const logPath = require('path').join(__dirname, '..', 'cpanel_error.log');
        require('fs').appendFileSync(logPath, new Date().toISOString() + ' /api/search route error: ' + (error ? error.stack || error : 'null') + '\n');
    } catch(e) {}
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/download/:id', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not loaded' });
    try {
        const bookId = parseInt(req.params.id);
        
        const bookStmt = db.prepare(`SELECT b.bkid, b.bk as title, a.auth as author FROM books_meta b LEFT JOIN authors a ON b.authno = a.authid WHERE b.bkid = ?`);
        const book = bookStmt.get(bookId);
        if (!book) return res.status(404).json({ error: 'Book not found' });
        
        const pagesStmt = db.prepare(`SELECT part as juz, page, nass as content FROM pages WHERE book_id = ? ORDER BY id ASC`);
        const pages = pagesStmt.all(bookId);
        
        const docChildren = [];
        
        const isTitleRtl = /[\u0600-\u06FF]/.test(book.title || '');
        docChildren.push(new Paragraph({ 
            children: [new TextRun({ text: book.title || 'Kitab', rightToLeft: isTitleRtl })],
            heading: 'Heading1', 
            alignment: AlignmentType.CENTER,
            bidirectional: isTitleRtl
        }));
        
        if (book.author) {
            const isAuthRtl = /[\u0600-\u06FF]/.test(book.author);
            docChildren.push(new Paragraph({ 
                children: [new TextRun({ text: "Penulis: " + book.author, rightToLeft: isAuthRtl })],
                alignment: AlignmentType.CENTER,
                bidirectional: isAuthRtl
            }));
        }
        
        docChildren.push(new Paragraph({ text: "", spacing: { after: 400 } }));
        
        for (const p of pages) {
            let contentText = p.content || '';
            
            docChildren.push(new Paragraph({
                text: `Juz: ${p.juz || 1} | Halaman: ${p.page || 1}`,
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 100 }
            }));
            
            const lines = contentText.split(/\r\n|\n|\r|<br\s*\/?>|<\/br>|\u2028|\u2029/i);
            for (const rawLine of lines) {
                let line = rawLine.replace(/<[^>]*>?/gm, '');
                line = line.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
                
                if (line.trim()) {
                    const isRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(line);
                    docChildren.push(new Paragraph({
                        children: [new TextRun({ text: line.trim(), rightToLeft: isRtl })],
                        alignment: isRtl ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
                        bidirectional: isRtl
                    }));
                }
            }
            docChildren.push(new Paragraph({ text: "" })); // spacer antar halaman
        }
        
        const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
        const buffer = await Packer.toBuffer(doc);
        
        let filename = (book.title || 'Kitab') + '.docx';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.send(Buffer.from(buffer));
        
    } catch (error) {
        console.error("Error creating docx:", error);
        res.status(500).json({ error: 'Failed to generate Word document: ' + error.message + ' ' + (error.stack || '') });
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


app.get('/api/book/:id/first', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? ORDER BY id ASC LIMIT 1`);
    res.json({ data: stmt.get(parseInt(req.params.id)), error: null });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/book/:id/last', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? ORDER BY id DESC LIMIT 1`);
    res.json({ data: stmt.get(parseInt(req.params.id)), error: null });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/book/:id/next_juz/:currentPageId', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.id);
    const currentPageId = parseInt(req.params.currentPageId);
    const current = db.prepare('SELECT part FROM pages WHERE id = ?').get(currentPageId);
    if (!current) return res.json({ data: null, error: null });
    
    // Get the first page of the next part
    const nextPartRow = db.prepare('SELECT part FROM pages WHERE book_id = ? AND part > ? ORDER BY part ASC LIMIT 1').get(bookId, current.part);
    if (!nextPartRow) return res.json({ data: null, error: null }); // no next juz
    
    const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? AND part = ? ORDER BY id ASC LIMIT 1`);
    res.json({ data: stmt.get(bookId, nextPartRow.part), error: null });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/book/:id/prev_juz/:currentPageId', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const bookId = parseInt(req.params.id);
    const currentPageId = parseInt(req.params.currentPageId);
    const current = db.prepare('SELECT part FROM pages WHERE id = ?').get(currentPageId);
    if (!current) return res.json({ data: null, error: null });
    
    // Get the first page of the previous part
    const prevPartRow = db.prepare('SELECT part FROM pages WHERE book_id = ? AND part < ? ORDER BY part DESC LIMIT 1').get(bookId, current.part);
    if (!prevPartRow) return res.json({ data: null, error: null }); // no prev juz
    
    const stmt = db.prepare(`SELECT id, part, page, nass as text FROM pages WHERE book_id = ? AND part = ? ORDER BY id ASC LIMIT 1`);
    res.json({ data: stmt.get(bookId, prevPartRow.part), error: null });
  } catch (error) { res.status(500).json({ error: error.message }); }
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

// Helper functions for AI Service
const myFetch = async (url, options) => {
    if (typeof fetch !== 'undefined') {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), (options.timeout || 45000));
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            return res;
        } catch (err) {
            clearTimeout(id);
            throw err;
        }
    }
    
    return new Promise((resolve, reject) => {
        const https = require('https');
        try {
            const parsedUrl = new URL(url);
            const reqOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 443,
                path: parsedUrl.pathname + parsedUrl.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                rejectUnauthorized: false,
            };
            
            const body = options.body;
            if (body) {
                reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
            }
            
            const req = https.request(reqOptions, (res) => {
                let responseBody = '';
                res.on('data', chunk => responseBody += chunk);
                res.on('end', () => {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        json: async () => JSON.parse(responseBody),
                        text: async () => responseBody
                    });
                });
            });
            
            req.setTimeout((options.timeout || 45000), () => {
                req.destroy(new Error('Request Timeout'));
            });
            
            req.on('error', reject);
            if (body) req.write(body);
            req.end();
        } catch(parseErr) {
            reject(parseErr);
        }
    });
};

async function translateToSearchKeywords(question, apiKeys) {
    if (!apiKeys || apiKeys.length === 0) return null;
    
    const prompt = "Terjemahkan pertanyaan berikut ke dalam bahasa Arab jika pertanyaan dalam bahasa Indonesia, atau ke bahasa Indonesia jika pertanyaan dalam bahasa Arab. Hasilkan HANYA kata kunci pencariannya saja (tanpa tanda baca, tanpa kata hubung), pisahkan dengan spasi, tanpa penjelasan apapun, tanpa tanda kutip. Jika tidak bisa diterjemahkan, kembalikan teks kosong.\n\n"
            + "Pertanyaan: " + question;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150, thinkingConfig: { thinkingBudget: 0 } }
    };

    let keysToTry = [...apiKeys];
    for (let i = keysToTry.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keysToTry[i], keysToTry[j]] = [keysToTry[j], keysToTry[i]];
    }

    for (const key of keysToTry) {
        try {
            const response = await myFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash8b:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                timeout: 15000 // Sama seperti PHP: timeout 15s untuk terjemahan
            });

            if (response.ok) {
                const data = await response.json();
                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
                    let text = data.candidates[0].content.parts[0].text.trim();
                    text = text.replace(/```.*?```/s, '');
                    text = text.replace(/[\n\r"'`]/g, ' ');
                    return text.trim();
                }
            }
        } catch (err) {
            continue;
        }
    }
    return null;
}

app.post('/api/ask', express.json(), async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  const question = req.body.q;
  if (!question || question.length < 5) {
    return res.json({ status: 'error', message: 'Pertanyaan terlalu pendek.' });
  }

  // [KEEPALIVE TRICK] Mencegah Passenger Timeout (cPanel)
  res.writeHead(200, { 'Content-Type': 'application/json' });
  const keepAliveInterval = setInterval(() => { res.write(' '); }, 10000); // Kirim spasi tiap 10 detik agar koneksi tidak dianggap idle
  const respondJSON = (obj) => {
      clearInterval(keepAliveInterval);
      res.write(JSON.stringify(obj));
      res.end();
  };

  try {
      const envKeys = process.env.GEMINI_API_KEY || '';
      let apiKeys = envKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
      
      if (apiKeys.length === 0) {
         return respondJSON({ status: 'error', message: 'API Key Gemini belum diatur di server (.env).' });
      }

      // [CACHING] Cek history jika pertanyaan sudah pernah ditanyakan
      if (askCache.has(question)) {
          const cachedData = askCache.get(question);
          return respondJSON({
              status: 'success',
              answer: cachedData.answer,
              references: cachedData.references
          });
      }

      // 1. CEK KATALOG KITAB SEPERTI PHP!
      let catalogText = '';
      let matchedBkids = [];
      try {
          const qCleanCat = question.replace(/[^a-zA-Z0-9\s]/g, ' ');
          const qWordsCat = qCleanCat.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
          if (qWordsCat.length > 0) {
              const likeQuery = '%' + qWordsCat.join('%') + '%';
              const stmtBooks = db.prepare(`SELECT b.bkid, b.bk as title, a.auth as author FROM books_meta b LEFT JOIN authors a ON b.authno = a.authid WHERE b.bk LIKE ? OR a.auth LIKE ? LIMIT 5`);
              const matchedBooks = stmtBooks.all(likeQuery, likeQuery);
              if (matchedBooks.length > 0) {
                  catalogText = "INFORMASI KATALOG PERPUSTAKAAN (DAFTAR KITAB YANG TERSEDIA):\n";
                  for (const mb of matchedBooks) {
                      matchedBkids.push(mb.bkid);
                      catalogText += `- Judul: ${mb.title} ` + (mb.author ? `(Karya: ${mb.author})` : '') + "\n";
                  }
                  catalogText += "CATATAN UNTUK AI: Jika pengguna bertanya apakah kitab/buku tersebut ada di perpustakaan, jawablah ADA berdasarkan daftar di atas.\n\n";
              }
          }
      } catch (err) {
          console.error("Error catalog search", err);
      }
      
      const stmtFts = db.prepare(`
        SELECT p.book_id as bkid, p.page as match_page, p.part as match_juz, p.nass as snippet, b.bk as title
        FROM pages_fts f
        JOIN pages p ON f.rowid = p.rowid
        JOIN books_meta b ON p.book_id = b.bkid
        WHERE pages_fts MATCH ?
        LIMIT 5
      `);

      // Fungsi bantu pencarian FTS
      const performFtsSearch = (queryStr) => {
          let qClean = queryStr.replace(/[^\p{L}\p{N}\s]/gu, ' ');
          const stopWords = ['siapa', 'apa', 'kapan', 'dimana', 'bagaimana', 'kenapa', 'mengapa', 'apakah', 'berapa'];
          let words = qClean.split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w.toLowerCase()));
          words.sort((a, b) => b.length - a.length);
          let results = [];
          
          if (words.length > 0) {
              let ftsQuery = words.slice(0, 5).map(w => `"${w}"`).join(' AND ');
              try { results = stmtFts.all(ftsQuery); } catch(e){}
              
              if (results.length === 0 && words.length > 1) {
                  ftsQuery = words.slice(0, 5).map(w => `"${w}"`).join(' OR ');
                  try { results = stmtFts.all(ftsQuery); } catch(e){}
              }
          } else {
              try { results = stmtFts.all(`"${queryStr}"`); } catch(e){}
          }
          return results;
      };

      // 2. Pencarian FTS Awal (Bahasa Indonesia / Arab sesuai input)
      let contextData = performFtsSearch(question);

      // 3. JIKA KOSONG, baru terjemahkan ke Arab dan cari lagi! (Sama persis seperti PHP)
      if (contextData.length === 0) {
          const translatedKeywords = await translateToSearchKeywords(question, apiKeys);
          if (translatedKeywords && translatedKeywords.toLowerCase() !== question.toLowerCase()) {
              contextData = performFtsSearch(translatedKeywords);
          }
      }

      let contextText = catalogText;
      let references = [];
      if (contextData.length === 0 && !catalogText) {
        contextText = "Tidak ada teks referensi yang ditemukan.";
      } else {
        contextText += contextData.map((r, i) => {
          references.push({
              bkid: r.bkid,
              title: r.title,
              juz: r.match_juz,
              page: r.match_page
          });
          return `[Referensi ${i+1}: ${r.title} (Juz ${r.match_juz}, Hlm ${r.match_page})]\n${r.snippet.replace(/<[^>]+>/g, '').substring(0, 500)}\n`;
        }).join('\n');
      }

    const prompt = "Anda adalah asisten virtual (AI) Islami bernama 'Maktabah Bot' yang ramah dan berilmu. Tugas Anda adalah menjawab pertanyaan pengguna HANYA berdasarkan referensi konteks teks dari kitab/buku yang diberikan di bawah ini. Jika jawaban tidak terdapat di dalam konteks, katakan bahwa Anda tidak menemukan informasinya di database perpustakaan ini.\n\n"
      + "ATURAN BAHASA: Anda wajib mendeteksi bahasa yang digunakan pengguna pada pertanyaan. Jika pengguna bertanya dalam bahasa Arab, maka Anda HARUS menjawab dalam bahasa Arab (meskipun instruksi ini dalam bahasa Indonesia). Jika pengguna bertanya dalam bahasa Indonesia, jawab dalam bahasa Indonesia.\n\n"
      + "--- KONTEKS KITAB ---\n"
      + contextText
      + "\n---------------------\n\n"
      + "Pertanyaan Pengguna: " + question;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } }
    };



      // Shuffle apiKeys to distribute load
      for (let i = apiKeys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [apiKeys[i], apiKeys[j]] = [apiKeys[j], apiKeys[i]];
      }

      let aiResponse = null;
      let lastError = "Gagal menghubungi server AI.";
      const modelsToTry = ['gemini-1.5-flash8b', 'gemini-1.5-flash', 'gemini-flash-latest'];

      for (const key of apiKeys) {
        let keySuccess = false;
        
        for (const model of modelsToTry) {
            try {
              const response = await myFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
              });

              if (response.status === 429 || response.status >= 500) {
                  lastError = `Server AI sibuk (Code: ${response.status}).`;
                  break; // Move to next KEY
              }

              if (!response.ok) {
                  const errData = await response.json().catch(() => ({}));
                  if (response.status === 403) {
                     lastError = `API Key ditolak (Code: 403).`;
                     break; // Move to next KEY
                  }
                  if (response.status === 404) {
                     continue; // Try next MODEL
                  }
                  lastError = `Gagal API (Code: ${response.status})`;
                  break; // Move to next KEY
              }

              const data = await response.json();
              if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
                  aiResponse = data.candidates[0].content.parts.map(p => p.text).join('');
                  keySuccess = true;
                  break; // SUCCESS! Break out of model loop
              } else {
                  lastError = "Response tidak memiliki teks.";
                  break; // Move to next KEY
              }
            } catch (err) {
              lastError = `Koneksi error: ${err.message}`;
              break; // Network/Timeout error -> Move to next KEY
            }
        }
        
        if (keySuccess) {
            break; // SUCCESS! Break out of API key loop
        }
      }
      if (!aiResponse) {
          return respondJSON({ status: 'error', message: lastError + " Semua API key telah dicoba." });
      }

      // Simpan ke cache
      askCache.set(question, {
          answer: aiResponse,
          references
      });
      
      // Simpan ke db
      try {
          db.prepare("INSERT INTO ask_logs (question, response) VALUES (?, ?)").run(question, aiResponse);
      } catch(e) {}

      // Jika cache terlalu besar, hapus entry pertama (FIFO)
      if (askCache.size > 100) {
          const firstKey = askCache.keys().next().value;
          askCache.delete(firstKey);
      }

      respondJSON({
          status: 'success',
          answer: aiResponse,
          references
      });

  } catch (error) {
    try {
        fs.appendFileSync(logPath, new Date().toISOString() + ' /api/ask route error: ' + (error ? error.stack || error : 'null') + '\n');
    } catch(e) {}
    respondJSON({ status: 'error', message: 'Terjadi kesalahan sistem: ' + (error ? error.message : 'Unknown') });
  }
});


app.get('/api/categories', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const data = db.prepare(`SELECT id, name FROM categories ORDER BY name ASC`).all();
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


// --- NEW SEARCH ENDPOINTS ---

app.get('/api/search_titles', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let cat_ids = [];
    if (req.query.cat_id) {
      cat_ids = req.query.cat_id.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    if (!query) {
       return res.json({ data: [], total: 0, page, limit });
    }

    let whereClause = "WHERE b.bk LIKE ?";
    let params = [`%${query}%`];

    if (cat_ids.length > 0) {
      const placeholders = cat_ids.map(() => '?').join(',');
      whereClause += ` AND b.cat IN (${placeholders})`;
      params.push(...cat_ids);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM books_meta b ${whereClause}`);
    const total = countStmt.get(...params).total;

    const stmt = db.prepare(`
      SELECT b.bkid, b.bk, b.inf, a.auth as author_name, c.name as category_name
      FROM books_meta b
      LEFT JOIN authors a ON b.authno = a.authid
      LEFT JOIN categories c ON b.cat = c.id
      ${whereClause}
      ORDER BY b.bk ASC
      LIMIT ? OFFSET ?
    `);
    
    params.push(limit, offset);
    const data = stmt.all(...params);

    res.json({ data, total, page, limit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search_scholarium', async (req, res) => {
  try {
    const q = req.query.q || '';
    const page = req.query.page || 1;
    const url = `https://maktabah.quizb.my.id/api.php?action=search_scholarium_pdfs&q=${encodeURIComponent(q)}&page=${page}`;
    
    // We use dynamic import for node-fetch or native fetch in node 18+
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search_archive', async (req, res) => {
  try {
    const q = req.query.q || '';
    const page = req.query.page || 1;
    const archiveQ = q.split(/\s+/).filter(Boolean).join(' AND ');
    const url = `https://archive.org/advancedsearch.php?q=title:(${encodeURIComponent(archiveQ)})+AND+mediatype:(texts)&fl[]=identifier,title,creator,date&rows=10&page=${page}&output=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- END NEW SEARCH ENDPOINTS ---

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
