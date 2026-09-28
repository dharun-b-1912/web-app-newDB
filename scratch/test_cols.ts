import { supabase } from '../src/lib/supabase';

async function checkCols() {
  const { data, error } = await supabase.from('vendor_attendance_records').select('*').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
}

checkCols().catch(console.error);
