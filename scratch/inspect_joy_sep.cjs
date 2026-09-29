const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('D:', 'web-app (2)', 'Joy PeopleHR', 'Test Data', 'Ref', 'JOY SEP IN & OUT.xlsx');
const wb = XLSX.readFile(filePath);

console.log('Sheets in JOY SEP IN & OUT.xlsx:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\nSheet "${name}" rows:`, data.length);
  for (let r = 0; r < Math.min(5, data.length); r++) {
    console.log(`  Row ${r+1}:`, data[r]?.slice(0, 15));
  }
}
