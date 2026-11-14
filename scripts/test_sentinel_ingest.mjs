import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const serviceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
  console.log('Testing fn_sentinel_ingest_event...');
  const { data, error } = await supabase.rpc('fn_sentinel_ingest_event', {
    p_event_code: 'NOTIF-001',
    p_severity: 'P1',
    p_service_name: 'Airtel IQ Gateway',
    p_message: 'Biometric check-in SMS payload rejected by Airtel gateway',
    p_source_location: 'supabase/functions/adms-gateway/index.ts',
    p_diagnostic_payload: {
      http_status: 400,
      reason: 'Unsupported parameter priority: HIGH in prepaid endpoint',
      recipient_sample: '919384125278'
    },
    p_probable_cause: 'Prepaid endpoint https://iqsms.airtel.in/api/v1/send-prepaid-sms does not accept "priority" field.',
    p_recommended_action: 'Remove "priority" field from request body in adms-gateway and airtelSmsClient.ts.'
  });

  console.log('RPC result 1 (First occurrence):', { data, error });

  // Test deduplication (second occurrence of same event)
  const { data: data2, error: error2 } = await supabase.rpc('fn_sentinel_ingest_event', {
    p_event_code: 'NOTIF-001',
    p_severity: 'P1',
    p_service_name: 'Airtel IQ Gateway',
    p_message: 'Biometric check-in SMS payload rejected by Airtel gateway',
    p_source_location: 'supabase/functions/adms-gateway/index.ts',
    p_diagnostic_payload: {
      http_status: 400,
      reason: 'Unsupported parameter priority: HIGH in prepaid endpoint',
      recipient_sample: '919944399088'
    },
    p_probable_cause: 'Prepaid endpoint https://iqsms.airtel.in/api/v1/send-prepaid-sms does not accept "priority" field.',
    p_recommended_action: 'Remove "priority" field from request body in adms-gateway and airtelSmsClient.ts.'
  });

  console.log('RPC result 2 (Aggregated occurrence):', { data: data2, error: error2 });

  // Query sentinel_incidents
  const { data: incidents, error: incErr } = await supabase.from('sentinel_incidents').select('*');
  console.log('Current Sentinel Incidents:', incidents);
}

test();
