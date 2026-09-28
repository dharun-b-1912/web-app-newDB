import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function inspectAllEmps() {
  const { data } = await supabase.from('employees').select('*');
  console.log(JSON.stringify(data, null, 2));
}

inspectAllEmps();
