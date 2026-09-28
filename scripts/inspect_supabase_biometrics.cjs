const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function inspect() {
  console.log('--- 1. Querying attendance_punches ---');
  const { data: punches, error: punchErr } = await supabase.from('attendance_punches').select('*').limit(10);
  console.log('Punches count:', punches?.length, 'Error:', punchErr?.message);
  if (punches && punches.length > 0) {
    console.log(punches);
  }

  console.log('\n--- 2. Querying biometric_devices in Supabase ---');
  const { data: devs, error: devErr } = await supabase.from('biometric_devices').select('*');
  console.log('Devs count:', devs?.length, 'Error:', devErr?.message);
  if (devs && devs.length > 0) {
    console.log(devs);
  }
}

inspect();
