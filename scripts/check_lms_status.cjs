const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function check() {
  const cRes = await fetch(url + '/rest/v1/lms_courses?select=*&order=created_at.desc&limit=5', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const courses = await cRes.json();
  console.log('Courses:', JSON.stringify(courses, null, 2));

  const eRes = await fetch(url + '/rest/v1/employees?select=id,first_name,last_name,status,employment_status,organization_id&limit=10', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const emps = await eRes.json();
  console.log('Employees:', JSON.stringify(emps, null, 2));

  const enrRes = await fetch(url + '/rest/v1/lms_enrollments?select=*&limit=10', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const enrs = await enrRes.json();
  console.log('Enrollments count:', enrs.length, enrs);
}
check();
