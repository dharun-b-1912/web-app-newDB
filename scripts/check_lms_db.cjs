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

  for (const table of ['lms_courses', 'lms_questions', 'lms_enrollments', 'lms_assessment_attempts', 'notifications']) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + token }
    });
    const body = await res.text();
    console.log(`Table ${table}: status ${res.status}`, body.slice(0, 100));
  }
}

check().catch(console.error);
