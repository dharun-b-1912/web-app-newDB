import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

async function verifyReadiness() {
  const { data: emps } = await admin.from('employees').select('*');
  const { data: assigns } = await admin.from('employee_salary_assignments').select('*').eq('organization_id', ORG_ID);
  const { data: banks } = await admin.from('employee_bank_details').select('*').eq('organization_id', ORG_ID);
  const { data: stats } = await admin.from('employee_statutory_details').select('*').eq('organization_id', ORG_ID);
  const { data: structs } = await admin.from('salary_structures').select('*').eq('organization_id', ORG_ID);

  console.log('=== VERIFICATION OF REAL SUPABASE DATA ===');
  console.log(`Employees in DB: ${emps.length}`);
  console.log(`Salary Assignments in DB: ${assigns.length}`);
  console.log(`Bank Records in DB: ${banks.length}`);
  console.log(`Statutory Records in DB: ${stats.length}`);
  console.log(`Salary Structures in DB: ${structs.length}`);

  const bankMap = new Map(banks.map(b => [b.employee_id, b]));
  const statMap = new Map(stats.map(s => [s.employee_id, s]));
  const assignMap = new Map(assigns.map(a => [a.employee_id, a]));

  let missingBankCount = 0;
  let missingAssignCount = 0;
  let missingStatCount = 0;

  emps.forEach(e => {
    if (!bankMap.has(e.id)) missingBankCount++;
    if (!assignMap.has(e.id)) missingAssignCount++;
    if (!statMap.has(e.id)) missingStatCount++;
  });

  console.log(`Employees missing bank details: ${missingBankCount}`);
  console.log(`Employees missing salary assignments: ${missingAssignCount}`);
  console.log(`Employees missing statutory details: ${missingStatCount}`);

  const totalGross = assigns.reduce((acc, a) => acc + Number(a.monthly_gross || 0), 0);
  console.log(`Total Monthly Gross for 21 staff: ₹${totalGross.toLocaleString('en-IN')}`);
}

verifyReadiness();
