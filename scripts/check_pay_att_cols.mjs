import { supabase } from '../src/lib/supabase.ts';

async function check() {
  const { data: pay, error: pErr } = await supabase.from('payslips').select('*').limit(1);
  console.log('payslips cols:', pay ? Object.keys(pay[0] || {}) : null, pErr);
  const { data: att, error: aErr } = await supabase.from('attendance_daily').select('*').limit(1);
  console.log('attendance_daily cols:', att ? Object.keys(att[0] || {}) : null, aErr);
}

check();
