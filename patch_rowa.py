import re
with open('src/components/RowaDictionary.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace any occurrence of style={{ fontFamily: 'var(--arabic-font)' }} with dir="rtl" added
text = re.sub(
    r'(<[a-zA-Z1-6]+[^>]*?)(style={{ fontFamily: \'var\(--arabic-font\)\' }})',
    r'\1dir="rtl" \2',
    text
)

text = re.sub(
    r'(<[a-zA-Z1-6]+[^>]*?)(style={{ fontFamily: \'var\(--arabic-font\)\', fontSize: \'var\(--app-font-size\)\' }})',
    r'\1dir="rtl" \2',
    text
)

with open('src/components/RowaDictionary.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
