import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkPolicies() {
  const { data: policies, error } = await admin.rpc('get_policies', { table_name: 'designations' }).catch(() => ({ data: null }));
  
  // If rpc doesn't exist, query pg_policies via sql or inspect
  const { data, error: rawErr } = await admin.from('designations').select('*').limit(1);
  console.log('Sample designation:', data);

  // Check if there is an RPC for running SQL or inspect policies
  // Let's check available RPCs
  const { data: rpcs } = await admin.rpc('fn_mutate_employee', {
    p_employee_id: '00000000-0000-0000-0000-000000000000',
    p_patch: {},
    p_expected_version: null,
    p_actor_id: 'test'
  }).catch(e => ({ error: e }));
  console.log('RPC test:', rpcs);
}

checkPolicies();
