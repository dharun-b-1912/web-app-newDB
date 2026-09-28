const fs = require('fs');
const path = require('path');
const file = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('User:', data.user?.email);
console.log('Has tokens:', Boolean(data.tokens?.refresh_token));
console.log('Scopes:', data.tokens?.scopes);
