import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function probeBank() {
  const { data: emps } = await admin.from('employees').select('id, employee_code, first_name, last_name');
  const { data: bData } = await admin.from('employee_bank_details').select('*');
  const { data: sData } = await admin.from('employee_statutory_details').select('*');
  console.log(`Employees: ${emps?.length}`);
  console.log(`Bank records: ${bData?.length}`);
  console.log(`Statutory records: ${sData?.length}`);

  const bankEmpIds = new Set(bData?.map(b => b.employee_id) || []);
  const statEmpIds = new Set(sData?.map(s => s.employee_id) || []);

  const missingBank = emps?.filter(e => !bankEmpIds.has(e.id));
  console.log(`Employees missing bank details (${missingBank?.length}):`, missingBank?.map(e => `[${e.employee_code}] ${e.first_name}`));

  const missingStat = emps?.filter(e => !statEmpIds.has(e.id));
  console.log(`Employees missing statutory details (${missingStat?.length}):`, missingStat?.map(e => `[${e.employee_code}] ${e.first_name}`));
}

probeBank();
