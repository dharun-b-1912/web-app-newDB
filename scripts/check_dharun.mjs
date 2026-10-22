import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkDharun() {
  const { data: dharun } = await admin.from('employees').select('*').eq('employee_code', 'JCS-017').single();
  console.log('Dharun emp:', dharun?.id, dharun?.employee_code, dharun?.first_name, dharun?.last_name);
  const { data: sal } = await admin.from('employee_salary_assignments').select('*').eq('employee_id', dharun.id);
  console.log('Dharun salary assignments:', sal);
  const { data: stat } = await admin.from('employee_statutory_details').select('*').eq('employee_id', dharun.id);
  console.log('Dharun statutory:', stat);

  // Also check payroll items / slips if any
  const { data: items } = await admin.from('payroll_items').select('*').eq('employee_id', dharun.id).limit(5);
  console.log('Payroll items:', items);
}

checkDharun();
