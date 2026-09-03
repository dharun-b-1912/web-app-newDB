const http = require('http');

http.get('http://127.0.0.1:11108/users?ip=192.168.1.201&port=4370', (res) => {
  let raw = '';
  res.on('data', chunk => raw += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', raw);
  });
}).on('error', (e) => {
  console.error('FETCH ERROR:', e.message);
});
