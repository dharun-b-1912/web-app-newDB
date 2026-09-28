const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Test Data', 'JOY SEP IN & OUT.xlsx');
const wb = XLSX.readFile(filePath);

const mrWs = wb.Sheets['MR REPORT'];
const mrRows = XLSX.utils.sheet_to_json(mrWs, { header: 1, defval: '' });
console.log('Total MR rows in Excel:', mrRows.length);
let sumOt = 0;
let sumShifts = 0;
for (let i = 7; i <= 49; i++) {
  const row = mrRows[i];
  sumOt += Number(row[15]) || 0;
  sumShifts += Number(row[16]) || 0;
}
console.log('MR Calculated sum OT (Col P):', sumOt, 'sum Shifts (Col Q):', sumShifts);
console.log('MR Excel Row 51 totals:', mrRows[50].slice(15, 19));

const otWs = wb.Sheets['OT'];
const otRows = XLSX.utils.sheet_to_json(otWs, { header: 1, defval: '' });
console.log('\nTotal OT rows in Excel:', otRows.length);
let sumOtHoursFromDaily = 0;
for (let i = 6; i <= 36; i++) {
  const row = otRows[i];
  sumOtHoursFromDaily += Number(row[37]) || 0;
}
console.log('OT Calculated sum OT (Col AL):', sumOtHoursFromDaily);
console.log('OT Excel Row 38 totals:', otRows[37].slice(36, 39));
