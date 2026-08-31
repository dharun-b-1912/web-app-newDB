import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzU0NjcsImV4cCI6MjEwMjI1MTQ2N30.mRHhiRs7r7q9J3mphaRVyavL4_THkCAzdhD2dqgvnKA';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: invs, error: invErr } = await sb.from('organization_invitations').select('*');
  console.log('Invitations:', invs, invErr);

  const { data: orgs, error: orgErr } = await sb.from('organizations').select('*');
  console.log('Orgs:', orgs, orgErr);
}

run();
