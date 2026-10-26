const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const anonKey = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');

async function run() {
  const authRes = await fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'marimuthu@joycorporatesolutions.com', password: 'joypeoplehr' })
  });
  const auth = await authRes.json();
  const token = auth.access_token;

  const res = await fetch(`${url}/rest/v1/lms_courses?select=*`, {
    headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + token }
  });
  const rows = await res.json();
  console.log('lms_courses rows count:', rows.length);
  if (rows.length > 0) {
    console.log('First row keys:', Object.keys(rows[0]));
    console.log('First row data:', JSON.stringify(rows[0], null, 2));
  }
}

run().catch(console.error);
