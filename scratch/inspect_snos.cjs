const XLSX = require('xlsx');
const wb = XLSX.readFile('Test Data/JOY SEP IN & OUT.xlsx');

const mrSheet = wb.Sheets['MR REPORT'];
const mrData = XLSX.utils.sheet_to_json(mrSheet, { header: 1 });

console.log('=== MR REPORT EMPLOYEES ===');
const snos = [];
const empIds = [];
for (let i = 7; i < mrData.length; i++) {
  const r = mrData[i];
  if (!r || !r[1]) continue;
  if (/TOTAL/i.test(String(r[1]))) break;
  snos.push(r[0]);
  empIds.push({ sno: r[0], empId: String(r[1]).trim(), name: r[2], dept: r[4], present: r[5], ot: r[15] || r[16] || 0 });
}

console.log('Count of rows:', empIds.length);
console.log('S.Nos:', snos);
console.log('Missing S.Nos between 1 and 44:');
for (let i = 1; i <= 44; i++) {
  if (!snos.includes(i)) console.log('Missing S.No:', i);
}

const otSheet = wb.Sheets['OT'];
const otData = XLSX.utils.sheet_to_json(otSheet, { header: 1 });
console.log('\n=== OT SHEET EMPLOYEES ===');
const otRows = [];
for (let i = 6; i < otData.length; i++) {
  const r = otData[i];
  if (!r || !r[1]) continue;
  if (/TOTAL/i.test(String(r[1])) || /^\s*$/.test(String(r[1]))) break;
  otRows.push({ sno: r[0], empId: String(r[1]).trim(), name: r[2], totalOt: r[37] || r[r.length - 2] });
}
console.log('OT count:', otRows.length);
console.log('Last OT row:', otData[37]?.slice(0, 10));
console.log('OT Total row (row 38):', otData[38]?.slice(35, 40));
