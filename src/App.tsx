import { useState } from 'react';
import { Search, FolderSearch, Library, BookOpen, UserCircle, Settings as SettingsIcon, Menu, Info, Shield, ChevronRight, ChevronLeft, BookMarked, Bot, History } from 'lucide-react';
import './App.css';
import { webAPI } from './api';
import ReaderModal from './components/ReaderModal';
import QuranReader from './components/QuranReader';
import RowaDictionary from './components/RowaDictionary';
import About from './components/About';
import Privacy from './components/Privacy';
import Catalog from './components/Catalog';
import AskAI from './components/AskAI';
import Settings, { THEMES } from './components/Settings';
import { useEffect, useRef } from 'react';


function App() {
  const [
                { id: 'text', label: 'Teks', icon: <Search size={16}/> },
                { id: 'title', label: 'Judul Kitab', icon: <BookMarked size={16}/> },
                { id: 'pdf', label: 'PDF', icon: <FolderSearch size={16}/> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSearchMode(tab.id as any);
                    if (query.trim()) executeSearch(query, 1, tab.id as any);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${
                    searchMode === tab.id 
                    ? 'bg-[var(--app-primary)] text-white border-[var(--app-primary)]' 
                    : 'bg-[var(--reader-bg)] text-gray-600 border-black/10 hover:border-[var(--app-primary)]/50 hover:bg-[var(--app-primary)]/5'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>


            <div id="search-results">
              {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl mb-6 shadow-sm">{error}</div>}

            {results.length === 0 && !loading && query.trim() === '' && (
              <div className="mb-8 p-6 bg-[var(--reader-bg)] rounded-2xl border border-black/5 shadow-sm">
                <h3 className="text-gray-500 font-semibold mb-4 flex items-center gap-2"><Search size={18} /> Pencarian Terakhir</h3>
                {recentSearches.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((rs, idx) => (
                      <button 
                        key={idx}
                        onClick={() => { setQuery(rs.query); executeSearch(rs.query, 1); }}
                        className="bg-white border border-gray-200 hover:border-[var(--app-primary)] hover:text-[var(--app-primary)] text-gray-600 px-4 py-2 rounded-full text-sm transition-all shadow-sm"
                        dir="auto"
                      >
                        {rs.query}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Belum ada riwayat pencarian. Riwayat pencarian pengguna akan muncul di sini.</p>
                )}
              </div>
            )}

            {totalResults > 0 && (
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-[var(--reader-bg)] p-4 rounded-xl shadow-sm border border-black/5 gap-2">
                <span className="font-semibold text-sm md:text-base text-[var(--app-text)]">Total Hasil: <span className="font-bold text-[var(--app-primary)]">{totalResults.toLocaleString()}</span></span>
                <span className="text-sm md:text-base text-[var(--app-text)] opacity-80">Halaman {currentPage} dari {totalPages}</span>
              </div>
            )}

            
            <div className="space-y-4 md:space-y-6">
              {searchMode === 'text' && results.map((r, i) => (
                <div key={i} className="bg-[var(--reader-bg)] p-5 md:p-6 rounded-2xl shadow-sm hover:shadow-md border border-black/5 transition-all">
                  <div className="text-xs md:text-sm text-[var(--app-text)] opacity-70 mb-4 font-sans flex flex-col sm:flex-row sm:justify-between border-b border-black/5 pb-3 gap-3">
                    <div className="flex gap-4">
                      <button onClick={() => openBookInfo(r.book_id)} className="font-semibold hover:text-[var(--app-primary)] transition-colors flex items-center gap-1.5">
                        <Info size={16} /> Detail Kitab
                      </button>
                      <button onClick={() => openReader({ bookId: r.book_id, pageId: r.page_id, highlightQuery: query })} className="font-semibold text-[var(--app-primary)] hover:opacity-80 transition-colors flex items-center gap-1.5">
                        <BookOpen size={16} /> Baca Kitab
                      </button>
                    </div>
                    <span className="bg-black/5 px-2 py-1 rounded-md">Jilid: {r.part} | Halaman: {r.page}</span>
                  </div>
                  {r.book_name && (
                    <div className="mb-4">
                      <span className="bg-[var(--app-primary)]/10 text-[var(--app-primary)] px-3 py-1.5 rounded-lg text-sm md:text-base font-semibold inline-flex items-center gap-2">
                        <BookMarked size={16} /> <span dir="auto" style={{ fontFamily: 'var(--arabic-font)' }}>{r.book_name}</span>
                      </span>
                    </div>
                  )}
                  <div 
                      onClick={() => openReader({ bookId: r.book_id, pageId: r.page_id, highlightQuery: query })}
                      className="text-2xl leading-loose cursor-pointer hover:bg-[var(--app-primary)]/5 active:bg-[var(--app-primary)]/10 p-4 rounded-xl border border-transparent hover:border-[var(--app-primary)]/20 transition-all flex flex-col gap-1"
                      title="Klik teks untuk membaca halaman ini"
                      style={{ fontFamily: 'var(--arabic-font)' }}
                    >
                      {(r.snippet || '').split(/\r\n|\n|\r|<br\s*\/?>|<\/br>|\u2028|\u2029/i).map((line: string, idx: number) => (
                        <div key={idx} dir="auto" className="whitespace-pre-wrap text-justify" style={{ wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: line }} />
                      ))}
                    </div>
                </div>
              ))}

              {searchMode === 'title' && results.map((r, i) => (
                <div key={i} className="bg-[var(--reader-bg)] p-5 md:p-6 rounded-2xl shadow-sm hover:shadow-md border border-black/5 transition-all">
                  <div className="flex flex-col gap-3">
                    <h3 dir="auto" style={{ fontFamily: 'var(--arabic-font)' }} className="text-2xl font-bold text-[var(--app-primary)]">{r.bk}</h3>
                    <p className="text-sm text-gray-600">
                      <strong>Penulis:</strong> {r.author_name || 'Tidak diketahui'} <br/>
                      <strong>Kategori:</strong> {r.category_name || '-'}
                    </p>
                    <div className="flex gap-4 mt-2">
                      <button onClick={() => openBookInfo(r.bkid)} className="bg-black/5 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--app-primary)] hover:text-white transition-colors flex items-center gap-2">
                        <Info size={16} /> Detail
                      </button>
                      <button onClick={() => openReader({ bookId: r.bkid })} className="bg-[var(--app-primary)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--app-primary-hover)] transition-colors flex items-center gap-2">
                        <BookOpen size={16} /> Baca Kitab
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {searchMode === 'scholarium' && results.map((r, i) => (
                <div key={i} className="bg-yellow-50 p-5 rounded-2xl shadow-sm hover:shadow-md border border-yellow-200 transition-all">
                  <h3 className="text-lg font-bold text-yellow-900 break-words">{r.name}</h3>
                  <a href={r.link} target="_blank" rel="noopener noreferrer" className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-yellow-700 transition-colors inline-flex items-center gap-2">
                     Buka File / Download
                  </a>
                </div>
              ))}

              {searchMode === 'archive' && results.map((r, i) => (
                <div key={i} className="bg-blue-50 p-5 rounded-2xl shadow-sm hover:shadow-md border border-blue-200 transition-all">
                  <h3 className="text-lg font-bold text-blue-900 break-words">{r.title}</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {r.creator && <span>Oleh: <strong>{Array.isArray(r.creator) ? r.creator.join(', ') : r.creator}</strong><br/></span>}
                    {r.date && <span>Tahun: {r.date}</span>}
                  </p>
                  <a href={`https://archive.org/details/${r.identifier}`} target="_blank" rel="noopener noreferrer" className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
                     Buka di Archive.org
                  </a>
                </div>
              ))}

              {!loading && results.length === 0 && query && !error && (
                <div className="text-center py-12 bg-[var(--reader-bg)] rounded-2xl border border-black/5">
                  <Search className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-[var(--app-text)] opacity-60 text-lg">Tidak ada hasil ditemukan.</p>
                </div>
              )}
            </div>
            </div>

            {totalResults > 0 && (
              <div className="flex justify-center items-center gap-4 mt-8 bg-[var(--reader-bg)] p-2 rounded-2xl shadow-sm border border-black/5 w-fit mx-auto">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || loading}
                  className="bg-[var(--app-primary)] text-white p-3 rounded-xl font-bold hover:bg-[var(--app-primary-hover)] disabled:opacity-50 transition-all"
                  title="Sebelumnya"
                >
                  <ChevronLeft size={24} />
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
                  <ChevronRight size={24} />
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
            &copy; {new Date().getFullYear()} al Maktabah as Sunniyyah.
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
            <a 
              href="https://maktabah.quizb.my.id" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white/70 hover:text-white transition-colors pb-1 flex items-center gap-2 border-b-2 border-transparent hover:border-white"
            >
              <History size={16} /> Web Versi Lama
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div dir="ltr" className="md:hidden fixed bottom-0 left-0 w-full bg-[var(--reader-bg)] border-t border-black/10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 h-[70px] pb-safe flex justify-around items-center transition-colors duration-300">
        <button 
          onClick={() => { setActiveTab('search'); window.scrollTo(0,0); }} 
          className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${activeTab === 'search' ? 'text-[var(--app-primary)] transform -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Search size={24} className="mb-1" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button 
          onClick={() => { setActiveTab('advanced_search'); window.scrollTo(0,0); }} 
          className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${activeTab === 'advanced_search' ? 'text-[var(--app-primary)] transform -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <FolderSearch size={24} className="mb-1" />
          <span className="text-[10px] font-bold">Lanjut</span>
        </button>
        <button 
          onClick={() => { setActiveTab('catalog'); window.scrollTo(0,0); }} 
          className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${activeTab === 'catalog' ? 'text-[var(--app-primary)] transform -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Library size={24} className="mb-1" />
          <span className="text-[10px] font-bold">Katalog</span>
        </button>
        
        <button 
          onClick={() => { setActiveTab('ask'); window.scrollTo(0, 0); }}
          className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${activeTab === 'ask' ? 'text-[var(--app-primary)]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <Bot size={22} className={activeTab === 'ask' ? 'fill-[var(--app-primary)]/20' : ''} />
          <span className="text-[10px] font-medium">Tanya AI</span>
        </button>
        
        <button 
          onClick={() => { setActiveTab('more'); window.scrollTo(0,0); }} 
          className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${activeTab === 'more' ? 'text-[var(--app-primary)] transform -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
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
              <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen size={24} /> <span dir="auto" style={{ fontFamily: 'var(--arabic-font)' }}>{bookInfo ? bookInfo.bk : 'Memuat...'}</span></h2>
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
                        openReader({ bookId: selectedBook as number, highlightQuery: activeTab === 'search' ? query : undefined });
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
                        <span className="font-bold text-[#795548] block mb-2" style={{ fontFamily: 'var(--latin-font)' }}>Penerbit (Betaka):</span>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" dir="auto" style={{ fontFamily: 'var(--arabic-font)', fontSize: 'var(--app-font-size)' }}>{bookInfo.betaka}</p>
                      </div>
                    )}
                    {bookInfo.book_inf && (
                      <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
                        <span className="font-bold text-[#795548] block mb-2" style={{ fontFamily: 'var(--latin-font)' }}>Info Kitab:</span>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" dir="auto" style={{ fontFamily: 'var(--arabic-font)', fontSize: 'var(--app-font-size)' }}>{bookInfo.book_inf}</p>
                      </div>
                    )}
                    {bookInfo.author_inf && (
                      <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
                        <span className="font-bold text-[#795548] block mb-2" style={{ fontFamily: 'var(--latin-font)' }}>Biografi Penulis:</span>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" dir="auto" style={{ fontFamily: 'var(--arabic-font)', fontSize: 'var(--app-font-size)' }}>{bookInfo.author_inf}</p>
                      </div>
                    )}
                  </div>

                  {/* Daftar Isi (TOC) */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-[#4e342e] border-b pb-2 flex justify-between"><span dir="auto" style={{ fontFamily: 'var(--arabic-font)' }}>الفهرس</span> <span>(Daftar Isi)</span></h3>
                    {toc.length > 0 ? (
                      <div className="bg-white border border-[#e0e0e0] rounded-lg p-4 max-h-64 overflow-y-auto">
                        <ul className="space-y-2">
                          {toc.map(item => (
                            <li key={item.id} style={{ paddingRight: `${(item.lvl - 1) * 1.5}rem` }} className="border-b border-gray-100 py-1 last:border-0 hover:bg-gray-50">
                              <button
                                onClick={() => {
                                  setSelectedBook(null);
                                  openReader({ bookId: selectedBook as number, pageId: item.id, highlightQuery: activeTab === 'search' ? query : undefined });
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

        </>
      )}

      {/* Reader Modal */}
      {readingConfig && (
        <ReaderModal 
          bookId={readingConfig.bookId} 
          initialPageId={readingConfig.pageId}
          highlightQuery={readingConfig.highlightQuery}
          settings={settings}
          onClose={() => { window.history.back(); }} 
        />
      )}
    </div>
  );
}

export default App;

