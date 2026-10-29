import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspectSchedules() {
  const { data, error } = await sb.from('attendance_report_schedules').select('*');
  console.log('Schedules count:', data?.length, 'error:', error);
  console.log('Schedules:', JSON.stringify(data, null, 2));

  const { data: recipients } = await sb.from('mis_report_recipients').select('*');
  console.log('Recipients in DB:', recipients);
}

inspectSchedules();
