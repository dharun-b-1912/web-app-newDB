import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('--- Checking employee profiles in DB ---');
  const { data: profs } = await admin.from('employee_profiles').select('*');
  console.log('Profiles count:', profs?.length);
  if (profs?.length) console.log('Sample profile columns:', Object.keys(profs[0]));

  console.log('\n--- Checking employee documents in DB ---');
  const { data: docs } = await admin.from('employee_documents').select('id, employee_id, document_type');
  console.log('Docs count:', docs?.length);

  console.log('\n--- Checking compensation/salaries in other tables ---');
  // Check any table with salary or payroll
  const tables = ['salary_structures', 'employee_salaries', 'employee_salary_assignments', 'payroll_items', 'payroll_runs'];
  for (const t of tables) {
    const { data, error } = await admin.from(t).select('*').limit(3);
    console.log(`Table ${t}: error=${error?.message || 'none'}, count=${data?.length}`);
  }
}

run();
