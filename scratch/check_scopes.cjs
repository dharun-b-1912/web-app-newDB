const fs = require('fs');
const path = require('path');
const file = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('Scopes:', data.tokens?.scopes || data.tokens?.scope);
console.log('Expires at:', new Date(data.tokens?.expires_at).toISOString());
console.log('Has refresh_token:', !!data.tokens?.refresh_token);
