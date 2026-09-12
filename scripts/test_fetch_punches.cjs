const http = require('http');

http.get('http://127.0.0.1:11108/punches', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
