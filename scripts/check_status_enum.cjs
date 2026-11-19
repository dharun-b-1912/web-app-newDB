const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkStatusEnum() {
  const { data, error } = await supabase.rpc('get_enum_values', { enum_type: 'employment_status_enum' });
  console.log('RPC result:', data, error);

  const { data: rows, error: rErr } = await supabase.from('employees').select('employment_status').limit(10);
  console.log('Sample employment_status:', rows, rErr);
}

checkStatusEnum();
