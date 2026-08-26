import { useState } from 'react';
import { Search, FolderSearch, Library, BookOpen, UserCircle, Settings as SettingsIcon, Menu, Info, Shield, ChevronRight, ChevronLeft, BookMarked } from 'lucide-react';
import './App.css';
import { webAPI } from './api';
import ReaderModal from './components/ReaderModal';
import QuranReader from './components/QuranReader';
import RowaDictionary from './components/RowaDictionary';
import About from './components/About';
import Privacy from './components/Privacy';
import Catalog from './components/Catalog';
import Settings, { THEMES } from './components/Settings';
import { useEffect } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'advanced_search' | 'catalog' | 'quran' | 'rowa' | 'about' | 'privacy' | 'settings' | 'more'>('search');

  // Search States
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 50;
  
  // Advanced Search States
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');

  // States for Book Modal
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [bookInfo, setBookInfo] = useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [loadingBook, setLoadingBook] = useState(false);

  // States for Reader Modal
  const [readingConfig, setReadingConfig] = useState<{ bookId: number, pageId?: number, highlightQuery?: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('maktabah_settings');
    return saved ? JSON.parse(saved) : {
      arabicFont: 'Amiri',
      latinFont: 'Inter',
      theme: 'sepia',
      fontSize: 24
    };
  });

  useEffect(() => {
    localStorage.setItem('maktabah_settings', JSON.stringify(settings));
    const theme = THEMES.find(t => t.id === settings.theme) || THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--app-bg', theme.bg);
    root.style.setProperty('--app-text', theme.text);
    root.style.setProperty('--reader-bg', theme.readerBg);
    root.style.setProperty('--reader-paper', theme.readerPaper);
    // @ts-ignore
    root.style.setProperty('--app-primary', theme.primary || '#0f172a');
    // @ts-ignore
    root.style.setProperty('--app-primary-hover', theme.primaryHover || '#1e293b');
    root.style.setProperty('--arabic-font', `"${settings.arabicFont}", serif`);
    root.style.setProperty('--latin-font', `"${settings.latinFont}", sans-serif`);
  }, [settings]);

  useEffect(() => {
    // @ts-ignore
    webAPI.getCategories().then(res => {
      if (res.data) setCategories(res.data);
    }).catch(console.error);
  }, []);

  const executeSearch = async (searchQuery: string, page: number) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      // @ts-ignore
      const res = await webAPI.search(searchQuery, page, limit, selectedCategory === '' ? undefined : selectedCategory);
      if (res.error) {
        setError(res.error);
      } else {
        setResults(res.results);
        setTotalResults(res.total);
        setCurrentPage(page);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, 1);
  };

  const handleNextPage = () => {
    if (currentPage * limit < totalResults) {
      executeSearch(query, currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      executeSearch(query, currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openBookInfo = async (bookId: number) => {
    setSelectedBook(bookId);
    setLoadingBook(true);
    try {
      // @ts-ignore
      const infoRes = await webAPI.getBookInfo(bookId);
      // @ts-ignore
      const tocRes = await webAPI.getToc(bookId);
      
      setBookInfo(infoRes.data);
      setToc(tocRes.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoadingBook(false);
  };

  const totalPages = Math.ceil(totalResults / limit);

  return (
    <div className="flex flex-col min-h-screen font-sans pb-[70px] md:pb-0 transition-colors duration-300" dir="rtl" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)', fontFamily: 'var(--latin-font)' }}>
      <header className="bg-[var(--app-primary)] text-white shadow-lg relative z-40 sticky top-0 transition-colors duration-300 backdrop-blur-md bg-opacity-95" style={{ fontFamily: 'var(--latin-font)' }}>
        <div className="flex justify-between items-center p-4 md:px-8 md:py-0 max-w-7xl mx-auto md:h-[80px]">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <img src="/logo.png" alt="Logo Pesantren Assunniyyah" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
            <h1 className="text-xl md:text-2xl font-bold" style={{ fontFamily: 'var(--arabic-font)' }}>المكتبة السنية</h1>
          </div>

          {/* Navigation Menu (Hidden on mobile, uses bottom tabs instead) */}
          <nav className="hidden md:flex flex-row gap-4 lg:gap-6 font-sans h-full">
            <button 
              onClick={() => { setActiveTab('search'); }}
              className={`flex items-center gap-2 text-right md:text-center px-4 py-4 md:py-0 transition-all font-semibold text-sm lg:text-base md:h-full border-b-[3px] ${activeTab === 'search' ? 'text-white border-b-white bg-white/10 md:bg-transparent' : 'text-white/70 hover:text-white border-b-transparent hover:bg-white/5 md:hover:bg-transparent'}`}
            >
              <Search size={18} /> Pencarian
            </button>
            <button 
              onClick={() => { setActiveTab('advanced_search'); }}
              className={`flex items-center gap-2 text-right md:text-center px-4 py-4 md:py-0 transition-all font-semibold text-sm lg:text-base md:h-full border-b-[3px] ${activeTab === 'advanced_search' ? 'text-white border-b-white bg-white/10 md:bg-transparent' : 'text-white/70 hover:text-white border-b-transparent hover:bg-white/5 md:hover:bg-transparent'}`}
            >
              <FolderSearch size={18} /> Cari Lanjut
            </button>
            <button 
              onClick={() => { setActiveTab('catalog'); }}
              className={`flex items-center gap-2 text-right md:text-center px-4 py-4 md:py-0 transition-all font-semibold text-sm lg:text-base md:h-full border-b-[3px] ${activeTab === 'catalog' ? 'text-white border-b-white bg-white/10 md:bg-transparent' : 'text-white/70 hover:text-white border-b-transparent hover:bg-white/5 md:hover:bg-transparent'}`}
            >
              <Library size={18} /> Katalog
            </button>
            <button 
              onClick={() => { setActiveTab('quran'); }}
              className={`flex items-center gap-2 text-right md:text-center px-4 py-4 md:py-0 transition-all font-semibold text-sm lg:text-base md:h-full border-b-[3px] ${activeTab === 'quran' ? 'text-white border-b-white bg-white/10 md:bg-transparent' : 'text-white/70 hover:text-white border-b-transparent hover:bg-white/5 md:hover:bg-transparent'}`}
            >
              <BookOpen size={18} /> Al-Qur'an
            </button>
            <button 
              onClick={() => { setActiveTab('rowa'); }}
              className={`flex items-center gap-2 text-right md:text-center px-4 py-4 md:py-0 transition-all font-semibold text-sm lg:text-base md:h-full border-b-[3px] ${activeTab === 'rowa' ? 'text-white border-b-white bg-white/10 md:bg-transparent' : 'text-white/70 hover:text-white border-b-transparent hover:bg-white/5 md:hover:bg-transparent'}`}
            >
              <UserCircle size={18} /> Kamus Perawi
            </button>
            <button 
              onClick={() => { setActiveTab('settings'); }}
              className={`flex items-center gap-2 text-right md:text-center px-4 py-4 md:py-0 transition-all font-semibold text-sm lg:text-base md:h-full border-b-[3px] ${activeTab === 'settings' ? 'text-white border-b-white bg-white/10 md:bg-transparent' : 'text-white/70 hover:text-white border-b-transparent hover:bg-white/5 md:hover:bg-transparent'}`}
            >
              <SettingsIcon size={18} /> Pengaturan
            </button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 w-full mx-auto p-4 md:px-8 md:py-6 max-w-7xl relative">
        {activeTab === 'quran' ? (
          <QuranReader />
        ) : activeTab === 'rowa' ? (
          <RowaDictionary />
        ) : activeTab === 'about' ? (
          <About />
        ) : activeTab === 'privacy' ? (
          <Privacy />
        ) : activeTab === 'settings' ? (
          <Settings settings={settings} setSettings={setSettings} />
        ) : activeTab === 'catalog' ? (
          <Catalog openBook={openBookInfo} readBook={(bookId) => setReadingConfig({ bookId })} />
        ) : activeTab === 'more' ? (
          <div className="w-full bg-[var(--reader-bg)] p-6 rounded-2xl shadow-xl border border-[var(--app-primary)]/10 my-4 transition-all">
            <h2 className="text-2xl font-bold mb-6 text-[var(--app-text)] border-b pb-4 flex items-center gap-3">
              <Menu className="text-[var(--app-primary)]" /> Lainnya
            </h2>
            <div className="flex flex-col gap-4">
              <button onClick={() => setActiveTab('quran')} className="text-right p-4 bg-[var(--reader-paper)] rounded-xl font-bold text-lg border border-black/5 hover:border-[var(--app-primary)]/30 hover:shadow-md transition-all flex justify-between items-center group">
                <span className="flex items-center gap-3"><BookOpen className="text-[var(--app-primary)]" /> Al-Qur'an</span>
                <ChevronLeft className="text-gray-400 group-hover:text-[var(--app-primary)] transition-colors" />
              </button>
              <button onClick={() => setActiveTab('rowa')} className="text-right p-4 bg-[var(--reader-paper)] rounded-xl font-bold text-lg border border-black/5 hover:border-[var(--app-primary)]/30 hover:shadow-md transition-all flex justify-between items-center group">
                <span className="flex items-center gap-3"><UserCircle className="text-[var(--app-primary)]" /> Kamus Perawi</span>
                <ChevronLeft className="text-gray-400 group-hover:text-[var(--app-primary)] transition-colors" />
              </button>
              <button onClick={() => setActiveTab('settings')} className="text-right p-4 bg-[var(--reader-paper)] rounded-xl font-bold text-lg border border-black/5 hover:border-[var(--app-primary)]/30 hover:shadow-md transition-all flex justify-between items-center group">
                <span className="flex items-center gap-3"><SettingsIcon className="text-[var(--app-primary)]" /> Pengaturan</span>
                <ChevronLeft className="text-gray-400 group-hover:text-[var(--app-primary)] transition-colors" />
              </button>
              <button onClick={() => setActiveTab('about')} className="text-right p-4 bg-[var(--reader-paper)] rounded-xl font-bold text-lg border border-black/5 hover:border-[var(--app-primary)]/30 hover:shadow-md transition-all flex justify-between items-center group">
                <span className="flex items-center gap-3"><Info className="text-[var(--app-primary)]" /> Tentang</span>
                <ChevronLeft className="text-gray-400 group-hover:text-[var(--app-primary)] transition-colors" />
              </button>
              <button onClick={() => setActiveTab('privacy')} className="text-right p-4 bg-[var(--reader-paper)] rounded-xl font-bold text-lg border border-black/5 hover:border-[var(--app-primary)]/30 hover:shadow-md transition-all flex justify-between items-center group">
                <span className="flex items-center gap-3"><Shield className="text-[var(--app-primary)]" /> Privasi</span>
                <ChevronLeft className="text-gray-400 group-hover:text-[var(--app-primary)] transition-colors" />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            {activeTab === 'advanced_search' && (
              <div className="mb-6 bg-[var(--reader-bg)] p-5 rounded-2xl border border-[var(--app-primary)]/20 shadow-sm">
                <h3 className="font-bold text-[var(--app-primary)] mb-3 flex items-center gap-2">
                  <FolderSearch size={20}/> Cari Lanjut (Berdasarkan Kategori)
                </h3>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-4 rounded-xl border-2 border-black/10 focus:outline-none focus:border-[var(--app-primary)] bg-[var(--reader-paper)] text-lg transition-all"
                >
                  <option value="">-- Semua Kategori --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <form onSubmit={handleSearch} className="mb-8 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <Search className="text-gray-400" size={20} />
                </div>
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari di sini..." 
                  className="w-full pl-4 pr-12 py-4 rounded-xl border-2 border-black/10 text-lg md:text-xl focus:outline-none focus:border-[var(--app-primary)] bg-[var(--reader-paper)] shadow-inner transition-all"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-[var(--app-primary)] text-white px-8 py-4 rounded-xl font-bold text-lg md:text-xl hover:bg-[var(--app-primary-hover)] transition-all disabled:opacity-50 shadow-md flex justify-center items-center gap-2"
              >
                {loading ? 'Mencari...' : 'Cari'}
              </button>
            </form>

            {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl mb-6 shadow-sm">{error}</div>}

            {totalResults > 0 && (
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-[var(--reader-bg)] p-4 rounded-xl shadow-sm border border-black/5 gap-2">
                <span className="font-semibold text-sm md:text-base text-[var(--app-text)]">Total Hasil: <span className="font-bold text-[var(--app-primary)]">{totalResults.toLocaleString()}</span></span>
                <span className="text-sm md:text-base text-[var(--app-text)] opacity-80">Halaman {currentPage} dari {totalPages}</span>
              </div>
            )}

            <div className="space-y-4 md:space-y-6">
              {results.map((r, i) => (
                <div key={i} className="bg-[var(--reader-bg)] p-5 md:p-6 rounded-2xl shadow-sm hover:shadow-md border border-black/5 transition-all">
                  <div className="text-xs md:text-sm text-[var(--app-text)] opacity-70 mb-4 font-sans flex flex-col sm:flex-row sm:justify-between border-b border-black/5 pb-3 gap-3">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => openBookInfo(r.book_id)}
                        className="font-semibold hover:text-[var(--app-primary)] transition-colors flex items-center gap-1.5"
                      >
                        <Info size={16} /> Detail Kitab
                      </button>
                      <button 
                        onClick={() => setReadingConfig({ bookId: r.book_id, pageId: r.page_id, highlightQuery: query })}
                        className="font-semibold text-[var(--app-primary)] hover:opacity-80 transition-colors flex items-center gap-1.5"
                      >
                        <BookOpen size={16} /> Baca Kitab
                      </button>
                    </div>
                    <span className="bg-black/5 px-2 py-1 rounded-md">Jilid: {r.part} | Halaman: {r.page}</span>
                  </div>
                  {r.book_name && (
                    <div className="mb-4">
                      <span className="bg-[var(--app-primary)]/10 text-[var(--app-primary)] px-3 py-1.5 rounded-lg text-sm md:text-base font-semibold inline-flex items-center gap-2">
                        <BookMarked size={16} /> {r.book_name}
                      </span>
                    </div>
                  )}
                  <div 
                    onClick={() => setReadingConfig({ bookId: r.book_id, pageId: r.page_id, highlightQuery: query })}
                    className="text-2xl leading-loose cursor-pointer hover:bg-[var(--app-primary)]/5 active:bg-[var(--app-primary)]/10 p-4 rounded-xl border border-transparent hover:border-[var(--app-primary)]/20 transition-all text-justify"
                    title="Klik teks untuk membaca halaman ini"
                    dangerouslySetInnerHTML={{ __html: r.snippet }} 
                  />
                </div>
              ))}
              {!loading && results.length === 0 && query && !error && (
                <div className="text-center py-12 bg-[var(--reader-bg)] rounded-2xl border border-black/5">
                  <Search className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-[var(--app-text)] opacity-60 text-lg">Tidak ada hasil ditemukan.</p>
                </div>
              )}
            </div>

            {totalResults > 0 && (
              <div className="flex justify-center items-center gap-4 mt-8 bg-[var(--reader-bg)] p-2 rounded-2xl shadow-sm border border-black/5 w-fit mx-auto">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || loading}
                  className="bg-[var(--app-primary)] text-white p-3 rounded-xl font-bold hover:bg-[var(--app-primary-hover)] disabled:opacity-50 transition-all"
                  title="Sebelumnya"
                >
                  <ChevronRight size={24} />
                </button>
                <span className="flex items-center font-bold px-4 text-[var(--app-text)] min-w-[100px] justify-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || loading}
                  className="bg-[var(--app-primary)] text-white p-3 rounded-xl font-bold hover:bg-[var(--app-primary-hover)] disabled:opacity-50 transition-all"
                  title="Selanjutnya"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer (Hidden on mobile because it's replaced by Lainnya menu) */}
      <footer className="hidden md:block bg-[var(--app-primary)] text-white py-6 md:py-8 mt-auto shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm md:text-base font-medium opacity-90 flex items-center gap-2">
            &copy; {new Date().getFullYear()} Maktabah Syamilah Golden.
          </div>
          <div className="flex gap-6 text-sm md:text-base font-bold">
            <button 
              onClick={() => { setActiveTab('about'); window.scrollTo(0,0); }}
              className={`hover:text-white transition-colors pb-1 flex items-center gap-2 ${activeTab === 'about' ? 'text-white border-b-2 border-white' : 'text-white/70 border-b-2 border-transparent'}`}
            >
              <Info size={16} /> Tentang Kami
            </button>
            <button 
              onClick={() => { setActiveTab('privacy'); window.scrollTo(0,0); }}
              className={`hover:text-white transition-colors pb-1 flex items-center gap-2 ${activeTab === 'privacy' ? 'text-white border-b-2 border-white' : 'text-white/70 border-b-2 border-transparent'}`}
            >
              <Shield size={16} /> Kebijakan Privasi
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div dir="ltr" className="md:hidden fixed bottom-0 left-0 w-full bg-[var(--reader-bg)] border-t border-black/10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 h-[70px] pb-safe flex justify-around items-center transition-colors duration-300">
        <button 
          onClick={() => { setActiveTab('search'); window.scrollTo(0,0); }} 
          className={`flex flex-col items-center justify-center w-1/4 h-full transition-all duration-300 ${activeTab === 'search' ? 'text-[var(--app-primary)] transform -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Search size={24} className="mb-1" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button 
          onClick={() => { setActiveTab('advanced_search'); window.scrollTo(0,0); }} 
          className={`flex flex-col items-center justify-center w-1/4 h-full transition-all duration-300 ${activeTab === 'advanced_search' ? 'text-[var(--app-primary)] transform -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <FolderSearch size={24} className="mb-1" />
          <span className="text-[10px] font-bold">Lanjut</span>
        </button>
        <button 
          onClick={() => { setActiveTab('catalog'); window.scrollTo(0,0); }} 
          className={`flex flex-col items-center justify-center w-1/4 h-full transition-all duration-300 ${activeTab === 'catalog' ? 'text-[var(--app-primary)] transform -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Library size={24} className="mb-1" />
          <span className="text-[10px] font-bold">Katalog</span>
        </button>
        <button 
          onClick={() => { setActiveTab('more'); window.scrollTo(0,0); }} 
          className={`flex flex-col items-center justify-center w-1/4 h-full transition-all duration-300 ${activeTab === 'more' ? 'text-[var(--app-primary)] transform -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Menu size={24} className="mb-1" />
          <span className="text-[10px] font-bold">Lainnya</span>
        </button>
      </div>

      {/* Book Info Modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-40 transition-opacity">
          <div className="bg-[var(--reader-paper)] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[var(--app-primary)]/20 animate-in fade-in zoom-in duration-200">
            <div className="bg-[var(--app-primary)] text-white p-5 flex justify-between items-center shadow-md z-10">
              <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen size={24} /> {bookInfo ? bookInfo.bk : 'Memuat...'}</h2>
              <button onClick={() => setSelectedBook(null)} className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition-all"><ChevronRight size={28} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 text-right scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {loadingBook ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <div className="w-12 h-12 border-4 border-[var(--app-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p>Memuat profil kitab...</p>
                </div>
              ) : bookInfo ? (
                <div className="space-y-6">
                  <div className="flex justify-center mb-8">
                    <button 
                      onClick={() => {
                        setSelectedBook(null);
                        setReadingConfig({ 
                          bookId: selectedBook as number,
                          highlightQuery: activeTab === 'search' ? query : undefined
                        });
                      }}
                      className="bg-[var(--app-primary)] text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-[var(--app-primary-hover)] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-3"
                    >
                      <BookOpen size={24} /> Mulai Baca Kitab
                    </button>
                  </div>
                  {/* Metadata Kitab & Penulis */}
                  <div className="bg-[var(--reader-bg)] p-6 rounded-2xl border border-black/5 shadow-sm">
                    <h3 className="text-xl font-bold mb-5 text-[var(--app-primary)] border-b border-black/5 pb-3 flex items-center justify-end gap-2">
                      معلومات الكتاب والمؤلف (Metadata) <Info size={20} />
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-lg text-[var(--app-text)]">
                      <div><span className="font-bold text-[#795548]">Kategori:</span> {bookInfo.category || '-'}</div>
                      <div>
                        <span className="font-bold text-[#795548]">Penulis:</span> {bookInfo.auth || '-'}
                        {bookInfo.HigriD ? ` (Wafat: ${bookInfo.HigriD} H / ${bookInfo.AD} M)` : ''}
                      </div>
                      <div className="col-span-2 text-blue-800">
                        <span className="font-bold text-[#795548]">Total Halaman:</span> {bookInfo.total_pages} Halaman
                      </div>
                    </div>
                    {bookInfo.betaka && (
                      <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
                        <span className="font-bold text-[#795548] block mb-2">Penerbit (Betaka):</span>
                        <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{bookInfo.betaka}</p>
                      </div>
                    )}
                    {bookInfo.book_inf && (
                      <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
                        <span className="font-bold text-[#795548] block mb-2">Info Kitab:</span>
                        <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{bookInfo.book_inf}</p>
                      </div>
                    )}
                    {bookInfo.author_inf && (
                      <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
                        <span className="font-bold text-[#795548] block mb-2">Biografi Penulis:</span>
                        <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{bookInfo.author_inf}</p>
                      </div>
                    )}
                  </div>

                  {/* Daftar Isi (TOC) */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-[#4e342e] border-b pb-2">فهرس الكتاب (Daftar Isi)</h3>
                    {toc.length > 0 ? (
                      <div className="bg-white border border-[#e0e0e0] rounded-lg p-4 max-h-64 overflow-y-auto">
                        <ul className="space-y-2">
                          {toc.map(item => (
                            <li key={item.id} style={{ paddingRight: `${(item.lvl - 1) * 1.5}rem` }} className="border-b border-gray-100 py-1 last:border-0 hover:bg-gray-50">
                              <button
                                onClick={() => {
                                  setSelectedBook(null);
                                  setReadingConfig({ 
                                    bookId: selectedBook as number, 
                                    pageId: item.id,
                                    highlightQuery: activeTab === 'search' ? query : undefined 
                                  });
                                }}
                                className="text-[#5d4037] hover:text-[#3e2723] hover:underline text-right w-full flex text-lg"
                              >
                                {item.tit}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Daftar isi tidak tersedia untuk kitab ini.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-red-500">Gagal memuat informasi kitab. (Pastikan migrasi telah selesai dan database memiliki ID ini).</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reader Modal */}
      {readingConfig && (
        <ReaderModal 
          bookId={readingConfig.bookId} 
          initialPageId={readingConfig.pageId}
          highlightQuery={readingConfig.highlightQuery}
          settings={settings}
          onClose={() => setReadingConfig(null)} 
        />
      )}
    </div>
  );
}

export default App;

