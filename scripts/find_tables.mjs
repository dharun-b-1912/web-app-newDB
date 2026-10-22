import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function main() {
  const tables = [
    'attendance',
    'attendance_logs',
    'attendance_records',
    'punches',
    'raw_punches',
    'biometric_logs',
    'biometric_punches',
    'device_logs',
    'time_entries',
    'clock_ins',
  ];

  for (const t of tables) {
    const { data, error } = await client.from(t).select('*').limit(2);
    if (!error) {
      console.log(`Table exists: ${t}, count sample:`, data?.length);
    }
  }
}

main().catch(console.error);
