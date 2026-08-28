import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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
app.use(express.json());

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

app.get('/api/search', (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not loaded' });
  try {
    const rawQuery = req.query.q || '';
    let query = rawQuery;
    
    // Transform query for exact phrase match priority if it has multiple words and no quotes
    if (query && !query.includes('"')) {
      const words = query.trim().split(/\s+/).filter(w => w.length > 0);
      if (words.length > 1) {
        const exactPhrase = '"' + words.join(' ') + '"';
        const andMatch = '(' + words.join(' AND ') + ')';
        query = exactPhrase + ' OR ' + andMatch;
      }
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    // Log pencarian
    if (page === 1 && rawQuery && rawQuery.length >= 3) {
        try {
            db.prepare("INSERT INTO search_logs (query) VALUES (?)").run(rawQuery);
        } catch(e) {}
    }
    
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
        SELECT p.id as page_id, p.book_id, p.part, p.page, b.bk as book_name, snippet(pages_fts, -1, '<b>', '</b>', '...', 15) as snippet, bm25(pages_fts) as rank
        FROM pages_fts f
        JOIN pages p ON f.rowid = p.rowid
        JOIN books_meta b ON p.book_id = b.bkid
        WHERE pages_fts MATCH ? AND b.cat IN (${placeholders})
        ORDER BY rank
        LIMIT ? OFFSET ?;
      `);
      results = stmt.all(query, ...cat_ids, limit, offset);
    } else {
      const countStmt = db.prepare(`SELECT COUNT(*) as total FROM pages_fts WHERE pages_fts MATCH ?`);
      const totalRow = countStmt.get(query);
      total = totalRow ? totalRow.total : 0;

      const stmt = db.prepare(`
        SELECT p.id as page_id, p.book_id, p.part, p.page, b.bk as book_name, snippet(pages_fts, -1, '<b>', '</b>', '...', 15) as snippet, bm25(pages_fts) as rank
        FROM pages_fts f
        JOIN pages p ON f.rowid = p.rowid
        JOIN books_meta b ON p.book_id = b.bkid
        WHERE pages_fts MATCH ? 
        ORDER BY rank
        LIMIT ? OFFSET ?;
      `);
      results = stmt.all(query, limit, offset);
    }
    
    res.json({ results, total, error: null });
  } catch (error) {
    try {
        fs.appendFileSync(logPath, new Date().toISOString() + ' /api/search route error: ' + (error ? error.stack || error : 'null') + '\n');
    } catch(e) {}
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
