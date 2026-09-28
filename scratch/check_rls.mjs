import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function checkRLS() {
  console.log('--- Checking RLS policies ---');
  const { data: comps, error: compErr } = await supabase.from('companies').select('*');
  console.log('Companies (anon):', comps?.length, compErr?.message);
  
  const { data: emps, error: empErr } = await supabase.from('employees').select('id, company_id, first_name').limit(5);
  console.log('Employees (anon):', emps?.length, empErr?.message);
  
  const { data: depts, error: deptErr } = await supabase.from('departments').select('*');
  console.log('Departments (anon):', depts?.length, deptErr?.message);
  
  const { data: desigs, error: desigErr } = await supabase.from('designations').select('*');
  console.log('Designations (anon):', desigs?.length, desigErr?.message);
  
  const { data: branches, error: branchErr } = await supabase.from('branches').select('*');
  console.log('Branches (anon):', branches?.length, branchErr?.message);
}

checkRLS();
