const https = require('https');

https.get('https://maps.app.goo.gl/oJDgaJTNBwzXw9mC7', (res) => {
  console.log('Redirect Location:', res.headers.location);
});
