import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function testRpcs() {
  const rpcs = ['exec_sql', 'execute_sql', 'run_sql', 'sql'];
  for (const r of rpcs) {
    const { data, error } = await admin.rpc(r, { sql: 'SELECT 1;' });
    console.log(`RPC ${r}:`, error ? error.message : 'EXISTS! data=' + JSON.stringify(data));
  }
}

testRpcs();
