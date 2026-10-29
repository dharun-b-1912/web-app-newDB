import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function testSlot(slot, date) {
  console.log(`\n=== Testing slot: ${slot} on date: ${date} ===`);
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/attendance-report-dispatcher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      slot,
      mode: 'MANUAL_TEST',
      organization_id: '0c621892-e938-4707-9957-13534ea32c19',
      date,
      requesterPhone: '919840209900',
    }),
  });

  const json = await resp.json().catch(() => null);
  console.log(`Status HTTP: ${resp.status}`);
  console.log('Result:', {
    success: json?.success,
    error: json?.error,
    slot: json?.slot,
    date: json?.date,
    headcount: json?.headcount,
    turnout: json?.turnout,
    attachments: json?.attachments,
  });
  return json;
}

async function run() {
  await testSlot('DAILY', '2026-10-28');
  await testSlot('WEEKLY', '2026-10-28');
  await testSlot('MONTHLY', '2026-10-28');
  await testSlot('EVENING', '2026-10-28');
}

run();
