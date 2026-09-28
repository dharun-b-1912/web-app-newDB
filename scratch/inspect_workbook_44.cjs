const XLSX = require('xlsx');
const wb = XLSX.readFile('Test Data/JOY SEP IN & OUT.xlsx');
console.log('Sheet Names:', wb.SheetNames);

// 1. Inspect MR REPORT
const mrSheet = wb.Sheets['MR REPORT'];
const mrData = XLSX.utils.sheet_to_json(mrSheet, { header: 1 });
console.log('\n--- MR REPORT Header & First few rows ---');
mrData.slice(0, 10).forEach((r, idx) => console.log(`Row ${idx}:`, r.slice(0, 15)));

// Find all employees in MR REPORT
const mrEmployees = [];
let totalMrOt = 0;
for (let i = 0; i < mrData.length; i++) {
  const row = mrData[i];
  if (!row) continue;
  // Look for row where col B (or 1) is numeric employee ID or col A is S.No 1..44
  const sno = row[0];
  const empId = row[1];
  const name = row[2];
  if (empId && /^\d+$/.test(String(empId).trim())) {
    mrEmployees.push({
      rowIdx: i + 1,
      sno,
      empId: String(empId).trim(),
      name,
      dept: row[4],
      present: row[5],
      nfh: row[6],
      woff: row[7],
      lop: row[10],
      shifts: row[11],
      otHours: row[16] || row[15] || 0
    });
  }
}
console.log(`Total valid employees in MR REPORT: ${mrEmployees.length}`);
mrEmployees.slice(-5).forEach(e => console.log('MR Emp:', e));

// 2. Inspect IN&OUT
const inOutSheet = wb.Sheets['IN&OUT'];
const inOutData = XLSX.utils.sheet_to_json(inOutSheet, { header: 1 });
console.log('\n--- IN&OUT First few rows ---');
inOutData.slice(0, 10).forEach((r, idx) => console.log(`Row ${idx}:`, r.slice(0, 10)));

const inOutEmpIds = new Set();
let currentEmpId = null;
let currentEmpName = null;
let inOutRowsCount = 0;
for (let i = 5; i < inOutData.length; i++) {
  const row = inOutData[i];
  if (!row || row.length === 0) continue;
  if (row[1] && /^\d+$/.test(String(row[1]).trim())) {
    currentEmpId = String(row[1]).trim();
    currentEmpName = row[2];
  }
  if (currentEmpId && (row[3] || row[0])) {
    inOutEmpIds.add(currentEmpId);
    inOutRowsCount++;
  }
}
console.log(`Total unique employees in IN&OUT: ${inOutEmpIds.size}, total rows: ${inOutRowsCount}`);

// Compare MR vs IN&OUT
const missingInInOut = mrEmployees.filter(e => !inOutEmpIds.has(e.empId));
console.log('\nEmployees in MR REPORT but missing in IN&OUT:');
missingInInOut.forEach(e => console.log('Missing:', e));

// 3. Inspect OT sheet
const otSheet = wb.Sheets['OT'];
const otData = XLSX.utils.sheet_to_json(otSheet, { header: 1 });
console.log('\n--- OT Sheet Header & Sample ---');
otData.slice(0, 8).forEach((r, idx) => console.log(`Row ${idx}:`, r.slice(0, 8)));
