import re
with open('src/components/QuranReader.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '''<div className="text-center py-8 text-3xl text-[var(--app-text)] font-bold bg-[var(--reader-bg)] border-b border-gray-200" style={{ fontFamily: 'var(--arabic-font)' }}>''',
    '''<div className="text-center py-8 text-3xl text-[var(--app-text)] font-bold bg-[var(--reader-bg)] border-b border-gray-200" dir="rtl" style={{ fontFamily: 'var(--arabic-font)' }}>'''
)

text = text.replace(
    '''<div className="text-justify leading-[3] text-[var(--app-text)]" style={{ fontSize: 'calc(var(--app-font-size) + 8px)', fontFamily: 'var(--arabic-font)' }}>''',
    '''<div className="text-justify leading-[3] text-[var(--app-text)]" dir="rtl" style={{ fontSize: 'calc(var(--app-font-size) + 8px)', fontFamily: 'var(--arabic-font)' }}>'''
)

with open('src/components/QuranReader.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
