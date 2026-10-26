const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const candidateColumns = [
  'id', 'organization_id', 'title', 'code', 'category', 'description',
  'is_mandatory', 'duration_minutes', 'duration_hours', 'is_active', 'status',
  'youtube_url', 'youtube_video_id', 'video_url', 'thumbnail_url',
  'modules', 'questions', 'assessment', 'metadata', 'passing_percentage',
  'passing_score', 'max_attempts', 'due_date', 'target_departments', 'created_at', 'updated_at'
];

async function probe() {
  const existingCourseCols = [];
  for (const col of candidateColumns) {
    const res = await fetch(`${url}/rest/v1/lms_courses?select=${col}&limit=1`, {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    if (res.status === 200) {
      existingCourseCols.push(col);
    }
  }
  console.log('Existing lms_courses columns:', existingCourseCols);

  const candidateEnrollmentColumns = [
    'id', 'organization_id', 'course_id', 'employee_id', 'employee_name',
    'progress_percentage', 'progress_percent', 'score', 'status',
    'certificate_url', 'completed_at', 'created_at', 'updated_at',
    'watch_status', 'furthest_second_watched', 'attempts_count', 'answers', 'metadata'
  ];
  const existingEnrollmentCols = [];
  for (const col of candidateEnrollmentColumns) {
    const res = await fetch(`${url}/rest/v1/lms_enrollments?select=${col}&limit=1`, {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    if (res.status === 200) {
      existingEnrollmentCols.push(col);
    }
  }
  console.log('Existing lms_enrollments columns:', existingEnrollmentCols);
}

probe().catch(console.error);
