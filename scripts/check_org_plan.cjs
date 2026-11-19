const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc');

async function run() {
  const { data, error } = await s.from('organizations').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Total organizations:', data.length);
  data.forEach(org => {
    console.log(`Org: ${org.name} | ID: ${org.id} | Slug: ${org.slug} | Plan: ${org.plan || org.subscription_plan || 'N/A'}`);
  });
}
run();
