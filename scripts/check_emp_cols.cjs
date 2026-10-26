const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function testDept() {
  const r = await fetch(url + '/rest/v1/employees?select=id,first_name,last_name,employee_code,work_email,department_name,avatar_url,user_id&limit=1', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const res = await r.json();
  console.log('Result with department_name:', res);

  const r2 = await fetch(url + '/rest/v1/employees?select=id,first_name,last_name,employee_code,work_email,avatar_url,user_id&limit=1', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const res2 = await r2.json();
  console.log('Result without department_name:', res2);
}
testDept();
