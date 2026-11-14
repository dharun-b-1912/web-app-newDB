import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const anonKey = envConfig.VITE_SUPABASE_ANON_KEY || envConfig.SUPABASE_ANON_KEY;

console.log('Testing RPC call with ANON key...');
const supabase = createClient(supabaseUrl, anonKey);

async function test() {
  const { data, error } = await supabase.rpc('fn_sentinel_ingest_event', {
    p_event_code: 'MOBILE-001',
    p_severity: 'P1',
    p_service_name: 'JOY Mobile App (Flutter)',
    p_message: 'Flutter RenderFlex overflowed by 24 pixels on right',
    p_source_location: 'AttendanceScreen (lib/features/employee/attendance/screens/attendance_screen.dart:142)',
    p_diagnostic_payload: {
      platform: 'Android 14',
      device: 'Samsung Galaxy S23',
      app_version: '1.1.10',
      is_web: false
    },
    p_probable_cause: 'Widget RenderFlex overflow on small screen width.',
    p_recommended_action: 'Wrap row in SingleChildScrollView or use Flexible widget.'
  });

  console.log('Anon RPC Result:', { data, error });
}

test();

