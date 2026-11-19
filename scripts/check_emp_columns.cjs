require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEmpColumns() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .limit(1);

  if (data && data.length > 0) {
    console.log('Columns on employees table:');
    console.log(Object.keys(data[0]));
  } else {
    // Let's query information_schema or a dummy row
    const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name: 'employees' });
    console.log('RPC cols:', cols, colErr);
  }
}

checkEmpColumns();

