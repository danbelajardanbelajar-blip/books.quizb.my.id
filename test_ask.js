fetch('http://localhost:3000/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'hantu' })
})
.then(res => res.text())
.then(data => console.log(data))
.catch(err => console.error(err));
