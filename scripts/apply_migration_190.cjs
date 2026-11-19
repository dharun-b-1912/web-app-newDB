const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/20261119_190_electra_ev_biometric_break_and_notification_suite.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying Migration 190 via Supabase rpc / execute...');
  
  // Try running via exec_sql / rpc if available, or direct table updates
  let appliedViaRpc = false;
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (!error) {
      console.log('✓ Migration applied successfully via exec_sql RPC.');
      appliedViaRpc = true;
    } else {
      console.log('exec_sql RPC not available (' + error.message + '), executing steps via direct SDK calls...');
    }
  } catch (err) {
    console.log('exec_sql call exception:', err.message);
  }

  // Step-by-step authoritative execution if RPC not present:
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const vendorId = 'efa06c62-4197-4c85-93eb-6d490dfd4302';

  // Step 2: Set biometric_attendance_sms_enabled = false
  const { error: orgErr } = await supabase
    .from('organizations')
    .update({ biometric_attendance_sms_enabled: false })
    .eq('id', orgId);
  if (orgErr) {
    console.warn('Note on organization update (column may need DDL):', orgErr.message);
  } else {
    console.log('✓ Organization biometric_attendance_sms_enabled set to false for Electra EV.');
  }

  // Step 3: Update Electra EV shifts to 4-minute grace
  const { data: updatedShifts, error: shiftErr } = await supabase
    .from('shifts')
    .update({ grace_entry_minutes: 4, grace_exit_minutes: 4, updated_at: new Date().toISOString() })
    .eq('organization_id', orgId)
    .select('id, name, code, grace_entry_minutes');
  if (shiftErr) {
    console.error('Shift update error:', shiftErr);
  } else {
    console.log('✓ Updated Electra EV shifts to 4-min grace period:', updatedShifts);
  }

  // Step 4: Seed Break Policy for Electra EV
  const breakPolicyPayload = {
    id: 'e0b3c419-7432-4d1a-8e2b-f1a23890c001',
    organization_id: orgId,
    policy_name: 'Electra EV Plant Biometric Break Policy',
    scope_type: 'ORGANIZATION',
    precedence_rank: 10,
    automatic_break_minutes: 30,
    automatic_break_after_hours: 5,
    mandatory_breaks: true,
    paid_break_allowance_minutes: 30,
    max_unpaid_break_minutes: 45,
    max_daily_break_minutes: 75,
    max_breaks_per_day: 4,
    grace_period_minutes: 4,
    core_hours_start: '10:00',
    core_hours_end: '16:00',
    breaks_prohibited_in_core_hours: false,
    require_approval_on_exceed: true,
    categories: [
      {
        code: 'TEA_MORNING',
        label: 'Morning Tea Break',
        enabled: true,
        is_paid: true,
        max_occurrences: 1,
        max_duration_minutes: 15,
        grace_period_minutes: 4,
        min_interval_minutes: 90,
        requires_approval: false,
        exception_on_exceed: true
      },
      {
        code: 'LUNCH',
        label: 'Lunch Break',
        enabled: true,
        is_paid: false,
        max_occurrences: 1,
        max_duration_minutes: 45,
        grace_period_minutes: 4,
        min_interval_minutes: 120,
        requires_approval: false,
        exception_on_exceed: true
      },
      {
        code: 'TEA_EVENING',
        label: 'Evening Tea Break',
        enabled: true,
        is_paid: true,
        max_occurrences: 1,
        max_duration_minutes: 15,
        grace_period_minutes: 4,
        min_interval_minutes: 90,
        requires_approval: false,
        exception_on_exceed: true
      },
      {
        code: 'PERSONAL',
        label: 'Personal Break',
        enabled: true,
        is_paid: false,
        max_occurrences: 2,
        max_duration_minutes: 20,
        grace_period_minutes: 4,
        min_interval_minutes: 60,
        requires_approval: true,
        exception_on_exceed: true
      }
    ],
    version: 1,
    effective_from: '2026-01-01',
    status: 'ACTIVE',
    is_default: true,
    updated_at: new Date().toISOString()
  };

  const { data: bpResult, error: bpErr } = await supabase
    .from('break_policies')
    .upsert(breakPolicyPayload, { onConflict: 'id' })
    .select();
  if (bpErr) {
    console.error('Break policy error:', bpErr);
  } else {
    console.log('✓ Seeded Electra EV Break Policy:', bpResult?.[0]?.policy_name);
  }

  // Step 5: Associate all 171 Electra EV workers to Joy Manpower Services Vendor
  const { data: empUpdate, error: empErr } = await supabase
    .from('employees')
    .update({ vendor_id: vendorId, employment_type: 'CONTRACT', updated_at: new Date().toISOString() })
    .eq('organization_id', orgId)
    .select('id');
  if (empErr) {
    console.error('Employee vendor update error:', empErr);
  } else {
    console.log('✓ Successfully associated', empUpdate?.length, 'Electra EV workers to Joy Manpower Services Vendor.');
  }

  // Step 6: Verify final Electra EV status
  const { data: finalOrg } = await supabase.from('organizations').select('id, name, biometric_attendance_sms_enabled').eq('id', orgId).single();
  console.log('Final Org state:', finalOrg);
}

run();

