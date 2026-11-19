require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanBavithra() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';

  // 1. Check organization record
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, primary_admin_name, primary_admin_email, primary_admin_phone')
    .eq('id', orgId)
    .single();

  console.log('Org Details:', org, 'Err:', orgErr);

  // 2. Check employee record
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, work_email, organization_id')
    .eq('organization_id', orgId);

  console.log('Employees in Electra EV:', emps, 'Err:', empErr);

  // 3. If there is a mock employee record for Bavithra, remove it from employees table
  if (emps && emps.length > 0) {
    for (const e of emps) {
      if (e.work_email?.toLowerCase().includes('bavithra') || e.first_name?.toLowerCase().includes('bavithra') || e.employee_code === 'WF-6115') {
        console.log('Removing mock employee record:', e.id, e.first_name, e.employee_code);
        const { error: delErr } = await supabase
          .from('employees')
          .delete()
          .eq('id', e.id);
        console.log('Delete result error:', delErr);
      }
    }
  }

  // 4. Verify headcount in Electra EV
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  console.log('Final Electra EV employee count:', count);
}

cleanBavithra();

