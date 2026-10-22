import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function main() {
  const { data: punches, error: punchErr } = await client
    .from('attendance_punches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Recent attendance_punches:', punches);

  const { data: daily, error: dailyErr } = await client
    .from('attendance_daily')
    .select('*')
    .limit(5);
  console.log('attendance_daily:', daily);
}

main().catch(console.error);
