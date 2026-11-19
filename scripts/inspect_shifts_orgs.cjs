const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc'
);

async function checkShifts() {
  const { data, error } = await s.from('shifts').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log(`Total shifts in DB: ${data.length}`);
  data.forEach((sh) => {
    console.log({
      id: sh.id,
      name: sh.name || sh.shift_name,
      code: sh.code || sh.shift_code,
      organization_id: sh.organization_id,
      start_time: sh.start_time,
      end_time: sh.end_time,
      grace_entry_minutes: sh.grace_entry_minutes,
      grace_exit_minutes: sh.grace_exit_minutes,
    });
  });
}

checkShifts();

