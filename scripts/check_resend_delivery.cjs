const https = require('https');

const id = '01a1107a-4ac9-75fa-9700-1228d673d693';
const key = 're_mock_dummy_resend_api_key_sanitized';

https.get({
  hostname: 'api.resend.com',
  path: `/emails/${id}`,
  headers: { 'Authorization': `Bearer ${key}` }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      console.log('Status Details:', JSON.parse(d));
    } catch (e) {
      console.log('Response:', d);
    }
  });
});
