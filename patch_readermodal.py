import re
with open('src/components/ReaderModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '''<h2 className="text-lg md:text-2xl font-bold flex-1 text-center truncate px-2" style={{ fontFamily: 'var(--arabic-font)' }}>{bookInfo.bk}</h2>''',
    '''<h2 className="text-lg md:text-2xl font-bold flex-1 text-center truncate px-2" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{bookInfo.bk}</h2>'''
)

text = text.replace(
    '''<span className="font-bold truncate max-w-[50%]" style={{ fontFamily: 'var(--arabic-font)' }}>{bookInfo?.bk}</span>''',
    '''<span className="font-bold truncate max-w-[50%]" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{bookInfo?.bk}</span>'''
)

text = text.replace(
    '''<span style={{ fontFamily: 'var(--arabic-font)' }}>{relatedBookInfo?.bk}</span>''',
    '''<span dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{relatedBookInfo?.bk}</span>'''
)

text = text.replace(
    '''style={{ fontSize: `${fontSize}px`, lineHeight: '2.2', fontFamily: 'var(--arabic-font)' }}''',
    '''dir="rtl" style={{ fontSize: `${fontSize}px`, lineHeight: '2.2', fontFamily: 'var(--arabic-font)' }}'''
)

text = text.replace(
    '''style={{ fontSize: `${Math.max(fontSize - 4, 16)}px`, lineHeight: '2.2', fontFamily: 'var(--arabic-font)', color: 'var(--app-text)' }}''',
    '''dir="rtl" style={{ fontSize: `${Math.max(fontSize - 4, 16)}px`, lineHeight: '2.2', fontFamily: 'var(--arabic-font)', color: 'var(--app-text)' }}'''
)

with open('src/components/ReaderModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
