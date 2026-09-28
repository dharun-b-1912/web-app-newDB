const fs = require('fs');
const path = require('path');
const file = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const accessToken = data.tokens.access_token;

async function createKey() {
  const sa = 'firebase-adminsdk-fbsvc@joy-peoplehr-mobile-app.iam.gserviceaccount.com';
  const url = `https://iam.googleapis.com/v1/projects/joy-peoplehr-mobile-app/serviceAccounts/${sa}/keys`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE'
    })
  });
  console.log('Status:', res.status);
  const json = await res.json();
  if (json.privateKeyData) {
    const decoded = Buffer.from(json.privateKeyData, 'base64').toString('utf8');
    const keyObj = JSON.parse(decoded);
    console.log('Success! Key for:', keyObj.client_email);
    fs.writeFileSync(path.join(__dirname, 'firebase-service-account.json'), decoded, 'utf8');
    console.log('Saved to scratch/firebase-service-account.json');
  } else {
    console.log('Error creating key:', json);
  }
}

createKey();
