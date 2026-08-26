import re
with open('src/components/Catalog.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '''<span className="font-bold text-lg w-full" style={{ fontFamily: 'var(--arabic-font)' }}>{cat.name}</span>''',
    '''<span className="font-bold text-lg w-full text-right" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>{cat.name}</span>'''
)

text = text.replace(
    '''<h2 className="text-xl md:text-2xl font-bold text-[var(--app-text)]" style={{ fontFamily: 'var(--arabic-font)' }}>''',
    '''<h2 className="text-xl md:text-2xl font-bold text-[var(--app-text)]" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>'''
)

text = text.replace(
    '''<h3 className="font-bold text-[var(--app-text)] text-xl mb-2 group-hover:text-[var(--app-primary)] transition-colors flex justify-end items-start gap-2" style={{ fontFamily: 'var(--arabic-font)' }}>
                      <span className="break-words">{book.bk}</span>
                      <BookOpen className="shrink-0 mt-1 opacity-70" size={20} />
                    </h3>''',
    '''<h3 className="font-bold text-[var(--app-text)] text-xl mb-2 group-hover:text-[var(--app-primary)] transition-colors flex justify-start items-start gap-2" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>
                      <BookOpen className="shrink-0 mt-1 opacity-70" size={20} />
                      <span className="break-words">{book.bk}</span>
                    </h3>'''
)

text = text.replace(
    '''{book.author_name && (
                      <p className="text-sm opacity-70 font-sans flex justify-end items-center gap-2">
                        <span className="break-words">{book.author_name}</span>
                        <User size={14} />
                      </p>
                    )}''',
    '''{book.author_name && (
                      <p className="text-sm opacity-70 font-sans flex justify-start items-center gap-2" dir="rtl">
                        <User size={14} />
                        <span className="break-words mr-1">{book.author_name}</span>
                      </p>
                    )}'''
)

with open('src/components/Catalog.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
