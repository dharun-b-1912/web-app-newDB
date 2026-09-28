// scripts/probe_edge_function.cjs
const https = require('https');

const postData = JSON.stringify({ action: 'HEALTH_CHECK' });

const req = https.request({
  hostname: 'ysiajemrqakfngasehhi.supabase.co',
  path: '/functions/v1/vendor-auth-provisioner',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', (e) => console.log('Error:', e.message));
req.write(postData);
req.end();
