import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectColumns() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  // Try inserting invalid column to see valid columns in PostgREST error, or select non-existent column
  const { error: ledErr } = await supabase.from('leave_ledger_entries').select('non_existent_column').limit(1);
  console.log('leave_ledger_entries error:', ledErr?.message);

  const { error: holErr } = await supabase.from('holidays').select('non_existent_column').limit(1);
  console.log('holidays error:', holErr?.message);
}

inspectColumns();
