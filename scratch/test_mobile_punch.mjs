import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc'
);

async function run() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr'
  });
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  console.log('✅ Auth success, user ID:', auth.user.id);

  // 1. Fetch assigned work locations for Dharun
  const { data: locs, error: locErr } = await supabase.rpc('fn_get_my_assigned_work_locations');
  console.log('Assigned locations:', locs, locErr);

  if (locs && locs.length > 0) {
    const loc = locs[0];
    console.log(`Testing with location: ${loc.name} (${loc.latitude}, ${loc.longitude})`);

    // Call fn_record_attendance_punch with the EXACT coordinates
    const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_record_attendance_punch', {
      p_latitude: loc.latitude,
      p_longitude: loc.longitude,
      p_accuracy: 5,
      p_punch_type: 'IN',
      p_reason: null,
      p_device_info: {
        deviceId: 'FLUTTER_MOBILE',
        client: 'JOY PeopleHR Mobile v1.0',
        source: 'MOBILE',
        punch_source: 'MOBILE',
        isMock: false
      }
    });

    console.log('--- RPC RESULT ---');
    console.log('Data:', rpcData);
    console.log('Error:', rpcErr);
  }
}

run();
