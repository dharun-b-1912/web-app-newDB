import { supabase } from '../src/lib/supabase';

async function test() {
  const { data: p1 } = await supabase.from('attendance_punches').select('*').limit(5);
  console.log('attendance_punches count:', p1?.length, p1?.[0]);

  const { data: p2 } = await supabase.from('biometric_punches').select('*').limit(5);
  console.log('biometric_punches count:', p2?.length, p2?.[0]);

  const { data: p3 } = await supabase.from('attendance_daily').select('*').eq('attendance_date', '2026-10-16');
  console.log('attendance_daily for 2026-10-16:', p3?.length, p3?.[0]);

  process.exit(0);
}

test();
