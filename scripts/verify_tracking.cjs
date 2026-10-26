const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function testTracking() {
  const cRes = await fetch(`${url}/rest/v1/lms_courses?title=eq.Test&select=id,title`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const courses = await cRes.json();
  const testCourse = courses[0];
  console.log('Test course:', testCourse);

  const enrRes = await fetch(`${url}/rest/v1/lms_enrollments?course_id=eq.${testCourse.id}&select=*`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const enrollments = await enrRes.json();
  console.log(`Enrollments for "${testCourse.title}":`, enrollments.length);

  const empIds = enrollments.map(e => e.employee_id);
  const empRes = await fetch(`${url}/rest/v1/employees?select=id,first_name,last_name,employee_code,work_email,avatar_url,user_id&id=in.(${empIds.join(',')})`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const emps = await empRes.json();
  console.log(`Employees matched:`, emps.length);
  console.log('Sample employee:', emps[0]);
}

testTracking();
