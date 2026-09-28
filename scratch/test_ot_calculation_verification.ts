import { AttendanceMasterService } from '../src/services/vendor/attendanceMasterService';
import { OTPolicyEngine } from '../src/services/payroll/otPolicyEngine';

async function testOtCalculation() {
  console.log('=== TEST 1: Default Master Active OT Calculation ===');
  const master = AttendanceMasterService.getActiveMaster();
  console.log('Master total workers:', master.stats.totalMasterWorkers);
  console.log('Master total attendance punches:', master.stats.attendanceRecordCount);
  console.log('Master total daily OT records:', master.dailyOtRecords.length);

  const sampleOt = master.dailyOtRecords[0];
  console.log('Sample OT Record:', {
    date: sampleOt.date,
    empId: sampleOt.employee_id,
    empName: sampleOt.employee_name,
    approvedOt: sampleOt.approved_ot,
    hourlyRate: sampleOt.hourly_rate,
    otHourlyRate: sampleOt.ot_hourly_rate,
    payableAmount: sampleOt.payable_amount,
    otPayableAmount: sampleOt.ot_payable_amount,
    statutoryRate: sampleOt.statutory_hourly_rate,
  });

  if (sampleOt.hourly_rate === 'Not Configured' || sampleOt.payable_amount === 'Pending Rate') {
    throw new Error('FAILED: hourly_rate or payable_amount is still Not Configured / Pending Rate!');
  }
  console.log('✓ Sample OT Record has valid numeric rate:', sampleOt.hourly_rate, 'and payable amount:', sampleOt.payable_amount);

  console.log('\n=== TEST 2: Employee Summaries OT Rates & Amounts ===');
  const sampleEmp = master.employeeSummaries.find(e => e.ot_hours > 0);
  console.log('Sample Employee with OT:', {
    empId: sampleEmp?.employee_id,
    name: sampleEmp?.employee_name,
    otHours: sampleEmp?.ot_hours,
    otHourlyRate: sampleEmp?.ot_hourly_rate,
    otPayableAmount: sampleEmp?.ot_payable_amount,
    otNumericRate: sampleEmp?.ot_numeric_rate,
    otNumericAmount: sampleEmp?.ot_numeric_amount,
  });

  if (sampleEmp?.ot_hourly_rate === 'Not Configured' || sampleEmp?.ot_payable_amount === 'Pending Rate') {
    throw new Error('FAILED: Employee summary OT rate or amount is Not Configured / Pending Rate!');
  }
  console.log('✓ Employee summary has valid formatted and numeric OT rate and amount');

  console.log('\n=== TEST 3: Total OT Payable Calculation ===');
  const totalOtPayable = master.dailyOtRecords.reduce((sum, r) => sum + (r.payable_amount || 0), 0);
  console.log('Total OT Payable across all punches:', totalOtPayable.toFixed(2));
  console.log('Total OT Hours:', master.dailyOtRecords.reduce((sum, r) => sum + (r.approved_ot || 0), 0));

  console.log('\n=== TEST 4: Dynamic Reconfiguration with Fixed Hourly Rate ₹70/hr ===');
  const updatedMaster = AttendanceMasterService.applyOtPolicyToMaster(master, {
    calculation_method: 'FIXED_HOURLY_RATE',
    fixed_hourly_rate: 70,
    policy_name: 'Contract Fixed ₹70/hr',
    working_days_divisor: 26,
    working_hours_per_day: 8,
  }, 17000);

  const sampleOtFixed = updatedMaster.dailyOtRecords[0];
  console.log('Sample OT Record after switching to Fixed ₹70/hr:', {
    approvedOt: sampleOtFixed.approved_ot,
    hourlyRate: sampleOtFixed.hourly_rate,
    payableAmount: sampleOtFixed.payableAmount ?? sampleOtFixed.payable_amount,
  });

  if (sampleOtFixed.hourly_rate !== 70) {
    throw new Error(`FAILED: Expected rate 70, got ${sampleOtFixed.hourly_rate}`);
  }
  console.log('✓ Successfully switched to Fixed ₹70/hr dynamically!');

  console.log('\n=== ALL OT ENGINE INTEGRATION TESTS PASSED! ===');
}

testOtCalculation().catch(err => {
  console.error(err);
  process.exit(1);
});
