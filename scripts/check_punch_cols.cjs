const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc');

async function run() {
  const joyOrg = '0c621892-e938-4707-9957-13534ea32c19';
  const { data, error } = await s.from('attendance_punches').insert({
    organization_id: joyOrg,
    punch_time: new Date().toISOString(),
    punch_source: 'BIOMETRIC_UNMAPPED',
    punch_type: 'CHECK_IN'
  }).select();
  console.log('Insert test with null employee_id:', data, error);
}
run();
