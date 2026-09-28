import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function check() {
  const { data, error } = await sb
    .from('employees')
    .select('*')
    .or('phone.ilike.%9384125278%,first_name.ilike.%Thirumalai%');

  console.log('Error:', error);
  console.log('Employees:', JSON.stringify(data, null, 2));
}

check();
