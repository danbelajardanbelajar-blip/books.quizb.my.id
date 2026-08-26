import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Logo title
text = text.replace(
    '''<h1 className="text-xl md:text-2xl font-bold" style={{ fontFamily: 'var(--arabic-font)' }}>المكتبة الشاملة</h1>''',
    '''<h1 className="text-xl md:text-2xl font-bold" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>المكتبة الشاملة</h1>'''
)

# 2. r.book_name
text = text.replace(
    '''<BookMarked size={16} /> {r.book_name}''',
    '''<BookMarked size={16} /> <span dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{r.book_name}</span>'''
)

# 3. r.snippet
text = text.replace(
    '''className="text-2xl leading-loose cursor-pointer hover:bg-[var(--app-primary)]/5 active:bg-[var(--app-primary)]/10 p-4 rounded-xl border border-transparent hover:border-[var(--app-primary)]/20 transition-all text-justify"
                      title="Klik teks untuk membaca halaman ini"
                      dangerouslySetInnerHTML={{ __html: r.snippet }} ''',
    '''className="text-2xl leading-loose cursor-pointer hover:bg-[var(--app-primary)]/5 active:bg-[var(--app-primary)]/10 p-4 rounded-xl border border-transparent hover:border-[var(--app-primary)]/20 transition-all text-justify"
                      title="Klik teks untuk membaca halaman ini"
                      dir="rtl"
                      style={{ fontFamily: 'var(--arabic-font)' }}
                      dangerouslySetInnerHTML={{ __html: r.snippet }} '''
)

# 4. BookInfo Modal Header
text = text.replace(
    '''<h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen size={24} /> {bookInfo ? bookInfo.bk : 'Memuat...'}</h2>''',
    '''<h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen size={24} /> <span dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{bookInfo ? bookInfo.bk : 'Memuat...'}</span></h2>'''
)

# 5. bookInfo details
text = text.replace(
    '''<p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--arabic-font)', fontSize: 'var(--app-font-size)' }}>{bookInfo.betaka}</p>''',
    '''<p className="text-gray-700 leading-relaxed whitespace-pre-wrap" dir="rtl" style={{ fontFamily: 'var(--arabic-font)', fontSize: 'var(--app-font-size)' }}>{bookInfo.betaka}</p>'''
)
text = text.replace(
    '''<p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--arabic-font)', fontSize: 'var(--app-font-size)' }}>{bookInfo.book_inf}</p>''',
    '''<p className="text-gray-700 leading-relaxed whitespace-pre-wrap" dir="rtl" style={{ fontFamily: 'var(--arabic-font)', fontSize: 'var(--app-font-size)' }}>{bookInfo.book_inf}</p>'''
)
text = text.replace(
    '''<p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--arabic-font)', fontSize: 'var(--app-font-size)' }}>{bookInfo.author_inf}</p>''',
    '''<p className="text-gray-700 leading-relaxed whitespace-pre-wrap" dir="rtl" style={{ fontFamily: 'var(--arabic-font)', fontSize: 'var(--app-font-size)' }}>{bookInfo.author_inf}</p>'''
)

# 6. TOC items
text = text.replace(
    '''<span className="font-semibold text-[#5d4037]">{item.tit}</span>''',
    '''<span className="font-semibold text-[#5d4037]" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{item.tit}</span>'''
)

# 7. TOC Header (Daftar Isi in Arabic)
text = text.replace(
    '''<h3 className="text-xl font-bold mb-4 text-[#4e342e] border-b pb-2">الفهرس (Daftar Isi)</h3>''',
    '''<h3 className="text-xl font-bold mb-4 text-[#4e342e] border-b pb-2 flex justify-between"><span dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>الفهرس</span> <span>(Daftar Isi)</span></h3>'''
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
