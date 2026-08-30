import React, { useState, useEffect, useCallback } from 'react';
import { webAPI } from '../api';
import { LogIn, Edit2, Trash2, Save, X, Search, ChevronLeft, ChevronRight, LogOut, FolderOpen, BookOpen, FileText, ArrowLeft, Eye, AlertTriangle, MessageSquare, BookPlus, Upload } from 'lucide-react';

// ==================== TYPES ====================
type AdminView = 'categories' | 'books' | 'pages' | 'edit_page' | 'feedback' | 'requests' | 'submissions';
interface Category { id: number; name: string; catord: number; lvl: number; book_count: number; }
interface Book { bkid: number; bk: string; cat: number; cat_name: string; }
interface PageRow { id: number; book_id: number; part: number; page: number; preview: string; }

// ==================== HELPERS ====================
const adminFetch = (_token: string, fn: () => Promise<any>, onLogout: () => void, setErr: (e: string) => void) =>
  fn().catch((err: any) => {
    if (err.message === '401') { onLogout(); } else { setErr(err.message || 'Terjadi kesalahan'); }
    return null;
  });

const Pagination = ({ page, total, limit, onChange, loading }: any) => {
  const totalPages = Math.ceil(total / limit);
  if (total <= limit) return null;
  return (
    <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
      <span className="text-sm text-gray-500">Hal {page} dari {totalPages} ({total} item)</span>
      <div className="flex gap-2">
        <button onClick={() => onChange(page - 1)} disabled={page === 1 || loading} className="p-2 rounded-lg border bg-white shadow-sm hover:bg-gray-50 disabled:opacity-40"><ChevronLeft size={18} /></button>
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages || loading} className="p-2 rounded-lg border bg-white shadow-sm hover:bg-gray-50 disabled:opacity-40"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
};

const ErrorBanner = ({ msg, onClose }: { msg: string, onClose: () => void }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 mb-4">
    <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
    <span className="flex-1 text-sm">{msg}</span>
    <button onClick={onClose}><X size={16} /></button>
  </div>
);

// ==================== LOGIN ====================
const LoginForm = ({ onLogin, onClose }: { onLogin: (t: string) => void, onClose: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await webAPI.adminLogin({ username, password });
      if (res.success) onLogin(res.token);
    } catch { setError('Username atau password salah'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"><X size={20} /></button>
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[var(--app-primary)]/10 text-[var(--app-primary)] rounded-full flex items-center justify-center mx-auto mb-4"><LogIn size={32} /></div>
            <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4 border border-red-100">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--app-primary)]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--app-primary)]" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[var(--app-primary)] text-white font-bold py-3 rounded-xl hover:bg-[var(--app-primary-hover)] disabled:opacity-50 mt-2">
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ==================== CATEGORIES VIEW ====================
const CategoriesView = ({ token, onLogout, onSelectCategory }: { token: string, onLogout: () => void, onSelectCategory: (cat: Category) => void }) => {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch(token, () => webAPI.getAdminCategories(token), onLogout, setError);
    if (res) setCats(res.data);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = cats.filter(c => !query || c.name.includes(query));

  const handleEdit = async (cat: Category) => {
    if (editingId === cat.id) {
      const res = await adminFetch(token, () => webAPI.updateAdminCategory(token, cat.id, { name: editName }), onLogout, setError);
      if (res?.success) { setEditingId(null); load(); }
    } else {
      setEditingId(cat.id);
      setEditName(cat.name);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Hapus kategori "${cat.name}"? (Hanya bisa jika tidak ada kitab)`)) return;
    const res = await adminFetch(token, () => webAPI.deleteAdminCategory(token, cat.id), onLogout, setError);
    if (res?.success) load();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b bg-gray-50/50 flex flex-col md:flex-row gap-3 justify-between items-center">
        <h2 className="font-bold text-gray-800 flex items-center gap-2"><FolderOpen size={20} className="text-[var(--app-primary)]" /> Kategori ({cats.length})</h2>
        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari kategori..." className="pl-9 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:border-[var(--app-primary)] text-sm" />
        </div>
      </div>
      {error && <div className="p-4"><ErrorBanner msg={error} onClose={() => setError('')} /></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
            <tr><th className="px-4 py-3 w-12">ID</th><th className="px-4 py-3">Nama Kategori</th><th className="px-4 py-3 w-20 text-center">Kitab</th><th className="px-4 py-3 w-28 text-center">Aksi</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">Memuat...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">Tidak ada kategori</td></tr>
            ) : filtered.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-400 text-sm">{cat.id}</td>
                <td className="px-4 py-3">
                  {editingId === cat.id ? (
                    <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus dir="rtl"
                      className="border-2 border-[var(--app-primary)] rounded-lg px-3 py-1.5 w-full text-right focus:outline-none text-lg"
                      style={{ fontFamily: 'var(--arabic-font)' }} />
                  ) : (
                    <button onClick={() => onSelectCategory(cat)} className="font-bold text-gray-800 hover:text-[var(--app-primary)] transition-colors text-lg w-full text-right" dir="auto" style={{ fontFamily: 'var(--arabic-font)', textAlign: 'right' }}>
                      {cat.name}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-[var(--app-primary)]/10 text-[var(--app-primary)] text-xs font-bold px-2 py-1 rounded-full">{cat.book_count}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1">
                    {editingId === cat.id ? (
                      <>
                        <button onClick={() => handleEdit(cat)} className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600"><Save size={15} /></button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-700 p-1.5 rounded-lg hover:bg-gray-300"><X size={15} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(cat)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg" title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(cat)} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg" title="Hapus"><Trash2 size={16} /></button>
                        <button onClick={() => onSelectCategory(cat)} className="text-[var(--app-primary)] hover:bg-[var(--app-primary)]/10 p-1.5 rounded-lg" title="Lihat Kitab"><BookOpen size={16} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==================== BOOKS VIEW ====================
const BooksView = ({ token, onLogout, category, onSelectBook }: { token: string, onLogout: () => void, category: Category, onSelectBook: (book: Book) => void }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 30;

  const load = useCallback(async (p = 1, q = query) => {
    setLoading(true);
    const res = await adminFetch(token, () => webAPI.getAdminBooks(token, p, q, category.id), onLogout, setError);
    if (res) { setBooks(res.data); setTotal(res.total); setPage(res.page); }
    setLoading(false);
  }, [token, category.id]);

  useEffect(() => { load(1, ''); }, [category.id]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(1, query); };

  const handleEdit = async (book: Book) => {
    if (editingId === book.bkid) {
      const res = await adminFetch(token, () => webAPI.updateAdminBook(token, book.bkid, { bk: editTitle, cat: book.cat, inf: null }), onLogout, setError);
      if (res?.success) { setEditingId(null); load(page); }
    } else {
      setEditingId(book.bkid);
      setEditTitle(book.bk);
    }
  };

  const handleDelete = async (book: Book) => {
    if (!confirm(`Hapus kitab "${book.bk}"? Semua halaman isinya akan TERHAPUS PERMANEN!`)) return;
    const res = await adminFetch(token, () => webAPI.deleteAdminBook(token, book.bkid), onLogout, setError);
    if (res?.success) load(page);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b bg-gray-50/50 flex flex-col md:flex-row gap-3 justify-between items-center">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <BookOpen size={20} className="text-[var(--app-primary)]" />
          <span dir="auto" style={{ fontFamily: 'var(--arabic-font)' }}>{category.name}</span>
          <span className="text-gray-400 text-sm font-normal">({total} kitab)</span>
        </h2>
        <form onSubmit={handleSearch} className="flex w-full md:w-64">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari judul..." className="border rounded-l-lg px-3 py-2 w-full focus:outline-none focus:border-[var(--app-primary)] text-sm" />
          <button type="submit" className="bg-[var(--app-primary)] text-white px-3 py-2 rounded-r-lg hover:bg-[var(--app-primary-hover)]"><Search size={16} /></button>
        </form>
      </div>
      {error && <div className="p-4"><ErrorBanner msg={error} onClose={() => setError('')} /></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
            <tr><th className="px-4 py-3 w-12">ID</th><th className="px-4 py-3">Judul Kitab</th><th className="px-4 py-3 w-32 text-center">Aksi</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={3} className="p-8 text-center text-gray-400">Memuat...</td></tr>
            ) : books.length === 0 ? (
              <tr><td colSpan={3} className="p-8 text-center text-gray-400">Tidak ada kitab</td></tr>
            ) : books.map(book => (
              <tr key={book.bkid} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-400 text-sm">{book.bkid}</td>
                <td className="px-4 py-3">
                  {editingId === book.bkid ? (
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus dir="rtl"
                      className="border-2 border-[var(--app-primary)] rounded-lg px-3 py-1.5 w-full text-right focus:outline-none text-lg"
                      style={{ fontFamily: 'var(--arabic-font)' }} />
                  ) : (
                    <button onClick={() => onSelectBook(book)} className="font-bold text-gray-800 hover:text-[var(--app-primary)] transition-colors text-base w-full text-right" dir="auto" style={{ fontFamily: 'var(--arabic-font)', textAlign: 'right' }}>
                      {book.bk}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1">
                    {editingId === book.bkid ? (
                      <>
                        <button onClick={() => handleEdit(book)} className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600"><Save size={15} /></button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-700 p-1.5 rounded-lg"><X size={15} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(book)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg" title="Edit Judul"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(book)} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg" title="Hapus Kitab"><Trash2 size={16} /></button>
                        <button onClick={() => onSelectBook(book)} className="text-[var(--app-primary)] hover:bg-[var(--app-primary)]/10 p-1.5 rounded-lg" title="Lihat Isi"><Eye size={16} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} limit={LIMIT} onChange={(p: number) => load(p)} loading={loading} />
    </div>
  );
};

// ==================== PAGES VIEW ====================
const PagesView = ({ token, onLogout, book, onEditPage }: { token: string, onLogout: () => void, book: Book, onEditPage: (p: PageRow) => void }) => {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const res = await adminFetch(token, () => webAPI.getAdminBookPages(token, book.bkid, p), onLogout, setError);
    if (res) { setPages(res.data); setTotal(res.total); setPage(res.page); }
    setLoading(false);
  }, [token, book.bkid]);

  useEffect(() => { load(1); }, [book.bkid]);

  const handleDeletePage = async (pg: PageRow) => {
    if (!confirm(`Hapus halaman Juz ${pg.part} Hal ${pg.page}?`)) return;
    const res = await adminFetch(token, () => webAPI.deleteAdminPage(token, book.bkid, pg.id), onLogout, setError);
    if (res?.success) load(page);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b bg-gray-50/50">
        <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
          <FileText size={18} className="text-[var(--app-primary)]" />
          <span dir="auto" style={{ fontFamily: 'var(--arabic-font)' }} className="text-base">{book.bk}</span>
          <span className="text-gray-400 font-normal">({total} halaman)</span>
        </h2>
      </div>
      {error && <div className="p-4"><ErrorBanner msg={error} onClose={() => setError('')} /></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
            <tr><th className="px-4 py-3 w-16">Juz</th><th className="px-4 py-3 w-16">Hal</th><th className="px-4 py-3">Pratinjau Isi</th><th className="px-4 py-3 w-24 text-center">Aksi</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">Memuat...</td></tr>
            ) : pages.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">Tidak ada halaman</td></tr>
            ) : pages.map(pg => (
              <tr key={pg.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-600 font-semibold text-sm text-center">{pg.part}</td>
                <td className="px-4 py-3 text-gray-600 text-sm text-center">{pg.page}</td>
                <td className="px-4 py-3">
                  <div className="text-gray-600 text-sm truncate max-w-xs" dir="auto" style={{ fontFamily: 'var(--arabic-font)', textAlign: 'right' }}>
                    {pg.preview?.replace(/\n/g, ' ')?.substring(0, 100) || '—'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => onEditPage(pg)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg" title="Edit Isi"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeletePage(pg)} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg" title="Hapus Halaman"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} limit={LIMIT} onChange={(p: number) => load(p)} loading={loading} />
    </div>
  );
};

// ==================== EDIT PAGE VIEW ====================
const EditPageView = ({ token, onLogout, book, pageRow, onSaved }: { token: string, onLogout: () => void, book: Book, pageRow: PageRow, onSaved: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nass, setNass] = useState('');
  const [part, setPart] = useState(pageRow.part);
  const [pageno, setPageno] = useState(pageRow.page);

  useEffect(() => {
    const fetch = async () => {
      const res = await adminFetch(token, () => webAPI.getAdminPage(token, book.bkid, pageRow.id), onLogout, setError);
      if (res) setNass(res.data.nass || '');
      setLoading(false);
    };
    fetch();
  }, [pageRow.id]);

  const handleSave = async () => {
    setSaving(true);
    const res = await adminFetch(token, () => webAPI.updateAdminPage(token, book.bkid, pageRow.id, { nass, part, page: pageno }), onLogout, setError);
    if (res?.success) onSaved();
    setSaving(false);
  };

  if (loading) return <div className="p-16 text-center text-gray-400">Memuat konten halaman...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b bg-gray-50/50 flex flex-col md:flex-row gap-3 justify-between items-center">
        <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
          <Edit2 size={18} className="text-[var(--app-primary)]" />
          Edit Halaman — Juz {pageRow.part}, Hal {pageRow.page}
        </h2>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600">Juz:</label>
            <input type="number" value={part} onChange={e => setPart(+e.target.value)} className="border rounded-lg px-2 py-1 w-16 focus:outline-none focus:border-[var(--app-primary)]" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600">Hal:</label>
            <input type="number" value={pageno} onChange={e => setPageno(+e.target.value)} className="border rounded-lg px-2 py-1 w-16 focus:outline-none focus:border-[var(--app-primary)]" />
          </div>
        </div>
      </div>
      {error && <div className="p-4"><ErrorBanner msg={error} onClose={() => setError('')} /></div>}
      <div className="p-4">
        <div className="text-xs text-gray-500 mb-2 text-right">Isi konten halaman (nass) — {nass.length} karakter</div>
        <textarea
          value={nass}
          onChange={e => setNass(e.target.value)}
          dir="rtl"
          rows={20}
          className="w-full border-2 border-gray-200 rounded-xl p-4 text-right text-lg leading-loose focus:outline-none focus:border-[var(--app-primary)] resize-y"
          style={{ fontFamily: 'var(--arabic-font)', lineHeight: '2.2' }}
          placeholder="Isi konten halaman..."
        />
      </div>
      <div className="p-4 border-t flex justify-end gap-3">
        <button onClick={onSaved} className="px-6 py-2 border rounded-xl text-gray-600 hover:bg-gray-50 font-semibold">Batal</button>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-[var(--app-primary)] text-white rounded-xl font-bold hover:bg-[var(--app-primary-hover)] disabled:opacity-50 flex items-center gap-2">
          {saving ? 'Menyimpan...' : <><Save size={16} /> Simpan Perubahan</>}
        </button>
      </div>
    </div>
  );
};


// ==================== FEEDBACK VIEW ====================
const FeedbackView = ({ token, onLogout }: { token: string, onLogout: () => void }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch(token, () => webAPI.getFeedback(token), onLogout, setError);
    if (res) setData(res.data);
    setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus feedback ini?')) return;
    const res = await adminFetch(token, () => webAPI.deleteFeedback(token, id), onLogout, setError);
    if (res && res.success) load();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50 font-bold flex items-center gap-2"><MessageSquare size={18} className="text-gray-500" /> Feedback Pengguna</div>
      {error && <div className="p-4"><ErrorBanner msg={error} onClose={() => setError('')} /></div>}
      {loading ? <div className="p-8 text-center text-gray-500">Memuat...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left"><tr><th className="p-3">Waktu</th><th className="p-3">Email</th><th className="p-3">Rating</th><th className="p-3">Pesan</th><th className="p-3 text-center">Aksi</th></tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{d.email}</td>
                  <td className="p-3 font-bold text-amber-500">{d.rating}/5</td>
                  <td className="p-3 min-w-[300px]">{d.message}</td>
                  <td className="p-3 text-center"><button onClick={() => handleDelete(d.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus"><Trash2 size={16}/></button></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">Belum ada feedback.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==================== REQUESTS VIEW ====================
const RequestsView = ({ token, onLogout }: { token: string, onLogout: () => void }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch(token, () => webAPI.getBookRequests(token), onLogout, setError);
    if (res) setData(res.data);
    setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus request ini?')) return;
    const res = await adminFetch(token, () => webAPI.deleteBookRequest(token, id), onLogout, setError);
    if (res && res.success) load();
  };
  const handleStatus = async (id: number, status: string) => {
    const res = await adminFetch(token, () => webAPI.updateBookRequestStatus(token, id, status), onLogout, setError);
    if (res && res.success) load();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50 font-bold flex items-center gap-2"><BookPlus size={18} className="text-gray-500" /> Request Kitab</div>
      {error && <div className="p-4"><ErrorBanner msg={error} onClose={() => setError('')} /></div>}
      {loading ? <div className="p-8 text-center text-gray-500">Memuat...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left"><tr><th className="p-3">Waktu</th><th className="p-3">Pengusul</th><th className="p-3">Judul Kitab</th><th className="p-3">Keterangan</th><th className="p-3">Status</th><th className="p-3 text-center">Aksi</th></tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{d.email}<br/><span className="text-gray-400 text-xs">{d.name}</span></td>
                  <td className="p-3 font-semibold">{d.book_title}<br/><span className="text-gray-500 font-normal">{d.book_author}</span></td>
                  <td className="p-3 min-w-[200px]">{d.notes}</td>
                  <td className="p-3">
                    <select value={d.status || 'pending'} onChange={(e) => handleStatus(d.id, e.target.value)} className="border rounded p-1 text-xs">
                      <option value="pending">Pending</option>
                      <option value="approved">Disetujui</option>
                      <option value="rejected">Ditolak</option>
                    </select>
                  </td>
                  <td className="p-3 text-center"><button onClick={() => handleDelete(d.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">Belum ada request.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==================== SUBMISSIONS VIEW ====================
const SubmissionsView = ({ token, onLogout }: { token: string, onLogout: () => void }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch(token, () => webAPI.getBookSubmissions(token), onLogout, setError);
    if (res) setData(res.data);
    setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus kiriman ini?')) return;
    const res = await adminFetch(token, () => webAPI.deleteBookSubmission(token, id), onLogout, setError);
    if (res && res.success) load();
  };
  const handleStatus = async (id: number, status: string) => {
    const res = await adminFetch(token, () => webAPI.updateBookSubmissionStatus(token, id, status), onLogout, setError);
    if (res && res.success) load();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50 font-bold flex items-center gap-2"><Upload size={18} className="text-gray-500" /> Submit Kitab (File)</div>
      {error && <div className="p-4"><ErrorBanner msg={error} onClose={() => setError('')} /></div>}
      {loading ? <div className="p-8 text-center text-gray-500">Memuat...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left"><tr><th className="p-3">Waktu</th><th className="p-3">Pengirim</th><th className="p-3">Judul Kitab</th><th className="p-3">File</th><th className="p-3">Status</th><th className="p-3 text-center">Aksi</th></tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{d.email}<br/><span className="text-gray-400 text-xs">{d.name}</span></td>
                  <td className="p-3 font-semibold">{d.book_title}<br/><span className="text-gray-500 font-normal">{d.book_author}</span></td>
                  <td className="p-3">
                    {d.file_name ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs max-w-[150px] truncate" title={d.file_name}>{d.file_name}</span>
                        <a href={`/uploads/${(d.file_path || '').split(/\\|\//).pop()}`} target="_blank" rel="noreferrer" className="text-[var(--app-primary)] hover:underline flex items-center gap-1 text-xs"><Upload size={12}/> Unduh</a>
                      </div>
                    ) : <span className="text-gray-400 italic">Tanpa File</span>}
                  </td>
                  <td className="p-3">
                    <select value={d.status || 'pending'} onChange={(e) => handleStatus(d.id, e.target.value)} className="border rounded p-1 text-xs">
                      <option value="pending">Pending</option>
                      <option value="approved">Disetujui</option>
                      <option value="rejected">Ditolak</option>
                    </select>
                  </td>
                  <td className="p-3 text-center"><button onClick={() => handleDelete(d.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">Belum ada kiriman file.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==================== DASHBOARD ====================

const AdminDashboard = ({ token, onLogout, onClose }: { token: string, onLogout: () => void, onClose: () => void }) => {
  const [view, setView] = useState<AdminView>('categories');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageRow | null>(null);

  const breadcrumb = [
    { label: view === 'feedback' ? 'Feedback' : view === 'requests' ? 'Request Kitab' : view === 'submissions' ? 'Submit Kitab' : 'Database Kitab', onClick: () => { setView(view === 'feedback' ? 'feedback' : view === 'requests' ? 'requests' : view === 'submissions' ? 'submissions' : 'categories'); setSelectedCategory(null); setSelectedBook(null); setSelectedPage(null); } },
    ...(view !== 'feedback' && view !== 'requests' && view !== 'submissions' && selectedCategory ? [{ label: selectedCategory.name, onClick: () => { setView('books'); setSelectedBook(null); setSelectedPage(null); } }] : []),
    ...(view !== 'feedback' && view !== 'requests' && view !== 'submissions' && selectedBook ? [{ label: selectedBook.bk, onClick: () => { setView('pages'); setSelectedPage(null); } }] : []),
    ...(view !== 'feedback' && view !== 'requests' && view !== 'submissions' && selectedPage ? [{ label: `Juz ${selectedPage.part} Hal ${selectedPage.page}`, onClick: () => {} }] : []),
  ];

  const goBack = () => {
    if (view === 'edit_page') { setView('pages'); setSelectedPage(null); }
    else if (view === 'pages') { setView('books'); setSelectedBook(null); }
    else if (view === 'books') { setView('categories'); setSelectedCategory(null); }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {view !== 'categories' && (
            <button onClick={goBack} className="text-gray-500 hover:text-[var(--app-primary)] p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={14} className="text-gray-400" />}
                <button onClick={b.onClick} className={`font-semibold transition-colors max-w-[200px] truncate ${i === breadcrumb.length - 1 ? 'text-[var(--app-primary)]' : 'text-gray-500 hover:text-gray-800'}`} dir="auto" style={i > 0 ? { fontFamily: 'var(--arabic-font)' } : {}}>
                  {b.label}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onLogout} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Logout"><LogOut size={18} /></button>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors">Tutup</button>
        </div>
      </div>

      
      {/* Sub Navigation */}
      <div className="bg-white border-b px-6 flex gap-4 overflow-x-auto shadow-sm">
        <button onClick={() => { setView('categories'); setSelectedCategory(null); setSelectedBook(null); setSelectedPage(null); }} className={`py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${['categories', 'books', 'pages', 'edit_page'].includes(view) ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Database Kitab</button>
        <button onClick={() => { setView('feedback'); }} className={`py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${view === 'feedback' ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Feedback</button>
        <button onClick={() => { setView('requests'); }} className={`py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${view === 'requests' ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Request Kitab</button>
        <button onClick={() => { setView('submissions'); }} className={`py-3 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors ${view === 'submissions' ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Submit Kitab</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          {view === 'categories' && (
            <CategoriesView token={token} onLogout={onLogout} onSelectCategory={(cat) => { setSelectedCategory(cat); setView('books'); }} />
          )}
          {view === 'books' && selectedCategory && (
            <BooksView token={token} onLogout={onLogout} category={selectedCategory} onSelectBook={(book) => { setSelectedBook(book); setView('pages'); }} />
          )}
          {view === 'pages' && selectedBook && (
            <PagesView token={token} onLogout={onLogout} book={selectedBook} onEditPage={(pg) => { setSelectedPage(pg); setView('edit_page'); }} />
          )}
          {view === 'edit_page' && selectedBook && selectedPage && (
            <EditPageView token={token} onLogout={onLogout} book={selectedBook} pageRow={selectedPage} onSaved={() => { setView('pages'); setSelectedPage(null); }} />
          )}
          {view === 'feedback' && <FeedbackView token={token} onLogout={onLogout} />}
          {view === 'requests' && <RequestsView token={token} onLogout={onLogout} />}
          {view === 'submissions' && <SubmissionsView token={token} onLogout={onLogout} />}
        </div>
      </div>
    </div>
  );
}
;

// ==================== MAIN EXPORT ====================
export const Admin = ({ onClose }: { onClose: () => void }) => {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');

  if (!token) {
    return <LoginForm onLogin={(t) => { setToken(t); localStorage.setItem('adminToken', t); }} onClose={onClose} />;
  }
  return <AdminDashboard token={token} onLogout={() => { setToken(''); localStorage.removeItem('adminToken'); }} onClose={onClose} />;
};
