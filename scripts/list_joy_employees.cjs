const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc');

async function run() {
  const joyOrg = '0c621892-e938-4707-9957-13534ea32c19';
  const { data: emps } = await s.from('employees').select('id, employee_code, first_name, last_name, display_name').eq('organization_id', joyOrg).order('employee_code', { ascending: true });
  console.log('Total Joy Corporate employees in DB:', emps.length);
  emps.forEach((e, i) => {
    console.log(`${i+1}. ${e.employee_code} - ${e.first_name} ${e.last_name}`);
  });
}
run();
