const http = require('http');

http.get('http://localhost:11108/punches', (res) => {
  let raw = '';
  res.on('data', chunk => raw += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(raw);
      console.log('Daemon Punches Count:', data.punches?.length);
      console.log('Sample 3 punches:', data.punches?.slice(0, 3));
    } catch (e) {
      console.error('Parse error:', e);
    }
  });
}).on('error', err => console.error('Fetch error:', err));
