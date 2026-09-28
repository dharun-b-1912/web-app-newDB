const fs = require('fs');
const path = require('path');
const saJson = fs.readFileSync(path.join(__dirname, 'firebase-service-account.json'), 'utf8');
const minified = JSON.stringify(JSON.parse(saJson));
fs.writeFileSync(path.join(__dirname, '.env.firebase'), `FIREBASE_SERVICE_ACCOUNT='${minified}'\n`, 'utf8');
console.log('Created scratch/.env.firebase');
