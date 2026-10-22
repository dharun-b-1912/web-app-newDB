import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function main() {
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .or('email.eq.thirumalai@joyglobalcorp.com,auth_user_id.eq.39b0bb69-fa1c-4718-a207-ac1f8b35751f,employee_id.eq.0dc8993f-c0cc-4143-aedc-d4893e41b001');

  console.log('user_profiles for Thirumalai:', data, 'Error:', error);
}

main().catch(console.error);
