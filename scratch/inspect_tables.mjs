import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function check() {
  // Check tables: org_designations, master_designations, roles, etc.
  const tables = ['designations', 'org_designations', 'master_designations', 'departments', 'org_departments', 'companies', 'branches'];
  for (const t of tables) {
    const { data, error } = await sb.from(t).select('*').limit(3);
    console.log(t, error ? error.message : data);
  }
}

check();
