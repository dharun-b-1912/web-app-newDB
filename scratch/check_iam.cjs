const fs = require('fs');
const path = require('path');
const file = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const accessToken = data.tokens.access_token;

async function checkIam() {
  const url = 'https://iam.googleapis.com/v1/projects/joy-peoplehr-mobile-app/serviceAccounts';
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  console.log('Status:', res.status);
  const json = await res.json();
  console.log('Service accounts:', JSON.stringify(json, null, 2));
}

checkIam();
