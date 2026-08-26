import React, { useState, useEffect } from 'react';
import { webAPI } from '../api';

const Catalog: React.FC<{ openBook: (id: number) => void, readBook: (id: number) => void }> = ({ openBook, readBook }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCat, setSearchCat] = useState('');

  useEffect(() => {
    webAPI.getCategories().then((res: any) => {
      setCategories(res.data || []);
    });
  }, []);

  useEffect(() => {
    if (selectedCat) {
      setLoading(true);
      webAPI.getCategoryBooks(selectedCat).then((res: any) => {
        setBooks(res.data || []);
        setLoading(false);
      });
    } else {
      setBooks([]);
    }
  }, [selectedCat]);

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchCat.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
      {/* Sidebar Kategori */}
      <div className="w-full md:w-1/3 bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col max-h-[35vh] md:max-h-none md:h-[80vh]">
        <h2 className="text-lg md:text-xl font-bold text-[#5d4037] mb-3 border-b pb-2">فهرس الأقسام (Kategori)</h2>
        <input 
          type="text" 
          placeholder="Cari kategori..." 
          value={searchCat}
          onChange={(e) => setSearchCat(e.target.value)}
          className="w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5d4037] text-sm md:text-base"
        />
        <div className="overflow-y-auto flex-1 pr-2 space-y-1 custom-scrollbar">
          {filteredCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all font-bold border-b border-gray-50 last:border-0 ${selectedCat === cat.id ? 'bg-[#5d4037] text-white shadow-sm' : 'hover:bg-[#f4ebd0] text-gray-700'}`}
            >
              {cat.name}
            </button>
          ))}
          {filteredCategories.length === 0 && (
            <p className="text-center text-gray-500 text-sm mt-4">Kategori tidak ditemukan.</p>
          )}
        </div>
      </div>

      {/* Main Content (Buku) */}
      <div className="w-full md:w-2/3 bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[65vh] md:h-[80vh]">
        {!selectedCat ? (
          <div className="flex-1 flex items-center justify-center text-[#795548] flex-col opacity-60">
            <span className="text-4xl mb-4">📚</span>
            <p className="font-bold text-lg">Pilih kategori di samping untuk melihat daftar kitab.</p>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center text-[#795548]">
            <p className="font-bold animate-pulse">Memuat daftar kitab...</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-[#5d4037] mb-4 border-b pb-2 flex justify-between">
              <span>{categories.find(c => c.id === selectedCat)?.name}</span>
              <span className="text-sm bg-[#f4ebd0] px-3 py-1 rounded-full text-[#795548]">{books.length} Kitab</span>
            </h2>
            <div className="overflow-y-auto flex-1 pl-2 pr-1 flex flex-col gap-3 pb-4">
              {books.map(book => (
                <div 
                  key={book.bkid} 
                  onClick={() => readBook(book.bkid)}
                  className="border border-[#e0e0e0] p-3 md:p-4 rounded-xl shadow-sm hover:shadow-md hover:border-[#8d6e63] hover:bg-[#fbf8f1] transition-all bg-white cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-3 group shrink-0"
                  title="Klik untuk langsung membaca kitab"
                >
                  <div className="flex-1 w-full">
                    <h3 className="font-bold text-[#4e342e] text-lg md:text-xl mb-1 group-hover:text-green-700 transition-colors flex items-start gap-2 leading-snug" style={{ fontFamily: 'var(--arabic-font)' }}>
                      <span className="text-lg md:text-xl mt-0.5 shrink-0">📖</span>
                      <span className="break-words">{book.bk}</span>
                    </h3>
                    {book.author_name && (
                      <p className="text-xs md:text-sm text-gray-500 font-sans flex items-start gap-1 leading-tight">
                        <span className="shrink-0">👤</span>
                        <span className="break-words">Penulis: {book.author_name}</span>
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openBook(book.bkid);
                    }}
                    className="bg-gray-100 text-[#5d4037] border border-gray-200 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm font-bold hover:bg-[#6d4c41] hover:text-white hover:border-[#6d4c41] transition-all shrink-0 flex items-center justify-center gap-2 shadow-sm w-full md:w-auto mt-1 md:mt-0"
                  >
                    ℹ️ Detail
                  </button>
                </div>
              ))}
              {books.length === 0 && (
                <p className="text-center text-gray-500 mt-10">Tidak ada kitab dalam kategori ini.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Catalog;
