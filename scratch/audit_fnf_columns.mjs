import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCols(table, candidates) {
  const verified = [];
  for (const c of candidates) {
    const { error } = await supabase.from(table).select(c).limit(1);
    if (!error) {
      verified.push(c);
    }
  }
  console.log(`\nTable [${table}] columns (${verified.length}):`, verified.join(', '));
}

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  await checkCols('fnf_settlements', [
    'id', 'organization_id', 'separation_id', 'employee_id',
    'gross_payable', 'total_gross_settlement', 'gross_amount',
    'total_recoveries', 'total_deductions_settlement', 'total_deductions',
    'net_payable', 'net_settlement_payable', 'net_amount',
    'pending_salary', 'unpaid_salary_amount',
    'leave_encashment_amount', 'gratuity_amount',
    'notice_recovery_amount', 'notice_shortfall_recovery',
    'asset_recovery_amount', 'asset_recovery_deduction',
    'loan_recovery_amount', 'loan_outstanding_recovery',
    'statutory_deductions',
    'status', 'payment_status',
    'approved_by', 'approved_at',
    'settled_at', 'settlement_date', 'payment_reference',
    'created_at', 'updated_at'
  ]);

  await checkCols('employee_separations', [
    'id', 'organization_id', 'employee_id',
    'separation_type', 'type',
    'resignation_date', 'requested_last_working_date', 'approved_last_working_date',
    'expected_last_working_date', 'actual_last_working_date', 'last_working_date',
    'notice_period_days', 'notice_period_required_days',
    'notice_waiver_days', 'notice_buyout_days', 'shortfall_days',
    'reason', 'reason_text',
    'status', 'approved_by', 'approved_at',
    'completed_at', 'created_at', 'updated_at'
  ]);
}

main();
