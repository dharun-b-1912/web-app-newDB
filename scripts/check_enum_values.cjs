require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEnums() {
  const { data, error } = await supabase.rpc('get_enum_values', { enum_name: 'employment_type_enum' });
  console.log('Enum values RPC:', data, error);

  // If RPC doesn't exist, let's query pg_enum
  const { data: qData, error: qErr } = await supabase
    .from('employees')
    .select('employment_type')
    .limit(10);
  console.log('Existing employment_type values in DB:', qData, qErr);
}

checkEnums();

