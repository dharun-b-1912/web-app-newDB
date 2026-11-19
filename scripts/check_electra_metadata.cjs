const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';

async function checkMetadata() {
  const { data: deps } = await supabase.from('departments').select('id, name').eq('organization_id', orgId);
  const { data: desigs } = await supabase.from('designations').select('id, title').eq('organization_id', orgId);

  console.log('Electra EV Departments in DB:', deps?.map(d => d.name));
  console.log('Electra EV Designations in DB:', desigs?.map(d => d.title));
}

checkMetadata();
