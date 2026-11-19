const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc'
);

async function testQuery() {
  const targetOrg = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const companyId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';

  let q = s.from('employees').select('*');
  q = q.eq('organization_id', targetOrg);
  q = q.eq('company_id', companyId);

  const { data, error } = await q;
  console.log('Query returned count:', data ? data.length : 0, 'Error:', error);
}

testQuery();

