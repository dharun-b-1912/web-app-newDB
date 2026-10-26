const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const courseId = 'ebe141d0-8726-4086-aa68-0c9d0a8a1598';

async function main() {
  const res = await fetch(`${url}/rest/v1/lms_enrollments?course_id=eq.${courseId}&select=*`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const data = await res.json();
  console.log('Enrollments for course count:', data.length);
  if (data.length > 0) {
    console.log('First enrollment sample:', data[0]);
  }
}

main().catch(console.error);
