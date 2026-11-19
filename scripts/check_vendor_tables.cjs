const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function check() {
  const { data: vWorkers, error: wErr } = await supabase.from('vendor_workers').select('*').limit(1);
  console.log('vendor_workers keys:', Object.keys(vWorkers?.[0] || {}), 'Err:', wErr?.message);

  const { data: vAssignments, error: aErr } = await supabase.from('vendor_employee_assignments').select('*').limit(1);
  console.log('vendor_employee_assignments keys:', Object.keys(vAssignments?.[0] || {}), 'Err:', aErr?.message);
}
check();

