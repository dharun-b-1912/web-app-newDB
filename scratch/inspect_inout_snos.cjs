const XLSX = require('xlsx');
const wb = XLSX.readFile('Test Data/JOY SEP IN & OUT.xlsx');

const inOutSheet = wb.Sheets['IN&OUT'];
const inOutData = XLSX.utils.sheet_to_json(inOutSheet, { header: 1 });

console.log('=== IN&OUT SHEET S.Nos ===');
const inOutSnos = [];
const inOutEmps = [];
for (let i = 7; i < inOutData.length; i++) {
  const r = inOutData[i];
  if (!r) continue;
  if (r[0] && typeof r[0] === 'number') {
    inOutSnos.push(r[0]);
    inOutEmps.push({ sno: r[0], empId: r[1], name: r[2] });
  }
}
console.log('Count of distinct employee header rows in IN&OUT:', inOutSnos.length);
console.log('S.Nos in IN&OUT:', inOutSnos);
for (let i = 1; i <= 44; i++) {
  if (!inOutSnos.includes(i)) console.log('IN&OUT Missing S.No:', i);
}
