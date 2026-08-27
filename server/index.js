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
  } else {
    console.log("Database not found at:", dbPath);
  }
} catch (err) {
  console.error("Failed to connect to database:", err);
}

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
              const stmtBooks = db.prepare(`SELECT bkid, bk as title, auth as author FROM books_meta WHERE bk LIKE ? OR auth LIKE ? LIMIT 5`);
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
