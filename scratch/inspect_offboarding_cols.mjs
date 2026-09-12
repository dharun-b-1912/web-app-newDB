import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectColumnsOf(table, candidates) {
  const existing = [];
  for (const c of candidates) {
    const { error } = await supabase.from(table).select(c).limit(1);
    if (!error) {
      existing.push(c);
    }
  }
  console.log(`\nTable [${table}] verified columns:`, existing);
}

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  await inspectColumnsOf('employee_separations', [
    'id', 'organization_id', 'employee_id', 'separation_type', 'resignation_date',
    'requested_last_working_date', 'approved_last_working_date', 'notice_period_days',
    'shortfall_days', 'reason', 'status', 'approved_by', 'approved_at',
    'hr_remarks', 'exit_interview_status', 'created_at', 'updated_at'
  ]);

  await inspectColumnsOf('separation_clearances', [
    'id', 'organization_id', 'separation_id', 'department', 'department_name',
    'cleared_by', 'status', 'remarks', 'cleared_at', 'pending_dues',
    'recovery_amount', 'created_at', 'updated_at'
  ]);

  await inspectColumnsOf('separation_asset_recoveries', [
    'id', 'organization_id', 'separation_id', 'asset_id', 'asset_name',
    'serial_number', 'condition', 'recovery_status', 'damage_deduction_amount',
    'recovered_by', 'recovered_at', 'remarks', 'created_at', 'updated_at'
  ]);

  await inspectColumnsOf('fnf_settlements', [
    'id', 'organization_id', 'separation_id', 'employee_id', 'settlement_number',
    'settlement_date', 'status', 'gross_payable', 'total_recoveries', 'net_payable',
    'pending_salary', 'leave_encashment_amount', 'gratuity_amount', 'bonus_amount',
    'notice_recovery_amount', 'asset_recovery_amount', 'loan_recovery_amount',
    'statutory_deductions', 'approved_by', 'approved_at', 'settled_at', 'payment_reference',
    'created_at', 'updated_at'
  ]);

  await inspectColumnsOf('assets', [
    'id', 'organization_id', 'asset_code', 'name', 'asset_type', 'category',
    'status', 'serial_number', 'current_assignee_id', 'assigned_to', 'assigned_at',
    'cost', 'created_at', 'updated_at'
  ]);

  await inspectColumnsOf('employee_lifecycle_events', [
    'id', 'organization_id', 'employee_id', 'event_type', 'effective_date',
    'description', 'metadata', 'created_by', 'created_at'
  ]);
}

main();
