import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function probe() {
  console.log('1. Checking salary_structures columns');
  const { data: ssData, error: ssErr } = await admin.from('salary_structures').insert([{
    name: 'TEMP_TEST',
    code: 'TEMP_CODE',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19'
  }]).select();
  console.log('salary_structures test insert:', ssData, ssErr);
  if (ssData?.[0]) {
    console.log('salary_structures keys:', Object.keys(ssData[0]));
    await admin.from('salary_structures').delete().eq('id', ssData[0].id);
  }

  console.log('\n2. Checking employee_salary_assignments columns');
  const { data: emps } = await admin.from('employees').select('id').limit(1);
  const { data: sStruct } = await admin.from('salary_structures').insert([{
    name: 'TEMP_TEST_2',
    code: 'TEMP_CODE_2',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19'
  }]).select();

  const { data: esaData, error: esaErr } = await admin.from('employee_salary_assignments').insert([{
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    employee_id: emps[0].id,
    salary_structure_id: sStruct[0].id,
    annual_ctc: 360000,
    monthly_gross: 30000,
    effective_from: '2026-04-01'
  }]).select();
  console.log('employee_salary_assignments test insert:', esaData, esaErr);
  if (esaData?.[0]) {
    console.log('employee_salary_assignments keys:', Object.keys(esaData[0]));
    await admin.from('employee_salary_assignments').delete().eq('id', esaData[0].id);
  }
  await admin.from('salary_structures').delete().eq('id', sStruct[0].id);
}

probe();
