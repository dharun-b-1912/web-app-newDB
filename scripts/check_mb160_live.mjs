import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data } = await supabase.from('biometric_devices').select('*').eq('serial_number', 'JNP2263200782');
  console.log('MB160 Device Record:');
  console.log(data?.[0]);

  // Also check if any punches came from this device in attendance_punches
  const { data: punches } = await supabase
    .from('attendance_punches')
    .select('*')
    .eq('device_id', data?.[0]?.id)
    .order('punch_time', { ascending: false })
    .limit(5);

  console.log('\nPunches recorded for this device:', punches?.length || 0);
  punches?.forEach(p => console.log(p));
}

check();
