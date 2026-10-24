const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc'
);

async function main() {
  const { data, error } = await sb.from('mis_report_recipients').select('*');
  console.log('Error:', error);
  console.log('Recipients Count:', data?.length);
  console.log('Recipients:', JSON.stringify(data, null, 2));
}

main();
