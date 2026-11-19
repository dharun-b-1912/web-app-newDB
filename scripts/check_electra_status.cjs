const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspect() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const { data: org, error: orgErr } = await supabase.from('organizations').select('*').eq('id', orgId).single();
  console.log('Org keys:', Object.keys(org || {}));
  console.log('Org data:', org);

  const { data: empSample, error: empErr } = await supabase.from('employees').select('*').eq('organization_id', orgId).limit(2);
  console.log('Emp err:', empErr);
  if (empSample && empSample.length > 0) {
    console.log('Emp keys:', Object.keys(empSample[0]));
    console.log('Emp 0:', empSample[0]);
  }

  const { count, error: cErr } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
  console.log('Total count for Electra EV in DB:', count);
}
inspect();
