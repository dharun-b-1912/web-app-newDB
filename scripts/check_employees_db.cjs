const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const url = process.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'mock';
const supabase = createClient(url, key);

(async () => {
  const { data, error } = await supabase.from('employees').select('id, employee_code, first_name, last_name, employment_status');
  if (error) { console.error('Supabase error:', error.message); return; }
  console.log('Total employees in DB:', data.length);
  const active = data.filter(e => (e.employment_status || 'ACTIVE').toUpperCase() === 'ACTIVE');
  console.log('Active count:', active.length);
  const nonActive = data.filter(e => (e.employment_status || 'ACTIVE').toUpperCase() !== 'ACTIVE');
  console.log('Non-Active:', nonActive.map(e => ({ code: e.employee_code, name: e.first_name, emp_status: e.employment_status })));
})();
