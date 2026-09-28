import { OTPolicyEngine } from '../src/services/payroll/otPolicyEngine';
import { AttendanceMasterService } from '../src/services/vendor/attendanceMasterService';

async function testOtDynamicSync() {
  console.log('--- 1. Testing Default OT Rate ---');
  const defaultMaster = AttendanceMasterService.getActiveMaster();
  const firstDefaultRec = defaultMaster.dailyOtRecords[0];
  console.log('Default First Daily OT Record:', {
    employee_id: firstDefaultRec.employee_id,
    potential_ot: firstDefaultRec.potential_ot,
    hourly_rate: firstDefaultRec.hourly_rate,
    payable_amount: firstDefaultRec.payable_amount,
  });

  console.log('\n--- 2. Saving 2.0x Dynamic Multiplier OT Policy (as in Payroll Settings) ---');
  const saveResult = await OTPolicyEngine.savePolicy({
    organization_id: 'default',
    company_id: 'default',
    policy_name: 'Standard Company Overtime Policy (2.0x)',
    calculation_method: 'DYNAMIC_MULTIPLIER',
    salary_basis: 'MONTHLY_GROSS',
    working_days_divisor: 26,
    working_hours_per_day: 8,
    company_multiplier: 2.0,
    government_calculation_method: 'DYNAMIC_MULTIPLIER',
    government_multiplier: 2.0,
    statutory_standard_preset: 'FACTORIES_ACT_1948',
    enforce_50_percent_wage_rule: false,
    statutory_quarterly_ot_limit: 115,
    statutory_spreadover_hours_limit: 10.5,
    statutory_max_daily_ot_hours: 4.0,
    effective_from: '2026-08-01',
    status: 'ACTIVE',
  });

  if (!saveResult.success || !saveResult.policy) {
    throw new Error('Policy save failed: ' + JSON.stringify(saveResult.errors));
  }
  console.log('Saved Policy:', saveResult.policy.id, saveResult.policy.policy_name, saveResult.policy.company_multiplier);

  console.log('\n--- 3. Testing Resolution of Active Policy ---');
  const resolved = OTPolicyEngine.resolvePolicyForDate({ companyId: 'org-joy-main' });
  console.log('Resolved Policy for org-joy-main:', {
    id: resolved.id,
    name: resolved.policy_name,
    multiplier: resolved.company_multiplier,
  });

  if (resolved.company_multiplier !== 2.0) {
    throw new Error(`Expected resolved multiplier 2.0, got ${resolved.company_multiplier}`);
  }

  console.log('\n--- 4. Applying Policy to Master Dataset ---');
  const updatedMaster = AttendanceMasterService.applyOtPolicyToMaster(defaultMaster, saveResult.policy, 17000);
  const firstUpdatedRec = updatedMaster.dailyOtRecords[0];
  console.log('Updated First Daily OT Record:', {
    employee_id: firstUpdatedRec.employee_id,
    potential_ot: firstUpdatedRec.potential_ot,
    hourly_rate: firstUpdatedRec.hourly_rate,
    payable_amount: firstUpdatedRec.payable_amount,
  });

  // Verify rate: 17000 / 26 / 8 = 81.730769... * 2.0 = 163.46
  if (firstUpdatedRec.hourly_rate !== 163.46) {
    throw new Error(`Expected hourly rate 163.46, got ${firstUpdatedRec.hourly_rate}`);
  }

  // 4 hrs * 163.46 = 653.84 or 653.85 (rounded to 653.85)
  console.log('Payable amount for 4 hrs:', firstUpdatedRec.payable_amount);
  if (Math.abs(firstUpdatedRec.payable_amount - 653.85) > 0.05) {
    throw new Error(`Expected payable amount ~653.85, got ${firstUpdatedRec.payable_amount}`);
  }

  console.log('\n--- 5. Testing Policies List for Dropdown Selector ---');
  const allPolicies = OTPolicyEngine.getPolicies();
  console.log('Available Policies in Selector:', allPolicies.map(p => ({
    id: p.id,
    name: p.policy_name,
    method: p.calculation_method,
    multiplier: p.company_multiplier,
    fixed_rate: p.fixed_hourly_rate,
  })));

  if (allPolicies.length < 3) {
    throw new Error('Expected at least 3 policies in available list');
  }

  console.log('\n✓ ALL TESTS PASSED: Dynamic OT Policy Synchronization verified successfully!');
}

testOtDynamicSync().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
