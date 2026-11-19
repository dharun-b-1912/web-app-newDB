const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function list() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const depRes = await fetch(SUPABASE_URL + '/rest/v1/departments?organization_id=eq.' + orgId, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
  });
  const deps = await depRes.json();
  console.log('Departments:');
  deps.forEach(d => console.log(`  ${d.id} | ${d.name}`));

  const desRes = await fetch(SUPABASE_URL + '/rest/v1/designations?organization_id=eq.' + orgId, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
  });
  const desigs = await desRes.json();
  console.log('Designations:');
  desigs.forEach(d => console.log(`  ${d.id} | ${d.title}`));
}

list().catch(console.error);

