const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const anonKey = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');

async function check() {
  const authRes = await fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'marimuthu@joycorporatesolutions.com', password: 'joypeoplehr' })
  });
  const auth = await authRes.json();
  const token = auth.access_token;

  // Fetch OpenAPI schema to see exact column definitions for lms_courses and lms_enrollments
  const res1 = await fetch(`${url}/rest/v1/lms_courses`, {
    method: 'POST',
    headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({})
  });
  console.log('lms_courses insert hint:', await res1.text());
}

check().catch(console.error);
