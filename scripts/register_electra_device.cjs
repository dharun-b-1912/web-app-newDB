const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function registerElectraDevice() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const branchId = 'f192e38e-6ee2-44c2-ad6a-d87cb85992cb';
  const serialNumber = 'JNP2263200782';

  // Check if exists
  const { data: existing } = await sb.from('biometric_devices').select('*').eq('serial_number', serialNumber);
  console.log('Existing device with SN JNP2263200782:', existing);

  if (existing && existing.length > 0) {
    const { data: upd, error: updErr } = await sb.from('biometric_devices')
      .update({
        organization_id: orgId,
        branch_id: branchId,
        device_name: 'eSSL MB160 — Plant Main Gate (4G FDLTE)',
        ip_address: '100.109.56.254',
        port: 4370,
        protocol: 'TCP',
        direction: 'BOTH',
        is_active: true,
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing[0].id)
      .select();
    console.log('Updated existing device:', { upd, updErr });
  } else {
    const { data: ins, error: insErr } = await sb.from('biometric_devices').insert({
      organization_id: orgId,
      branch_id: branchId,
      device_name: 'eSSL MB160 — Plant Main Gate (4G FDLTE)',
      serial_number: serialNumber,
      ip_address: '100.109.56.254',
      port: 4370,
      protocol: 'TCP',
      direction: 'BOTH',
      is_active: true,
      last_heartbeat_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select();
    console.log('Inserted new device for Electra EV:', { ins, insErr });
  }

  // Verify
  const { data: allDevs } = await sb.from('biometric_devices').select('*');
  console.log('All biometric devices now in DB:');
  console.table(allDevs.map(d => ({
    id: d.id,
    name: d.device_name,
    sn: d.serial_number,
    ip: d.ip_address,
    org_id: d.organization_id,
    branch_id: d.branch_id,
    is_active: d.is_active,
    last_heartbeat: d.last_heartbeat_at
  })));
}

registerElectraDevice();

