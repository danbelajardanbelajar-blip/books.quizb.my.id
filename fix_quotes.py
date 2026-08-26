import re
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'fontFamily:\s*\'\'?var\(--arabic-font\)\'?\'?', r"fontFamily: 'var(--arabic-font)'", text)
text = re.sub(r'fontFamily:\s*\\\'var\(--arabic-font\)\\\'', r"fontFamily: 'var(--arabic-font)'", text)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
