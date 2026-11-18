const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAppVersions() {
  const { data, error } = await supabase.from('app_versions').select('*');
  console.log('app_versions data:', data, error);
}

checkAppVersions().catch(console.error);

