const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function inspectDevices() {
  const { data: devices, error } = await sb.from('biometric_devices').select('*');
  console.log('All biometric devices in DB:', { count: devices?.length, error });
  if (devices && devices.length > 0) {
    console.table(devices.map(d => ({
      id: d.id,
      name: d.device_name,
      sn: d.serial_number,
      ip: d.ip_address,
      org_id: d.organization_id,
      branch_id: d.branch_id,
      active: d.is_active,
      last_sync: d.last_sync_at || d.last_heartbeat_at
    })));
  }

  // Also check sentinel incidents for ADMS
  const { data: incidents } = await sb.from('sentinel_incidents')
    .select('id, incident_type, error_code, error_message, raw_payload, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('Recent sentinel incidents:', incidents);
}

inspectDevices();
