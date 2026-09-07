import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: invs, error: invErr } = await sb.from('organization_invitations').select('*');
  console.log('Invitations:', invs, invErr);

  const { data: orgs, error: orgErr } = await sb.from('organizations').select('*');
  console.log('Orgs:', orgs, orgErr);
}

run();
