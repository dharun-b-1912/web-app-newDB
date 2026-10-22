const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj');

async function test() {
  await supabase.auth.signInWithPassword({ email: 'marimuthu@joycorporatesolutions.com', password: 'joypeoplehr' });

  const empRes = await supabase.from('employees').select('id, first_name, last_name, phone').ilike('first_name', '%DHARUN%').single();

  const punches = await supabase.from('attendance_punches')
    .select('*')
    .eq('employee_id', empRes.data.id)
    .gte('punch_time', '2026-10-14T00:00:00Z')
    .order('punch_time', { ascending: true });
  console.log('Dharun today punches (gte 2026-10-14T00:00:00Z):', punches.data);
}

test();
