const express = require('express');
const app = express();
app.get('/api/book/:id/page/:pageId', (req, res) => res.send('pageId route: ' + req.params.pageId));
app.get('/api/book/:id/page', (req, res) => res.send('page route'));

app.listen(3015, () => {
  fetch('http://localhost:3015/api/book/1/page/')
    .then(r => r.text())
    .then(t => { console.log(t); process.exit(0); });
});
