import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const serviceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data, error } = await supabase
    .from('sentinel_incidents')
    .select('incident_number, severity, lifecycle_state, acknowledged_by, acknowledged_at')
    .eq('incident_number', 'INC-20261114-0001');

  console.log('Incident State after /ack command:', data, error);
}

check();
