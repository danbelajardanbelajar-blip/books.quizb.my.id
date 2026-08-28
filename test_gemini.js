const apiKey = 'AIzaSyDDeLIfq3Vi4T3xwjQD9FJb_hRN2go7QpU';
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data)))
.catch(err => console.error(err));
