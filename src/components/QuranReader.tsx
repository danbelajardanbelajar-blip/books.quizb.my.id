import React, { useState, useEffect } from 'react';
import { webAPI } from '../api';

const QuranReader: React.FC = () => {
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSurahs();
  }, []);

  useEffect(() => {
    if (selectedSurah !== null) {
      loadAyahs(selectedSurah);
    }
  }, [selectedSurah]);

  const loadSurahs = async () => {
    try {
      // @ts-ignore
      const res = await webAPI.getQuranSurahs();
      if (res.data) {
        setSurahs(res.data);
        if (res.data.length > 0) {
          setSelectedSurah(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAyahs = async (surahId: number) => {
    setLoading(true);
    try {
      // @ts-ignore
      const res = await webAPI.getQuranAyahs(surahId);
      if (res.data) {
        setAyahs(res.data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Convert English numbers to Arabic numbers for the Ayah symbol
  const toArabicNumber = (num: number) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().split('').map(n => arabicNumbers[parseInt(n)]).join('');
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-2xl border border-[#d7ccc8] overflow-hidden" dir="rtl">
      
      {/* Sidebar: Surah List */}
      <div className="w-1/4 bg-[#f4ebd0] border-l border-[#d7ccc8] flex flex-col overflow-y-auto custom-scrollbar">
        <div className="bg-[#5d4037] text-white p-4 font-bold text-xl text-center sticky top-0 shadow-md">
          فهرس السور (Daftar Surah)
        </div>
        <div className="flex-1 overflow-y-auto">
          {surahs.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSurah(s.id)}
              className={`w-full text-right p-4 border-b border-[#e0e0e0] font-bold text-xl transition-colors ${
                selectedSurah === s.id ? 'bg-[#6d4c41] text-white' : 'hover:bg-[#e0d6b8] text-[#4e342e]'
              }`}
            >
              <span className="inline-block w-8 text-center bg-black/10 rounded-full mr-2 ml-2 text-sm py-1">
                {s.id}
              </span>
              سورة {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Quran Reader */}
      <div className="w-3/4 flex flex-col bg-[#fffdf7] relative overflow-hidden">
        {/* Bismillah Header (Except for At-Tawbah) */}
        {selectedSurah !== 9 && (
          <div className="text-center py-8 text-3xl text-[#3e2723] font-bold bg-[#fffdf7] border-b border-gray-200">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-10">
          {loading ? (
            <div className="flex justify-center items-center h-full text-2xl text-gray-400">
              Memuat ayat...
            </div>
          ) : (
            <div className="text-justify leading-[3] text-[#2b1810]" style={{ fontSize: '2.5rem' }}>
              {ayahs.map(a => (
                <span key={a.id} className="inline">
                  {/* Skip rendering Bismillah as part of ayah 1 for Al-Fatiha if it's already in the text, or handle normally.
                      Syamilah usually includes it in Ayah 1 of Al-Fatiha. We'll just render whatever is in the DB. */}
                  {a.text} <span className="text-[#8d6e63] font-sans px-2">﴿{toArabicNumber(a.ayah_no)}﴾</span>{' '}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuranReader;
