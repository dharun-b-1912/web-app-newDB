const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const list = [
  'lms_courses', 'lms_enrollments', 'lms_programs', 'lms_sessions', 'lms_modules',
  'lms_lessons', 'lms_assessments', 'lms_questions', 'lms_attempts', 'lms_certifications',
  'lms_certificates', 'lms_feedback', 'lms_trainers', 'lms_skills',
  'training_courses', 'training_programs', 'training_sessions', 'training_enrollments',
  'training_assessments', 'training_certificates',
  'employee_trainings', 'employee_courses', 'course_enrollments', 'course_completions'
];

async function run() {
  for (const t of list) {
    const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    if (res.status === 200) {
      console.log(`EXISTS: ${t}`);
    }
  }
}

run();
