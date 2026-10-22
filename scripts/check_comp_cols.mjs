import { supabase } from '../src/lib/supabase.ts';

async function check() {
  const { data: comp, error: cErr } = await supabase.from('companies').select('*').limit(1);
  console.log('companies:', comp ? Object.keys(comp[0] || {}) : null, cErr);
  const { data: desig, error: dErr } = await supabase.from('designations').select('*').limit(1);
  console.log('designations:', desig ? Object.keys(desig[0] || {}) : null, dErr);
}

check();
