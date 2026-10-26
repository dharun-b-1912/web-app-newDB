const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const orgId = '0c621892-e938-4707-9957-13534ea32c19';
const dharunUserId = 'a64cc800-7219-472c-bcea-2b572959f457';
const courseId = 'ebe141d0-8726-4086-aa68-0c9d0a8a1598';

async function main() {
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
      recipient_user_id: dharunUserId,
      channel: 'IN_APP',
      title: 'Training Reminder: Workplace Safety 2026',
      message: 'Your mandatory training "Workplace Safety, Ergonomics & Emergency Evacuation 2026" is pending. Please watch the video and complete the assessment on your Mobile or Web app.',
      action_url: `/lms/course/${courseId}`,
      is_read: false,
      is_sent: false,
      created_at: new Date().toISOString()
    })
  });
  console.log('Insert status:', notifRes.status);
  const data = await notifRes.json();
  console.log('Result:', data);
}

main().catch(console.error);
