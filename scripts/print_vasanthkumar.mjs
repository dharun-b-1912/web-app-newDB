import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/)[1];
const sb = createClient(url, key);

async function run() {
  const { data: emps, error } = await sb.from('employees').select('*').eq('employee_code', 'JCS-018');
  console.log('Vasanthkumar row from Supabase:');
  console.log(JSON.stringify(emps, null, 2));
}
run();
