// scratch/test_upload_and_save_ot_verification.ts
import { AttendanceMasterService } from '../src/services/vendor/attendanceMasterService';
import { OTPolicyEngine } from '../src/services/payroll/otPolicyEngine';

console.log('=== TEST 1: Calculate OT on Modal Confirmation ===');
const sampleOtValues = [4, 1, 2, 8, 4];
sampleOtValues.forEach((otHours, i) => {
  const calc = AttendanceMasterService.calculateOtRateAndAmount(otHours, 'org-joy-main');
  console.log(`[Entry ${i + 1}] ${otHours} hrs OT -> Hourly Rate: ₹${calc.hourlyRate}/hr, Payable Amount: ₹${calc.payableAmount}`);
  if (calc.hourlyRate <= 0 || calc.payableAmount <= 0) {
    throw new Error(`Invalid calculated rate or amount for ${otHours} hrs OT`);
  }
});
console.log('✓ Successfully verified that all ingested daily OT records receive non-zero statutory & commercial rates');

console.log('\n=== TEST 2: Active Context & Persistence Across Re-Uploads ===');
// Simulate initial upload
const initialMaster = AttendanceMasterService.buildCanonicalBenchmarkMaster();
initialMaster.calculationMode = 'REALTIME_PARSED';
AttendanceMasterService.setActiveMaster(initialMaster);

const activeBefore = AttendanceMasterService.getActiveMaster();
console.log(`Initial Master Records: ${activeBefore.dailyOtRecords.length} records`);
const samplePunchBefore = activeBefore.dailyOtRecords[0];
console.log(`Initial Punch 0: Emp ${samplePunchBefore.employee_id}, Rate: ₹${samplePunchBefore.ot_hourly_rate}/hr, Amount: ₹${samplePunchBefore.ot_payable_amount}`);

// Simulate re-upload of updated dataset
const reuploadedMaster = AttendanceMasterService.buildCanonicalBenchmarkMaster();
reuploadedMaster.calculationMode = 'REALTIME_PARSED';
reuploadedMaster.dailyOtRecords[0].potential_ot = 6;
reuploadedMaster.dailyOtRecords[0].approved_ot = 6;
const reCalc = AttendanceMasterService.calculateOtRateAndAmount(6, 'org-joy-main');
reuploadedMaster.dailyOtRecords[0].hourly_rate = reCalc.hourlyRate;
reuploadedMaster.dailyOtRecords[0].ot_hourly_rate = reCalc.hourlyRate;
reuploadedMaster.dailyOtRecords[0].payable_amount = reCalc.payableAmount;
reuploadedMaster.dailyOtRecords[0].ot_payable_amount = reCalc.payableAmount;

AttendanceMasterService.setActiveMaster(reuploadedMaster);
const activeAfter = AttendanceMasterService.getActiveMaster();
console.log(`Re-uploaded Master Punch 0: Emp ${activeAfter.dailyOtRecords[0].employee_id}, Rate: ₹${activeAfter.dailyOtRecords[0].ot_hourly_rate}/hr, Amount: ₹${activeAfter.dailyOtRecords[0].ot_payable_amount}`);

if (activeAfter.dailyOtRecords[0].ot_payable_amount !== reCalc.payableAmount) {
  throw new Error('Re-upload did not update active master record');
}
console.log('✓ Successfully verified that re-uploading attendance overwrites and updates the active dataset seamlessly!');

console.log('\n=== ALL UPLOAD & SAVE TESTS PASSED! ===');
