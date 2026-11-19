const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc'
);

async function f() {
  const { data, error } = await s
    .from('employees')
    .select('id, employee_code, company_id, employment_type')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');

  if (error) {
    console.error('Error:', error);
    return;
  }
  const compMap = {};
  data.forEach((d) => {
    compMap[d.company_id] = (compMap[d.company_id] || 0) + 1;
  });
  console.log('Total fetched:', data.length);
  console.log('Company distribution:', compMap);
}
f();

