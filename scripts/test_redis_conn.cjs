const https = require('https');
const url = new URL('https://powerful-marmot-162532.upstash.io/ping');
const req = https.request(url, {
  headers: {
    Authorization: 'Bearer gQAAAAAAAnrkAAIgcDI0NjFkYzJlOWE5YWQ0ODVhOWYwYWNmYzFkNWJmM2FjZQ'
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('UPSTASH PING RESPONSE:', res.statusCode, d));
});
req.on('error', e => console.error('ERR:', e.message));
req.end();
