import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function main() {
  const { data: mgr, error } = await client
    .from('employees')
    .select('id, employee_code, display_name, first_name, last_name, work_email, designation_id')
    .eq('id', '55f486f8-e3aa-4133-9e85-dfc519ed2825')
    .maybeSingle();

  console.log('Manager:', mgr, 'Error:', error);
}

main().catch(console.error);
