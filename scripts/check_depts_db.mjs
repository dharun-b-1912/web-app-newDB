import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function main() {
  const { data: dept } = await client
    .from('departments')
    .select('*')
    .eq('id', '0cdef8b4-014c-4487-895c-cf264824a0da')
    .maybeSingle();

  console.log('Thirumalai department:', dept);

  const { data: allDepts } = await client
    .from('departments')
    .select('id, name, code, head_employee_id');
  console.log('All departments:', allDepts);
}

main().catch(console.error);
