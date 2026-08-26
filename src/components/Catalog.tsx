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
      <div className="md:w-1/3 bg-white p-4 rounded-xl shadow-md border border-[#d7ccc8] flex flex-col h-[80vh]">
        <h2 className="text-xl font-bold text-[#5d4037] mb-4 border-b pb-2">فهرس الأقسام (Kategori)</h2>
        <input 
          type="text" 
          placeholder="Cari kategori..." 
          value={searchCat}
          onChange={(e) => setSearchCat(e.target.value)}
          className="w-full p-2 mb-4 border border-[#8d6e63] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5d4037]"
        />
        <div className="overflow-y-auto flex-1 pr-2 space-y-1">
          {filteredCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors font-bold ${selectedCat === cat.id ? 'bg-[#5d4037] text-white' : 'hover:bg-[#f4ebd0] text-[#795548]'}`}
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
      <div className="md:w-2/3 bg-white p-4 rounded-xl shadow-md border border-[#d7ccc8] h-[80vh] flex flex-col">
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
            <div className="overflow-y-auto flex-1 pr-2 grid grid-cols-1 gap-3">
              {books.map(book => (
                <div 
                  key={book.bkid} 
                  onClick={() => readBook(book.bkid)}
                  className="border border-[#e0e0e0] p-4 rounded-xl shadow-sm hover:shadow-md hover:border-[#8d6e63] hover:bg-[#fbf8f1] transition-all bg-white cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group relative overflow-hidden"
                  title="Klik untuk langsung membaca kitab"
                >
                  <div className="flex-1">
                    <h3 className="font-bold text-[#4e342e] text-lg sm:text-xl mb-1 group-hover:text-green-700 transition-colors flex items-center gap-2" style={{ fontFamily: 'var(--arabic-font)' }}>
                      <span className="text-xl">📖</span>
                      {book.bk}
                    </h3>
                    {book.author_name && (
                      <p className="text-sm text-gray-500 font-sans flex items-center gap-1">
                        <span className="text-xs">👤</span> Penulis: {book.author_name}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openBook(book.bkid);
                    }}
                    className="bg-gray-100 text-[#5d4037] border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#6d4c41] hover:text-white hover:border-[#6d4c41] transition-all shrink-0 flex items-center gap-2 shadow-sm"
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
