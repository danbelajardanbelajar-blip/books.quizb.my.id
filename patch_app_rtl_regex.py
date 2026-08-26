import re
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(
    r'<h3 className="text-xl font-bold mb-4 text-\[#4e342e\] border-b pb-2">.*?\(Daftar Isi\)</h3>',
    r'<h3 className="text-xl font-bold mb-4 text-[#4e342e] border-b pb-2 flex justify-between"><span dir="rtl" style={{ fontFamily: \'var(--arabic-font)\' }}>الفهرس</span> <span>(Daftar Isi)</span></h3>',
    text
)

text = re.sub(
    r'<h1 className="text-xl md:text-2xl font-bold" style={{ fontFamily: \'var\(--arabic-font\)\' }}>.*?</h1>',
    r'<h1 className="text-xl md:text-2xl font-bold" dir="rtl" style={{ fontFamily: \'var(--arabic-font)\' }}>المكتبة الشاملة</h1>',
    text
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
