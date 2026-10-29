import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function dump() {
  console.log('=== LEAVE TYPES ===');
  const { data: types } = await supabase.from('leave_types').select('*');
  console.log(JSON.stringify(types, null, 2));

  console.log('\n=== LEAVE REQUESTS ===');
  const { data: reqs } = await supabase.from('leave_requests').select('*');
  console.log(JSON.stringify(reqs, null, 2));

  console.log('\n=== LEAVE BALANCES ===');
  const { data: balances } = await supabase.from('leave_balances').select('*');
  console.log(JSON.stringify(balances, null, 2));
}

dump();
