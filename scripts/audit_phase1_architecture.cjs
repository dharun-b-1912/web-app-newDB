const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function audit() {
  const tables = [
    'biometric_devices',
    'attendance_punches',
    'attendance_daily',
    'attendance_breaks',
    'attendance_break_logs',
    'break_policies',
    'attendance_policies',
    'attendance_shifts',
    'shifts',
    'notification_events',
    'notification_outbox',
    'employee_device_tokens',
    'communication_dispatch_logs',
    'user_profiles',
    'user_roles',
    'permissions'
  ];

  const results = {};

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      results[table] = { exists: false, error: error.message };
    } else {
      results[table] = {
        exists: true,
        columns: data && data.length > 0 ? Object.keys(data[0]) : 'empty table'
      };
    }
  }

  // Check Electra EV biometric device in biometric_devices
  const { data: eevDevs, error: devErr } = await supabase
    .from('biometric_devices')
    .select('*')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');

  // Check Electra EV shifts
  const { data: eevShifts } = await supabase
    .from('attendance_shifts')
    .select('*')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');

  // Check Electra EV attendance policies
  const { data: eevPolicies } = await supabase
    .from('attendance_policies')
    .select('*')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');

  console.log(JSON.stringify({
    tables: results,
    eevDevices: eevDevs,
    eevShifts: eevShifts,
    eevPolicies: eevPolicies
  }, null, 2));
}

audit().catch(console.error);

