const fs = require('fs');
const path = require('path');
const file = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
if (fs.existsSync(file)) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('Firebase user:', data.user?.email);
  console.log('Has tokens:', !!data.tokens);
  console.log('Token keys:', Object.keys(data.tokens || {}));
} else {
  console.log('File does not exist');
}
