with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('              </div>\n  \n            {totalResults > 0 && (\n              <div className="flex justify-center', '              </div>\n            </div>\n  \n            {totalResults > 0 && (\n              <div className="flex justify-center')

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
