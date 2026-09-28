const fs = require('fs');
const path = require('path');
const file = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

async function testAccess() {
  const token = data.tokens?.access_token;
  console.log('Testing access token validity...');
  const res = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + token);
  const info = await res.json();
  console.log('Token info:', info);
}

testAccess().catch(console.error);
