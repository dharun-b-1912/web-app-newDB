const http = require('http');

http.get('http://localhost:3000', (res) => {
  console.log('HTTP', res.statusCode);
  process.exit(0);
}).on('error', (err) => {
  console.log('Server down:', err.message);
  process.exit(1);
});

