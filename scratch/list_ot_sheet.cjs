const XLSX = require('xlsx');
const wb = XLSX.readFile('Test Data/JOY SEP IN & OUT.xlsx');
const otSheet = wb.Sheets['OT'];
const otData = XLSX.utils.sheet_to_json(otSheet, { header: 1 });
console.log('--- All rows from sheet OT ---');
for (let i = 6; i <= 36; i++) {
  const r = otData[i];
  if (!r) continue;
  const sno = r[0];
  const empId = r[1];
  const name = r[2];
  const totalOt = r[37]; // col AL (37 in 0-indexed)
  const otDays = r[38];  // col AM
  console.log(`OT Row ${i+1}: SNo=${sno}, ID=${empId}, Name=${name}, TotalOT=${totalOt}, Days=${otDays}`);
}
