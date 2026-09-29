import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc'
);

async function run() {
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr'
  });
  console.log('✅ Auth success, user ID:', auth.user.id);

  // 1. Test direct insert into attendance_punches (fallback path)
  const { data: punchData, error: punchErr } = await supabase.from('attendance_punches').insert({
    employee_id: '0ce6436c-e9b4-4e0e-9102-93ea238be0df',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    punch_time: new Date().toISOString(),
    punch_type: 'OUT',
    punch_source: 'MOBILE'
  }).select();

  console.log('Direct Insert Result:', punchData ? 'SUCCESS (id: ' + punchData[0]?.id + ')' : 'FAIL', punchErr);

  // Clean up the direct insert test punch
  if (punchData && punchData.length > 0) {
    await supabase.from('attendance_punches').delete().eq('id', punchData[0].id);
    console.log('Cleaned up direct insert test punch');
  }

  // 2. Test Check-out via RPC
  const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_record_attendance_punch', {
    p_latitude: 11.0844364,
    p_longitude: 77.1262627,
    p_accuracy: 5,
    p_punch_type: 'OUT',
    p_reason: 'End of shift test',
    p_device_info: {
      deviceId: 'FLUTTER_MOBILE',
      client: 'JOY PeopleHR Mobile v1.0',
      source: 'MOBILE',
      punch_source: 'MOBILE',
      isMock: false
    }
  });

  console.log('RPC Check-Out Result:', rpcData, rpcErr);
}

run();
