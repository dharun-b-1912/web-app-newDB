import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function getSchema() {
  // Get all columns from employees table
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .limit(1);
  
  if (data && data.length > 0) {
    console.log('Employee columns:', Object.keys(data[0]).join(', '));
    console.log('\nFull sample employee:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('Error or no data:', error?.message);
    // Try without any filter
    const { data: d2, error: e2 } = await supabase
      .from('employees')
      .select('id, first_name, last_name, company_id, employment_status')
      .limit(3);
    console.log('With employment_status:', d2, e2?.message);
  }
}

getSchema().catch(console.error);
