const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const orgId = '0c621892-e938-4707-9957-13534ea32c19';
const videoId = 'sBws8MSXN7A';
const passingPercentage = 80;

const questions = [
  {
    id: 'q1',
    question: 'What is the recommended monitor viewing distance for proper workplace ergonomics?',
    options: [
      "At arm's length (approx 20-30 inches)",
      '10 inches away from your face',
      '50 inches away on another table',
      'Directly touching the desk surface'
    ],
    correctIndex: 0
  },
  {
    id: 'q2',
    question: 'In the event of a fire alarm or emergency evacuation, which of the following is strictly prohibited?',
    options: [
      'Using the building elevators / lifts',
      'Following illuminated exit signs to emergency stairs',
      'Proceeding calmly to the designated outdoor assembly point',
      'Assisting colleagues with mobility impairments'
    ],
    correctIndex: 0
  },
  {
    id: 'q3',
    question: 'When lifting heavy equipment or packages, which posture prevents lower back injury?',
    options: [
      'Bending at the knees and lifting with the leg muscles',
      'Bending solely at the waist with straight legs',
      'Twisting the spine abruptly while lifting',
      'Holding the load as far away from the chest as possible'
    ],
    correctIndex: 0
  },
  {
    id: 'q4',
    question: 'How soon should a workplace hazard, spillage, or near-miss incident be reported to Facilities/HR?',
    options: [
      'Immediately or within the same work shift',
      'Only if someone requires hospitalization',
      'At the annual appraisal meeting',
      'Never, unless specifically asked'
    ],
    correctIndex: 0
  }
];

async function main() {
  console.log('1. Inserting course into lms_courses...');
  const courseCode = `YT:${videoId}:${passingPercentage}`;
  const coursePayload = {
    organization_id: orgId,
    title: 'Workplace Safety, Ergonomics & Emergency Evacuation 2026',
    code: courseCode,
    category: 'Safety & Compliance',
    is_mandatory: true,
    duration_minutes: 15,
    is_active: true
  };

  const insertRes = await fetch(`${url}/rest/v1/lms_courses`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(coursePayload)
  });

  let courseId;
  const inserted = await insertRes.json();
  if (Array.isArray(inserted) && inserted.length > 0) {
    courseId = inserted[0].id;
    console.log('✅ Course created with ID:', courseId);
  } else {
    const existingRes = await fetch(`${url}/rest/v1/lms_courses?organization_id=eq.${orgId}&code=eq.${courseCode}&select=id`, {
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    });
    const existing = await existingRes.json();
    courseId = existing[0]?.id;
    console.log('✅ Using existing course ID:', courseId);
  }

  // 2. Upload metadata + assessment JSON to lms-content bucket
  console.log('2. Uploading assessment JSON to lms-content bucket...');
  const assessmentPayload = {
    courseId: courseId,
    videoId: videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    passingPercentage: passingPercentage,
    description: 'Mandatory annual training module covering physical workplace safety, screen ergonomics, and emergency building evacuation protocols.',
    questions: questions,
    createdAt: new Date().toISOString()
  };

  const uploadRes = await fetch(`${url}/storage/v1/object/lms-content/courses/${courseId}/assessment.json`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      'x-upsert': 'true'
    },
    body: JSON.stringify(assessmentPayload)
  });
  console.log('Upload status:', uploadRes.status);

  // 3. Auto-enroll active employees (including Dharun B)
  console.log('3. Enrolling active employees...');
  const empRes = await fetch(`${url}/rest/v1/employees?select=id,first_name,last_name,employee_code`, {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const employees = await empRes.json();
  console.log('Employees result isArray:', Array.isArray(employees), 'Length or error:', Array.isArray(employees) ? employees.length : employees);

  const enrollments = employees.map(emp => ({
    organization_id: orgId,
    course_id: courseId,
    employee_id: emp.id,
    progress_percentage: 0,
    status: 'ENROLLED'
  }));

  const enrRes = await fetch(`${url}/rest/v1/lms_enrollments`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(enrollments)
  });

  const enrData = await enrRes.json();
  console.log(`✅ Successfully enrolled ${Array.isArray(enrData) ? enrData.length : 0} employees!`);

  // 4. Send a test reminder notification for Dharun B to test mobile notification delivery!
  const dharun = employees.find(e => e.first_name && e.first_name.toLowerCase().includes('dharun'));
  if (dharun) {
    console.log(`4. Sending mobile reminder notification for Dharun B (${dharun.id})...`);
    const notifRes = await fetch(`${url}/rest/v1/notification_events`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        organization_id: orgId,
        recipient_user_id: dharun.id,
        channel: 'LMS_REMINDER',
        title: 'Training Pending: Workplace Safety 2026',
        message: 'Your mandatory training "Workplace Safety, Ergonomics & Emergency Evacuation 2026" is pending. Please watch the video and complete the assessment on your Mobile or Web app.',
        action_url: `/lms/course/${courseId}`,
        is_read: false,
        is_sent: false,
        created_at: new Date().toISOString()
      })
    });
    const notifData = await notifRes.json();
    console.log('✅ Notification event created:', notifData);
  }
}

main().catch(console.error);
