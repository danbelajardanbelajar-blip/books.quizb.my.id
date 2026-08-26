with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('max-h-48', 'max-h-80 md:max-h-[60vh]')

text = text.replace('{error && <div className="bg-red-50', '<div id="search-results">\n              {error && <div className="bg-red-50')

text = text.replace('              </div>\n\n            {totalResults > 0 && (\n              <div className="flex justify-center', '              </div>\n            </div>\n\n            {totalResults > 0 && (\n              <div className="flex justify-center')

old_handle = '''const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, 1);
  };'''

new_handle = '''const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    executeSearch(query, 1).then(() => {
      setTimeout(() => {
        const resultsEl = document.getElementById('search-results');
        if (resultsEl) {
          const y = resultsEl.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    });
  };'''

text = text.replace(old_handle, new_handle)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
