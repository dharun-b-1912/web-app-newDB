const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function testInsertPunch() {
  console.log('Testing insert into attendance_punches...');
  const { data: emps } = await supabase.from('employees').select('id, first_name, last_name, organization_id').limit(1);
  console.log('Sample emp:', emps?.[0]);

  if (!emps || emps.length === 0) {
    console.log('No employees found in Supabase.');
    return;
  }

  const emp = emps[0];
  const testPunch = {
    employee_id: emp.id,
    organization_id: emp.organization_id || 'org-1',
    punch_time: new Date().toISOString(),
    punch_type: 'CHECK_IN',
    punch_source: 'FACE_RECOGNITION',
    verification_mode: 'FACE',
    device_id: 'AI_FACE_KIOSK_01',
  };

  const { data, error } = await supabase.from('attendance_punches').insert([testPunch]).select();
  console.log('Insert result:', data, 'Error:', error);

  if (data && data.length > 0) {
    console.log('Clean up test punch...');
    await supabase.from('attendance_punches').delete().eq('id', data[0].id);
    console.log('Cleaned up successfully.');
  }
}

testInsertPunch();
