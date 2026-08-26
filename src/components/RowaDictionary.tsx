import React, { useState } from 'react';
import { webAPI } from '../api';

const RowaDictionary: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRowa, setSelectedRowa] = useState<any | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // @ts-ignore
      const res = await webAPI.searchRowa(query);
      if (res.error) {
        setError(res.error);
      } else {
        setResults(res.data || []);
      }
    } catch (err: any) {
      setError(err.message);
    }
    
    setLoading(false);
  };

  const openProfile = async (id: number) => {
    try {
      // @ts-ignore
      const res = await webAPI.getRowaInfo(id);
      if (res.data) {
        setSelectedRowa(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const parseList = (text: string) => {
    if (!text) return [];
    // Pisahkan berdasarkan # dan bersihkan spasi
    return text.split('#')
      .map(t => t.trim())
      .filter(t => t.length > 0 && t !== 'A' && t !== 'B'); 
      // A dan B kadang muncul di awal data asli sebagai penanda
  };

  return (
    <div className="w-full font-serif" dir="rtl">
      <div className="bg-[#fffdf7] p-8 rounded-xl shadow-md border border-[#d7ccc8] mb-8">
        <h2 className="text-3xl font-bold text-[#3e2723] mb-6 text-center border-b pb-4">
          Kamus Biografi Perawi
        </h2>
        
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Masukkan nama perawi (contoh: مالك بن أنس)..." 
            className="flex-1 p-4 rounded-lg border-2 border-[#8d6e63] text-xl focus:outline-none focus:border-[#4e342e] bg-white shadow-inner"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#5d4037] text-white px-8 py-4 rounded-lg text-xl font-bold hover:bg-[#4e342e] transition-colors whitespace-nowrap shadow-md disabled:bg-gray-400"
          >
            {loading ? '...' : 'Cari'}
          </button>
        </form>
        {error && <div className="mt-4 text-red-600 bg-red-100 p-3 rounded">{error}</div>}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {results.map((r, i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow border border-[#e0e0e0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
            <div className="flex-1 w-full">
              <h3 className="text-2xl font-bold text-[#4e342e] mb-2" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{r.Name}</h3>
              <p className="text-[#795548] text-lg" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>
                <span className="font-bold" style={{ fontFamily: 'var(--latin-font)' }}>Derajat: </span> 
                {r.ROTBA || r.R_ZAHBI || 'Tidak ada info derajat'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Lahir: {r.birth || '?'} | Wafat: {r.death || '?'}
              </p>
            </div>
            <button 
              onClick={() => openProfile(r.id)}
              className="bg-[#8d6e63] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#5d4037] transition-colors w-full sm:w-auto mt-2 sm:mt-0"
            >
              Lihat Profil
            </button>
          </div>
        ))}
        {!loading && results.length === 0 && query && !error && (
          <p className="text-center text-gray-500 bg-white p-8 rounded-lg">Tidak ada perawi yang ditemukan.</p>
        )}
      </div>

      {/* Profil Modal */}
      {selectedRowa && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
          <div className="bg-[#fffdf7] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#d7ccc8]">
            
            <div className="bg-[#5d4037] text-white p-5 flex justify-between items-center">
              <h2 className="text-3xl font-bold">{selectedRowa.Name}</h2>
              <button onClick={() => setSelectedRowa(null)} className="text-white hover:text-red-200 text-3xl px-2">&times;</button>
            </div>
            
            <div className="overflow-y-auto p-8 space-y-8 text-right">
              
              {/* Info Dasar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f4ebd0] p-6 rounded-lg border border-[#e0d6b8]">
                <div>
                  <span className="block text-sm text-[#795548] font-bold mb-1">Nama Lengkap (Esm):</span>
                  <div className="text-xl font-bold text-[#3e2723]" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{selectedRowa.A_esm || '-'}</div>
                </div>
                <div>
                  <span className="block text-sm text-[#795548] font-bold mb-1">Nasab:</span>
                  <div className="text-xl font-bold text-[#3e2723]" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{selectedRowa.A_nasab || '-'}</div>
                </div>
                <div>
                  <span className="block text-sm text-[#795548] font-bold mb-1">Kunyah:</span>
                  <div className="text-xl font-bold text-[#3e2723]" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{selectedRowa.A_kona || '-'}</div>
                </div>
                <div>
                  <span className="block text-sm text-[#795548] font-bold mb-1">Lahir - Wafat:</span>
                  <div className="text-xl font-bold text-[#3e2723]">{selectedRowa.birth || '?'} - {selectedRowa.death || '?'}</div>
                </div>
              </div>

              {/* Derajat */}
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-lg border-l-4 border-[#4CAF50] shadow-sm">
                  <span className="block text-lg text-[#2E7D32] font-bold mb-2">Derajat Perawi (Ibnu Hajar/Taqrib):</span>
                  <p className="text-2xl text-[#1b5e20] leading-relaxed" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{selectedRowa.ROTBA || '-'}</p>
                </div>
                <div className="bg-white p-5 rounded-lg border-l-4 border-[#2196F3] shadow-sm">
                  <span className="block text-lg text-[#1565C0] font-bold mb-2">Derajat (menurut Adh-Dhahabi):</span>
                  <p className="text-2xl text-[#0d47a1] leading-relaxed" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{selectedRowa.R_ZAHBI || '-'}</p>
                </div>
              </div>

              {/* Guru & Murid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xl font-bold text-[#4e342e] mb-3 flex items-center gap-2">👨‍🏫 Guru-guru (Syuyukh)</h4>
                  <div className="bg-white border border-[#e0e0e0] rounded-lg p-4 max-h-80 overflow-y-auto">
                    <ul className="list-disc list-inside space-y-2">
                      {parseList(selectedRowa.sheok).map((g, idx) => (
                        <li key={idx} className="text-lg text-[#5d4037] pb-1 border-b border-gray-100 last:border-0" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{g}</li>
                      ))}
                    </ul>
                    {parseList(selectedRowa.sheok).length === 0 && <span className="text-gray-400">Tidak ada data.</span>}
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-[#4e342e] mb-3 flex items-center gap-2">👨‍🎓 Murid-murid (Talamidz)</h4>
                  <div className="bg-white border border-[#e0e0e0] rounded-lg p-4 max-h-80 overflow-y-auto">
                    <ul className="list-disc list-inside space-y-2">
                      {parseList(selectedRowa.telmez).map((m, idx) => (
                        <li key={idx} className="text-lg text-[#5d4037] pb-1 border-b border-gray-100 last:border-0" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{m}</li>
                      ))}
                    </ul>
                    {parseList(selectedRowa.telmez).length === 0 && <span className="text-gray-400">Tidak ada data.</span>}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RowaDictionary;
