const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);

if (!urlMatch || !keyMatch) {
  console.error('Missing supabase env');
  process.exit(1);
}

const sb = createClient(urlMatch[1], keyMatch[1]);

async function main() {
  const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });
  console.log('Auth error:', authErr, 'User ID:', authData?.user?.id);

  const { data: dept, error: deptErr } = await sb.from('departments').select('*').eq('id', '70d63528-7aa9-4630-adcc-b7a6194250cd');
  console.log('Target Dept 70d63528:', dept, 'Error:', deptErr);

  const { data: allDepts } = await sb.from('departments').select('id, name, code, company_id');
  console.log('All departments:', allDepts);

  const { data: emps, error: empErr } = await sb.from('employees').select('*');
  console.log('Found employees count:', emps?.length, 'empErr:', empErr);
  const danya = emps?.find(e => e.employee_code === 'JCS-154' || (e.first_name && e.first_name.toLowerCase().includes('danya')));
  console.log('Danya record:', danya);
}

main().catch(console.error);
