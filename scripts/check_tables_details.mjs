import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const { data: esa, error: err1 } = await supabase.from('employee_shift_assignments').select('*').limit(2);
  console.log('--- employee_shift_assignments ---');
  if (err1) console.error(err1);
  else console.log(JSON.stringify(esa, null, 2));

  const { data: ar, error: err2 } = await supabase.from('attendance_regularizations').select('*').limit(2);
  console.log('--- attendance_regularizations ---');
  if (err2) console.error(err2);
  else console.log(JSON.stringify(ar, null, 2));

  const { data: rules, error: err3 } = await supabase.from('attendance_rules').select('*').limit(2);
  console.log('--- attendance_rules ---');
  if (err3) console.error(err3);
  else console.log(JSON.stringify(rules, null, 2));
}

run();
