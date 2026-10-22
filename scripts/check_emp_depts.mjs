import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/)[1];
const sb = createClient(url, key);

async function run() {
  const { data: depts } = await sb.from('departments').select('id, name, code');
  const deptMap = Object.fromEntries((depts || []).map(d => [d.id, d.name]));
  const { data: emps } = await sb.from('employees').select('id, employee_code, display_name, first_name, last_name, department_id');
  console.log('Employees and their departments in Supabase:');
  (emps || []).forEach(e => {
    console.log(`${e.employee_code} | ${e.display_name || (e.first_name + ' ' + e.last_name)} | dept_id: ${e.department_id} -> ${deptMap[e.department_id] || 'NOT_FOUND'}`);
  });
}
run();
