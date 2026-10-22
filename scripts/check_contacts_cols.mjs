import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function main() {
  const { data: contacts } = await client.from('employee_emergency_contacts').select('*').limit(2);
  console.log('employee_emergency_contacts sample:', contacts);

  const { data: docData } = await client.from('employee_documents').select('*').limit(2);
  console.log('employee_documents sample:', docData);
}

main().catch(console.error);
