import re
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(
    r'(</div>)\s*(\{totalResults > 0 && \(\s*<div className="flex justify-center)',
    r'\1\n            </div>\n\n            \2',
    text
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
