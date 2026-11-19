const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function removeDevice() {
  const serial = 'EEV263200991';
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';

  // 1. Check existing device
  const { data: devices, error: findErr } = await supabase
    .from('biometric_devices')
    .select('*')
    .or(`serial_number.eq.${serial},organization_id.eq.${orgId}`);

  console.log('Found devices for Electra EV or serial:', devices);

  // 2. Delete any punches referencing this device
  if (devices && devices.length > 0) {
    for (const dev of devices) {
      const { data: delPunches, error: pErr } = await supabase
        .from('attendance_punches')
        .delete()
        .eq('device_id', dev.id);
      if (pErr) console.warn('Punch delete warning:', pErr);
    }
  }

  // 3. Delete the device from biometric_devices
  const { data: delResult, error: delErr } = await supabase
    .from('biometric_devices')
    .delete()
    .eq('serial_number', serial);

  if (delErr) {
    console.error('Delete error by serial:', delErr);
  } else {
    console.log('Successfully deleted device with serial:', serial);
  }

  // Also ensure all devices for Electra EV are removed if requested
  const { data: delOrgDevs, error: delOrgErr } = await supabase
    .from('biometric_devices')
    .delete()
    .eq('organization_id', orgId);

  if (delOrgErr) {
    console.error('Delete error by orgId:', delOrgErr);
  } else {
    console.log('Successfully cleared all biometric devices for Electra EV:', orgId);
  }

  // 4. Verify biometric_devices for Electra EV
  const { data: remaining } = await supabase
    .from('biometric_devices')
    .select('*')
    .eq('organization_id', orgId);

  console.log('Remaining devices for Electra EV:', remaining);
}

removeDevice();

