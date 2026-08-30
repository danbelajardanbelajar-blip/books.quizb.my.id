const API_BASE = '/api'; // Use relative path for production (served by Express) or proxy in dev

async function fetchAPI(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const webAPI = {

  adminLogin: async (credentials: any) => {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
  },
  getAdminBooks: async (token: string, page = 1, query = '') => {
    let url = `${API_BASE}/admin/books?page=${page}`;
    if (query) url += `&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    return res.json();
  },
  updateAdminBook: async (token: string, bookId: number, data: any) => {
    const res = await fetch(`${API_BASE}/admin/book/${bookId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
    return res.json();
  },


  askAI: async (query: string) => {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query })
    });
    
    let data;
    try {
        data = await res.json();
    } catch (e) {
        await res.text().catch(() => '');
        throw new Error(`Server returned invalid response (Status ${res.status}). Ini biasanya karena koneksi terputus atau server sedang sibuk (Timeout).`);
    }

    if (!res.ok) {
        if (data.message) {
            throw new Error(data.message);
        }
        throw new Error(`API error: ${res.status}`);
    }
    return data;
  },

  search: async (query: string, page = 1, limit = 50, cat_id?: number | string) => {
    let url = `/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
    if (cat_id) url += `&cat_id=${cat_id}`;
    return fetchAPI(url);
  },
  
  searchTitles: async (query: string, page = 1, limit = 20, cat_id?: number | string) => {
    let url = `/search_titles?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
    if (cat_id) url += `&cat_id=${cat_id}`;
    return fetchAPI(url);
  },
  searchScholarium: async (query: string, page = 1) => {
    return fetchAPI(`/search_scholarium?q=${encodeURIComponent(query)}&page=${page}`);
  },
  searchArchive: async (query: string, page = 1) => {
    return fetchAPI(`/search_archive?q=${encodeURIComponent(query)}&page=${page}`);
  },
  getBookInfo: async (bookId: number) => {
    return fetchAPI(`/book/${bookId}`);
  },
  getToc: async (bookId: number) => {
    return fetchAPI(`/toc/${bookId}`);
  },
  getPage: async (bookId: number, pageId?: number) => {
    return fetchAPI(`/book/${bookId}/page${pageId ? `/${pageId}` : ''}`);
  },
  getFirstPage: async (bookId: number) => {
    return fetchAPI(`/book/${bookId}/first`);
  },
  getLastPage: async (bookId: number) => {
    return fetchAPI(`/book/${bookId}/last`);
  },
  getNextJuz: async (bookId: number, currentPageId: number) => {
    return fetchAPI(`/book/${bookId}/next_juz/${currentPageId}`);
  },
  getPrevJuz: async (bookId: number, currentPageId: number) => {
    return fetchAPI(`/book/${bookId}/prev_juz/${currentPageId}`);
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
  },
  getCategories: async () => {
    return fetchAPI(`/categories`);
  },
  getCategoryBooks: async (categoryId: number) => {
    return fetchAPI(`/category/${categoryId}/books`);
  },
  getRecentSearches: async () => {
    return fetchAPI(`/recent-searches`);
  },
  getRecentQuestions: async () => {
    return fetchAPI(`/recent-questions`);
  }
};
