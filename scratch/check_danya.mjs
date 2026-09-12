import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });
if (!process.env.VITE_SUPABASE_URL) dotenv.config({ path: '.env.local' });
if (!process.env.VITE_SUPABASE_URL) dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: allEmps } = await supabase.from('employees').select('id, employee_code, first_name, last_name, display_name');
  console.log('Total employees:', allEmps?.length);
  const matching = allEmps?.filter(e => JSON.stringify(e).toLowerCase().includes('danya'));
  console.log('Matching Danya in employees:', matching);

  const { data: recentPunches } = await supabase
    .from('attendance_punches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('Recent punches in DB:', recentPunches);

  const { data: recentDaily } = await supabase
    .from('attendance_daily')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('Recent attendance_daily in DB:', recentDaily);
}
check().catch(console.error);
