import { useState } from 'react';
import './App.css';
import { webAPI } from './api';
import ReaderModal from './components/ReaderModal';
import QuranReader from './components/QuranReader';
import RowaDictionary from './components/RowaDictionary';
import About from './components/About';
import Privacy from './components/Privacy';
import Catalog from './components/Catalog';
function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'catalog' | 'quran' | 'rowa' | 'about' | 'privacy'>('search');

  // Search States
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 50;
  
  // States for Book Modal
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [bookInfo, setBookInfo] = useState<any>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [loadingBook, setLoadingBook] = useState(false);

  // States for Reader Modal
  const [readingConfig, setReadingConfig] = useState<{ bookId: number, pageId?: number, highlightQuery?: string } | null>(null);

  const executeSearch = async (searchQuery: string, page: number) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      // @ts-ignore
      const res = await webAPI.search(searchQuery, page, limit);
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
    <div className="min-h-screen bg-[#f4ebd0] text-[#3e2723] font-serif" dir="rtl">
      <header className="bg-[#5d4037] text-white p-4 md:p-6 shadow-md">
        <div className="flex justify-center items-center gap-3 md:gap-4">
          <img src="/logo.png" alt="Logo Pesantren Assunniyyah" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
          <h1 className="text-2xl md:text-3xl font-bold">المكتبة السنية</h1>
        </div>
        <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4 mt-4 md:mt-6 font-sans">
          <button 
            onClick={() => setActiveTab('search')}
            className={`px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold text-base md:text-lg transition-colors ${activeTab === 'search' ? 'bg-[#f4ebd0] text-[#3e2723]' : 'bg-[#795548] hover:bg-[#6d4c41]'}`}
          >
            📚 البحث (Pencarian)
          </button>
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold text-base md:text-lg transition-colors ${activeTab === 'catalog' ? 'bg-[#f4ebd0] text-[#3e2723]' : 'bg-[#795548] hover:bg-[#6d4c41]'}`}
          >
            🗂️ الفهرس (Katalog)
          </button>
          <button 
            onClick={() => setActiveTab('quran')}
            className={`px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold text-base md:text-lg transition-colors ${activeTab === 'quran' ? 'bg-[#f4ebd0] text-[#3e2723]' : 'bg-[#795548] hover:bg-[#6d4c41]'}`}
          >
            📖 القرآن الكريم (Al-Qur'an)
          </button>
          <button 
            onClick={() => setActiveTab('rowa')}
            className={`px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold text-base md:text-lg transition-colors ${activeTab === 'rowa' ? 'bg-[#f4ebd0] text-[#3e2723]' : 'bg-[#795548] hover:bg-[#6d4c41]'}`}
          >
            👤 تراجم الرواة (Kamus Perawi)
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold text-base md:text-lg transition-colors ${activeTab === 'about' ? 'bg-[#f4ebd0] text-[#3e2723]' : 'bg-[#795548] hover:bg-[#6d4c41]'}`}
          >
            ℹ️ حول (Tentang)
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={`px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold text-base md:text-lg transition-colors ${activeTab === 'privacy' ? 'bg-[#f4ebd0] text-[#3e2723]' : 'bg-[#795548] hover:bg-[#6d4c41]'}`}
          >
            🔒 الخصوصية (Privasi)
          </button>
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-6 max-w-6xl relative">
        {activeTab === 'quran' ? (
          <QuranReader />
        ) : activeTab === 'rowa' ? (
          <RowaDictionary />
        ) : activeTab === 'about' ? (
          <About />
        ) : activeTab === 'privacy' ? (
          <Privacy />
        ) : activeTab === 'catalog' ? (
          <Catalog openBook={openBookInfo} />
        ) : (
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSearch} className="mb-8 flex flex-col md:flex-row gap-2 md:gap-4">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث هنا... (Cari di sini...)" 
                className="flex-1 p-3 md:p-4 rounded-lg border-2 border-[#8d6e63] text-lg md:text-xl focus:outline-none focus:border-[#4e342e] bg-white shadow-inner"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="bg-[#6d4c41] text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold text-lg md:text-xl hover:bg-[#5d4037] transition-colors disabled:opacity-50 shadow-md"
              >
                {loading ? '...' : 'ابحث'}
              </button>
            </form>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm md:text-base">{error}</div>}

            {totalResults > 0 && (
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-lg shadow border border-[#d7ccc8] gap-2">
                <span className="font-bold text-sm md:text-base">Total Hasil: {totalResults.toLocaleString()}</span>
                <span className="text-sm md:text-base">Halaman {currentPage} dari {totalPages}</span>
              </div>
            )}

            <div className="space-y-4 md:space-y-6">
              {results.map((r, i) => (
                <div key={i} className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-[#d7ccc8]">
                  <div className="text-xs md:text-sm text-[#795548] mb-3 font-sans flex flex-col sm:flex-row sm:justify-between border-b pb-2 gap-2">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => openBookInfo(r.book_id)}
                        className="font-bold hover:text-[#3e2723] hover:underline flex items-center gap-1"
                      >
                        ℹ️ Detail Kitab
                      </button>
                      <button 
                        onClick={() => setReadingConfig({ bookId: r.book_id, pageId: r.page_id, highlightQuery: query })}
                        className="font-bold text-green-700 hover:text-green-900 hover:underline flex items-center gap-1"
                      >
                        📖 Baca Kitab
                      </button>
                    </div>
                    <span>Jilid: {r.part} | Halaman: {r.page}</span>
                  </div>
                  <div 
                    className="text-2xl leading-loose"
                    dangerouslySetInnerHTML={{ __html: r.snippet }} 
                  />
                </div>
              ))}
              {!loading && results.length === 0 && query && !error && (
                <p className="text-center text-gray-500">Tidak ada hasil ditemukan.</p>
              )}
            </div>

            {totalResults > 0 && (
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || loading}
                  className="bg-[#8d6e63] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#6d4c41] disabled:opacity-50 transition-colors"
                >
                  السابق (Sebelumnya)
                </button>
                <span className="flex items-center font-bold px-4">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || loading}
                  className="bg-[#8d6e63] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#6d4c41] disabled:opacity-50 transition-colors"
                >
                  التالي (Selanjutnya)
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Book Info Modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center p-4 z-40">
          <div className="bg-[#fffdf7] rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#d7ccc8]">
            <div className="bg-[#6d4c41] text-white p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{bookInfo ? bookInfo.bk : 'Memuat...'}</h2>
              <button onClick={() => setSelectedBook(null)} className="text-white hover:text-red-200 text-2xl px-2">&times;</button>
            </div>
            
            <div className="overflow-y-auto p-6 text-right">
              {loadingBook ? (
                <div className="text-center py-10">Memuat profil kitab...</div>
              ) : bookInfo ? (
                <div className="space-y-6">
                  <div className="flex justify-center mb-6">
                    <button 
                      onClick={() => {
                        setSelectedBook(null);
                        setReadingConfig({ 
                          bookId: selectedBook as number,
                          highlightQuery: activeTab === 'search' ? query : undefined
                        });
                      }}
                      className="bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-xl hover:bg-green-800 transition-colors shadow-md"
                    >
                      📖 Mulai Baca Kitab
                    </button>
                  </div>
                  {/* Metadata Kitab & Penulis */}
                  <div className="bg-[#f5f5f5] p-5 rounded-lg border border-[#e0e0e0]">
                    <h3 className="text-xl font-bold mb-4 text-[#4e342e] border-b pb-2">معلومات الكتاب والمؤلف (Metadata)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
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
          onClose={() => setReadingConfig(null)} 
        />
      )}
    </div>
  );
}

export default App;

