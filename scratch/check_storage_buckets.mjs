import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking Supabase Storage Buckets...');
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    console.log('Buckets found:', buckets.map(b => ({ id: b.id, name: b.name, public: b.public })));
  }

  // Check employee Danya R (JCS-154)
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, display_name, avatar_url')
    .or('employee_code.ilike.%154%,first_name.ilike.%Danya%');
  
  if (empErr) {
    console.error('Error fetching employee:', empErr);
  } else {
    console.log('Employee matching Danya:', emps);
  }

  // Check attendance_punches for today
  const today = new Date().toISOString().split('T')[0];
  const { data: punches, error: punchErr } = await supabase
    .from('attendance_punches')
    .select('id, employee_id, punch_time, punch_type, punch_source, verification_mode, device_id')
    .gte('punch_time', `${today}T00:00:00Z`);

  if (punchErr) {
    console.error('Error fetching punches:', punchErr);
  } else {
    console.log(`Punches found for today (${punches.length}):`, punches);
  }
}

check();
