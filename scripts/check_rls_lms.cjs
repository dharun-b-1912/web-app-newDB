const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function checkPolicies() {
  const q = `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename IN ('lms_courses', 'lms_enrollments', 'employees');
  `;
  // check pg via rpc or test insert with anon key
  const anonKey = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
  
  // Test insert into lms_enrollments with service_role vs anonKey
  console.log('Testing anon key query on lms_enrollments...');
  const testRes = await fetch(`${url}/rest/v1/lms_enrollments?select=*&limit=1`, {
    headers: { apikey: anonKey, Authorization: 'Bearer ' + anonKey }
  });
  console.log('Anon key read lms_enrollments status:', testRes.status);
  const data = await testRes.json();
  console.log('Data:', data);
}
checkPolicies();
