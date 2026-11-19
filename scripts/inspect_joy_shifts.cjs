const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc'
);

async function inspectJoyShifts() {
  const { data } = await s
    .from('shifts')
    .select('*')
    .eq('organization_id', '0c621892-e938-4707-9957-13534ea32c19');

  console.log('Joy Corporate shifts:');
  data.forEach((d) => {
    console.log({
      id: d.id,
      name: d.name,
      code: d.code,
      start_time: d.start_time,
      end_time: d.end_time,
      grace_entry_minutes: d.grace_entry_minutes,
      created_at: d.created_at,
    });
  });
}

inspectJoyShifts();

