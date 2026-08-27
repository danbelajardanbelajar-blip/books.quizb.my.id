import React, { useState, useEffect } from 'react';
import { webAPI } from '../api';
import { ChevronLeft, ChevronRight, X, BookOpen } from 'lucide-react';

export interface ReaderModalProps {
  bookId: number;
  initialPageId?: number;
  highlightQuery?: string;
  settings?: any;
  onClose: () => void;
}

const buildArabicRegex = (word: string) => {
  const harakat = '[\\u064B-\\u065F\\u0670\\u0654\\u0655]*';
  let regexStr = '';
  const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (let i = 0; i < safeWord.length; i++) {
    let char = safeWord[i];
    if (/[أإآا]/.test(char)) char = '[أإآا]';
    else if (/[ةه]/.test(char)) char = '[ةه]';
    else if (/[يى]/.test(char)) char = '[يى]';
    else if (char === 'ؤ') char = '[ؤو]';
    else if (char === 'ئ') char = '[ئي]';
    regexStr += char + harakat;
  }
  return regexStr;
};

const highlightText = (text: string, query?: string) => {
  if (!query || !text) return text;
  
  // Clean query from its own diacritics
  const cleanQuery = query.replace(/[\u064B-\u065F\u0670\u0654\u0655]/g, '').trim();
  if (!cleanQuery) return text;

  const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
  
  let highlighted = text;
  words.forEach(word => {
    const regexStr = buildArabicRegex(word);
    try {
      // Use word boundaries/lookarounds if needed, but for simple Arabic search, global match is fine.
      const regex = new RegExp(`(${regexStr})`, 'g');
      highlighted = highlighted.replace(regex, '<mark class="bg-yellow-300 text-black px-1 rounded">$1</mark>');
    } catch (e) {
      // Ignore invalid regex
    }
  });
  
  return highlighted;
};


const ReaderModal: React.FC<ReaderModalProps> = ({ bookId, initialPageId, highlightQuery, settings, onClose }) => {
  const [bookInfo, setBookInfo] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<any>(null);
  const [currentPageId, setCurrentPageId] = useState<number | undefined>(initialPageId);
  const [loading, setLoading] = useState(true);
  
  // Customization states
  const [fontSize, setFontSize] = useState(settings?.fontSize || 32);

  // Split screen states
  const [relatedPage, setRelatedPage] = useState<any>(null);
  const [relatedBookInfo, setRelatedBookInfo] = useState<any>(null);
  const [showSplit, setShowSplit] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    loadBookAndPage();
  }, [bookId, currentPageId]);

  const loadBookAndPage = async () => {
    setLoading(true);
    try {
      if (!bookInfo) {
        // @ts-ignore
        const info = await webAPI.getBookInfo(bookId);
        if (info.data) setBookInfo(info.data);
      }

      // @ts-ignore
      const page = await webAPI.getPage(bookId, currentPageId);
      if (page.data) {
        setCurrentPage(page.data);
        if (currentPageId === undefined || currentPageId !== page.data.id) {
          setCurrentPageId(page.data.id);
        }
        checkRelations(page.data.id);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const checkRelations = async (pageId: number) => {
    setLoadingRelated(true);
    try {
      // @ts-ignore
      const rels = await webAPI.getMatnSharh(bookId, pageId);
      if (rels.data && rels.data.length > 0) {
        const relation = rels.data[0];
        
        // @ts-ignore
        const rPage = await webAPI.getPage(relation.linked_book_id, relation.linked_page_id);
        // @ts-ignore
        const rBook = await webAPI.getBookInfo(relation.linked_book_id);
        
        if (rPage.data) setRelatedPage(rPage.data);
        if (rBook.data) setRelatedBookInfo(rBook.data);
        setShowSplit(true);
      } else {
        setShowSplit(false);
        setRelatedPage(null);
        setRelatedBookInfo(null);
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingRelated(false);
  };

  const nextPage = async () => {
    if (currentPageId === undefined) return;
    setLoading(true);
    try {
      // @ts-ignore
      const res = await webAPI.getNextPage(bookId, currentPageId);
      if (res.data) {
        setCurrentPageId(res.data.id);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const prevPage = async () => {
    if (currentPageId === undefined) return;
    setLoading(true);
    try {
      // @ts-ignore
      const res = await webAPI.getPrevPage(bookId, currentPageId);
      if (res.data) {
        setCurrentPageId(res.data.id);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (!bookInfo || !currentPage) {
    return (
      <div className="fixed inset-0 bg-[#fbf8f1] flex justify-center items-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#8d6e63] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-[#5d4037] text-2xl font-bold animate-pulse">Memuat Kitab...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col z-50 shadow-2xl" dir="auto" style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--app-text)', fontFamily: 'var(--latin-font)' }}>
      
      {/* Sleek Header */}
      <div className="bg-white/80 backdrop-blur-md text-[#3e2723] h-auto min-h-16 flex justify-between items-center px-2 md:px-6 py-2 shadow-sm border-b border-[#d7ccc8] z-20">
        <div className="flex items-center gap-2 md:gap-4 w-auto md:w-1/3">
          <button 
            onClick={onClose} 
            className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full hover:bg-gray-200 transition-colors text-xl md:text-2xl text-gray-600"
            title="Tutup (Kembali)"
          >
            <X size={24} />
          </button>
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button 
              onClick={() => setFontSize((f: number) => Math.min(f + 4, 64))}
              className="px-2 md:px-3 py-1 hover:bg-white rounded shadow-sm text-base md:text-lg font-bold"
              title="Perbesar Huruf"
            >
              A+
            </button>
            <button 
              onClick={() => setFontSize((f: number) => Math.max(f - 4, 16))}
              className="px-2 md:px-3 py-1 hover:bg-white rounded shadow-sm text-base md:text-lg font-bold"
              title="Perkecil Huruf"
            >
              A-
            </button>
          </div>
        </div>
        
        <h2 className="text-lg md:text-2xl font-bold flex-1 text-center truncate px-2" dir="auto" style={{ fontFamily: 'var(--arabic-font)' }}>{bookInfo.bk}</h2>
        
        <div className="hidden md:flex w-1/3 justify-end text-sm font-sans text-gray-500 font-medium truncate">
          {bookInfo.author_inf ? bookInfo.auth : 'al Maktabah As Sunniyyah'}
        </div>
      </div>

      {/* Content Area - Like physical pages on a desk */}
      <div className={`flex-1 flex ${showSplit ? 'flex-col lg:flex-row' : 'flex-col'} overflow-hidden relative`}>
        
        {/* Main Book Page */}
        <div className="flex-1 p-0 md:p-4 lg:p-8 overflow-y-auto custom-scrollbar pb-24 md:pb-8">
          <div className="w-full max-w-4xl mx-auto md:rounded-sm shadow-[0_0_25px_rgba(0,0,0,0.05)] border-0 md:border border-gray-200 flex flex-col min-h-full" style={{ backgroundColor: 'var(--reader-paper)' }}>
            <div className="px-4 md:px-8 py-3 md:py-4 border-b border-gray-200 flex justify-between items-center text-gray-600 font-sans text-xs md:text-sm">
              <span className="font-bold truncate max-w-[50%]" dir="auto" style={{ fontFamily: 'var(--arabic-font)' }}>{bookInfo?.bk}</span>
              <span>Jilid: {currentPage?.part} • Hal: {currentPage?.page}</span>
            </div>
            
            <div className="p-4 md:p-8 lg:p-12 flex-1">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="w-8 h-8 border-4 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="flex flex-col" style={{ fontSize: `${fontSize}px`, lineHeight: '2.2', fontFamily: 'var(--arabic-font)' }}>
                    {(currentPage?.text || '').split(/\r\n|\n|\r|<br\s*\/?>|<\/br>|\u2028|\u2029/i).map((line: string, i: number) => (
                      <div 
                        key={i} 
                        dir="auto" 
                        className="whitespace-pre-wrap text-justify" 
                        style={{ minHeight: line.trim() === '' ? '1.5em' : 'auto', wordBreak: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: highlightText(line, highlightQuery) }} 
                      />
                    ))}
                  </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Book (Split Screen) */}
        {showSplit && relatedPage && relatedBookInfo && (
          <div className="flex-1 p-0 md:p-4 lg:p-8 overflow-y-auto custom-scrollbar pb-24 md:pb-8" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <div className="w-full max-w-4xl mx-auto md:rounded-sm shadow-[0_0_25px_rgba(0,0,0,0.05)] border-0 md:border border-gray-300 flex flex-col min-h-full" style={{ backgroundColor: 'var(--reader-paper)' }}>
              <div className="px-4 md:px-8 py-3 md:py-4 border-b border-gray-300 flex justify-between items-center text-gray-600 font-sans text-xs md:text-sm bg-black/5">
                <span className="font-bold flex items-center gap-1 md:gap-2 truncate max-w-[50%]">
                  <BookOpen size={18} /> <span dir="auto" style={{ fontFamily: 'var(--arabic-font)' }}>{relatedBookInfo?.bk}</span>
                </span>
                <span>Jilid: {relatedPage?.part} • Hal: {relatedPage?.page}</span>
              </div>
              
              <div className="p-4 md:p-8 lg:p-12 flex-1">
                {loadingRelated ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="w-8 h-8 border-4 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="flex flex-col" style={{ fontSize: `${Math.max(fontSize - 4, 16)}px`, lineHeight: '2.2', fontFamily: 'var(--arabic-font)', color: 'var(--app-text)' }}>
                      {(relatedPage?.text || '').split(/\r\n|\n|\r|<br\s*\/?>|<\/br>|\u2028|\u2029/i).map((line: string, i: number) => (
                        <div 
                          key={i} 
                          dir="auto" 
                          className="whitespace-pre-wrap text-justify" 
                          style={{ minHeight: line.trim() === '' ? '1.5em' : 'auto', wordBreak: 'break-word' }}
                          dangerouslySetInnerHTML={{ __html: highlightText(line, highlightQuery) }} 
                        />
                      ))}
                    </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Bottom Navigation */}
      <div className="absolute bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 flex items-center bg-white/95 backdrop-blur-lg shadow-2xl rounded-full p-1 md:p-2 border border-[#e0e0e0] z-30 font-sans w-[95%] md:w-auto justify-between md:justify-center">
        {/* Previous is on the right visually in RTL */}
        <button 
          onClick={prevPage} 
          disabled={loading}
          className="bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-hover)] px-4 md:px-8 py-2 md:py-3 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg flex items-center gap-1 md:gap-2 flex-1 md:flex-none justify-center"
        >
          <ChevronLeft size={24} /> <span>Sebelumnya</span>
        </button>
        
        <div className="px-2 md:px-6 font-bold text-[var(--app-primary)] flex flex-col items-center">
          <span className="text-[10px] md:text-sm text-gray-500 uppercase tracking-widest">Posisi</span>
          <span className="text-sm md:text-base">Hal {currentPage?.page || '-'}</span>
        </div>
        
        {/* Next is on the left visually in RTL */}
        <button 
          onClick={nextPage} 
          disabled={loading}
          className="bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-hover)] px-4 md:px-8 py-2 md:py-3 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg flex items-center gap-1 md:gap-2 flex-1 md:flex-none justify-center"
        >
          <span>Selanjutnya</span> <ChevronRight size={24} />
        </button>
      </div>

    </div>
  );
};

export default ReaderModal;
