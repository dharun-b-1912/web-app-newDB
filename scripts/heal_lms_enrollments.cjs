const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function healEnrollments() {
  const cRes = await fetch(`${url}/rest/v1/lms_courses?select=*`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const courses = await cRes.json();

  const eRes = await fetch(`${url}/rest/v1/employees?select=id,first_name,last_name,organization_id&deleted_at=is.null`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const emps = await eRes.json();
  console.log(`Found ${courses.length} courses and ${emps.length} active employees.`);

  for (const crs of courses) {
    const enrRes = await fetch(`${url}/rest/v1/lms_enrollments?course_id=eq.${crs.id}&select=id`, {
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    });
    const existing = await enrRes.json();
    console.log(`Course "${crs.title}" (${crs.id}) has ${existing.length} existing enrollments.`);

    if (existing.length === 0) {
      console.log(`Enrolling ${emps.length} employees into "${crs.title}"...`);
      const payload = emps.map(e => ({
        organization_id: crs.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
        course_id: crs.id,
        employee_id: e.id,
        progress_percentage: 0,
        status: 'ENROLLED'
      }));

      const ins = await fetch(`${url}/rest/v1/lms_enrollments`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      const insData = await ins.json();
      console.log(`Enrolled into "${crs.title}":`, insData.length || insData);
    }
  }
}

healEnrollments();
