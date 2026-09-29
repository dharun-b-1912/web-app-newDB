const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('D:', 'web-app (2)', 'Joy PeopleHR', 'Test Data', 'Ref', "JOY MANPOWER SERVICE SALARY STATEMENT FOR THE MONTH OF SEPTEMBER'26_Unit III.xlsx");
const wb = XLSX.readFile(filePath);

console.log('Sheets:', wb.SheetNames);

const ws = wb.Sheets['D WAGES'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Row 3 (Header):', data[2]);
console.log('Row 4 (Subheader/cols):', data[3]);

// Print rows 4 to 10
for (let r = 2; r < 10; r++) {
  console.log(`Row ${r+1}:`, data[r]?.slice(0, 25));
}

// Print last rows (totals)
for (let r = Math.max(0, data.length - 8); r < data.length; r++) {
  console.log(`Row ${r+1}:`, data[r]?.slice(0, 25));
}
