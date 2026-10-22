import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function main() {
  const { data, error } = await client
    .from('employees')
    .select('*')
    .eq('employee_code', 'JCS-20');

  console.log('Error:', error);
  if (data && data.length > 0) {
    console.log('JCS-20 columns:', Object.keys(data[0]));
    console.log('JCS-20 data:', JSON.stringify(data[0], null, 2));
  }
}

main().catch(console.error);
