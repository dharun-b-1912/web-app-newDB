import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

async function testFetchAll21() {
  const { data: emps } = await admin.from('employees').select('id, employee_code, first_name, last_name, display_name');
  const { data: assigns } = await admin.from('employee_salary_assignments').select('*').eq('organization_id', ORG_ID);
  const { data: banks } = await admin.from('employee_bank_details').select('*').eq('organization_id', ORG_ID);
  const { data: stats } = await admin.from('employee_statutory_details').select('*').eq('organization_id', ORG_ID);
  const { data: structs } = await admin.from('salary_structures').select('*').eq('organization_id', ORG_ID);

  console.log(`Employees: ${emps.length}`);
  console.log(`Salary Assignments: ${assigns.length}`);
  console.log(`Bank Records: ${banks.length}`);
  console.log(`Statutory Records: ${stats.length}`);
  console.log(`Salary Structures: ${structs.length}`);

  const totalGross = assigns.reduce((acc, a) => acc + Number(a.monthly_gross || 0), 0);
  console.log(`\nTOTAL 21-STAFF MONTHLY GROSS: ₹${totalGross.toLocaleString('en-IN')}`);
}

testFetchAll21();
