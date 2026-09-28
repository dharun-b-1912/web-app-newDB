const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('Test Data/JOY SEP IN & OUT.xlsx');
const otSheet = wb.Sheets['OT'];
const otData = XLSX.utils.sheet_to_json(otSheet, { header: 1 });

const headerRow = otData[5];
console.log('Dates header row:', headerRow.slice(6, 37));

const otRecords = [];
for (let i = 6; i <= 36; i++) {
  const r = otData[i];
  if (!r) continue;
  const sno = r[0];
  const empId = String(r[1]).trim();
  const name = String(r[2]).trim();
  const dept = String(r[4] || '').trim();
  const totalOt = Number(r[37]) || 0;
  const otDays = Number(r[38]) || 0;

  const dailyOt = {};
  for (let c = 6; c <= 36; c++) {
    const day = headerRow[c];
    const val = Number(r[c]);
    if (val && val > 0) {
      const dayNum = parseInt(day, 10);
      const isoDate = dayNum >= 26
        ? `2026-08-${String(dayNum).padStart(2, '0')}`
        : `2026-09-${String(dayNum).padStart(2, '0')}`;
      dailyOt[isoDate] = val;
    }
  }

  otRecords.push({
    sno,
    employeeId: empId,
    employeeName: name,
    department: dept,
    totalOt,
    otDays,
    dailyOt,
  });
}

console.log('Total extracted OT records:', otRecords.length);
const sumOt = otRecords.reduce((s, r) => s + r.totalOt, 0);
console.log('Sum of totalOt:', sumOt);
fs.writeFileSync('scratch/exact_ot_records.json', JSON.stringify(otRecords, null, 2));
