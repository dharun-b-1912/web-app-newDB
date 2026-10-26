const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function main() {
  const res = await fetch(`${url}/rest/v1/user_profiles?email=ilike.*dharun*&select=id,email,auth_user_id`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const data = await res.json();
  console.log('Dharun user profile:', data);

  // Also query employees to see user_id mapping
  const empRes = await fetch(`${url}/rest/v1/employees?first_name=ilike.*dharun*&select=id,first_name,user_id`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  console.log('Dharun employee:', await empRes.json());
}

main().catch(console.error);
