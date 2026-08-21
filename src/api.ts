const API_BASE = '/api'; // Use relative path for production (served by Express) or proxy in dev

async function fetchAPI(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const webAPI = {
  search: async (query: string, page = 1, limit = 50) => {
    return fetchAPI(`/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  },
  getBookInfo: async (bookId: number) => {
    return fetchAPI(`/book/${bookId}`);
  },
  getToc: async (bookId: number) => {
    return fetchAPI(`/toc/${bookId}`);
  },
  getPage: async (bookId: number, pageId?: number) => {
    return fetchAPI(`/book/${bookId}/page/${pageId || ''}`);
  },
  getNextPage: async (bookId: number, currentPageId: number) => {
    return fetchAPI(`/book/${bookId}/next/${currentPageId}`);
  },
  getPrevPage: async (bookId: number, currentPageId: number) => {
    return fetchAPI(`/book/${bookId}/prev/${currentPageId}`);
  },
  getMatnSharh: async (bookId: number, pageId: number) => {
    return fetchAPI(`/matn_sharh/${bookId}/${pageId}`);
  },
  getQuranSurahs: async () => {
    return fetchAPI(`/quran/surahs`);
  },
  getQuranAyahs: async (surahId: number) => {
    return fetchAPI(`/quran/surah/${surahId}`);
  },
  searchRowa: async (query: string) => {
    return fetchAPI(`/rowa/search?q=${encodeURIComponent(query)}`);
  },
  getRowaInfo: async (rowaId: number) => {
    return fetchAPI(`/rowa/${rowaId}`);
  }
};
