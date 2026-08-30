import React, { useState, useEffect } from 'react';
import { webAPI } from '../api';
import { LogIn, Edit, Save, X, Search, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

export const Admin = ({ onClose }: { onClose: () => void }) => {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  
  if (!token) {
    return <LoginForm onLogin={(t) => { setToken(t); localStorage.setItem('adminToken', t); }} onClose={onClose} />;
  }
  return <AdminDashboard token={token} onLogout={() => { setToken(''); localStorage.removeItem('adminToken'); }} onClose={onClose} />;
};

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
      if (res.success) {
        onLogin(res.token);
      }
    } catch (err: any) {
      setError(err.message || 'Login gagal');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors">
          <X size={20} />
        </button>
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[var(--app-primary)]/10 text-[var(--app-primary)] rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
            <p className="text-gray-500 text-sm mt-2">Silakan login untuk mengakses panel admin</p>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--app-primary)] transition-colors" placeholder="Masukkan username..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--app-primary)] transition-colors" placeholder="Masukkan password..." />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[var(--app-primary)] text-white font-bold py-3 rounded-xl hover:bg-[var(--app-primary-hover)] transition-colors disabled:opacity-50 mt-4">
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ token, onLogout, onClose }: { token: string, onLogout: () => void, onClose: () => void }) => {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');

  const loadBooks = async (p = 1) => {
    setLoading(true);
    try {
      const res = await webAPI.getAdminBooks(token, p, query);
      setBooks(res.data);
      setTotal(res.total);
      setPage(res.page);
    } catch (err: any) {
      if (err.message.includes('Unauthorized') || err.message.includes('401')) {
        onLogout();
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBooks(1);
  }, []); // Run once on mount

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBooks(1);
  };

  const handleSave = async () => {
    if (!editingBook || !editTitle.trim()) return;
    try {
      await webAPI.updateAdminBook(token, editingBook.bkid, { bk: editTitle, shortname: editTitle });
      setEditingBook(null);
      loadBooks(page); // reload current page
    } catch (err) {
      alert('Gagal menyimpan perubahan');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-[var(--app-primary)] flex items-center gap-2">
          Admin Panel
        </h1>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="text-gray-500 hover:text-red-500 flex items-center gap-1 text-sm font-semibold transition-colors">
            <LogOut size={16} /> Logout
          </button>
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            Tutup
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800">Manajemen Kitab ({total})</h2>
            <form onSubmit={handleSearch} className="flex w-full md:w-auto">
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari judul kitab..." className="border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:border-[var(--app-primary)] w-full md:w-64" />
              <button type="submit" className="bg-[var(--app-primary)] text-white px-4 py-2 rounded-r-lg hover:bg-[var(--app-primary-hover)] transition-colors">
                <Search size={20} />
              </button>
            </form>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                  <th className="p-4 font-semibold w-16">ID</th>
                  <th className="p-4 font-semibold">Judul Kitab</th>
                  <th className="p-4 font-semibold w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-500">Memuat data...</td>
                  </tr>
                ) : books.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-500">Tidak ada kitab ditemukan</td>
                  </tr>
                ) : (
                  books.map(b => (
                    <tr key={b.bkid} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-500 text-sm">{b.bkid}</td>
                      <td className="p-4">
                        {editingBook?.bkid === b.bkid ? (
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={editTitle} 
                              onChange={e => setEditTitle(e.target.value)} 
                              className="border border-gray-300 rounded-md px-3 py-1.5 w-full focus:outline-none focus:border-[var(--app-primary)] text-right"
                              dir="rtl"
                              style={{ fontFamily: 'var(--arabic-font)' }}
                              autoFocus
                            />
                            <button onClick={handleSave} className="bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-600 flex items-center gap-1 text-sm font-semibold">
                              <Save size={16} />
                            </button>
                            <button onClick={() => setEditingBook(null)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300 flex items-center gap-1 text-sm font-semibold">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="font-bold text-gray-800 text-right text-lg" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>
                            {b.bk}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {editingBook?.bkid !== b.bkid && (
                          <button 
                            onClick={() => { setEditingBook(b); setEditTitle(b.bk); }} 
                            className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors inline-flex"
                            title="Edit Judul"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {total > 0 && (
            <div className="p-4 border-t flex justify-between items-center bg-gray-50/50">
              <span className="text-sm text-gray-500">Hal {page} dari {Math.ceil(total / 20)}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => loadBooks(page - 1)} 
                  disabled={page === 1 || loading}
                  className="p-2 rounded-lg bg-white border shadow-sm hover:bg-gray-50 disabled:opacity-50 text-gray-700"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => loadBooks(page + 1)} 
                  disabled={page * 20 >= total || loading}
                  className="p-2 rounded-lg bg-white border shadow-sm hover:bg-gray-50 disabled:opacity-50 text-gray-700"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
