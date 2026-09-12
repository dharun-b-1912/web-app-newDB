import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj');

async function main() {
  const orgs = await sb.from('organizations').select('*').limit(2);
  console.log('orgs:', orgs.data, orgs.error);
  const comps = await sb.from('companies').select('*').limit(2);
  console.log('comps:', comps.data, comps.error);
}

main();
