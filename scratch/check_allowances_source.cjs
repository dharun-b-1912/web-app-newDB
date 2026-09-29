const XLSX = require('xlsx');
const path = require('path');

const inoutPath = path.join('D:', 'web-app (2)', 'Joy PeopleHR', 'Test Data', 'Ref', 'JOY SEP IN & OUT.xlsx');
const inoutWb = XLSX.readFile(inoutPath);
console.log('--- Checking JOY SEP IN & OUT.xlsx ---');
for (const sName of inoutWb.SheetNames) {
  const ws = inoutWb.Sheets[sName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`Sheet "${sName}":`);
  // Look for any headers with Food, Allow, Night, Canteen
  for (let r = 0; r < Math.min(10, data.length); r++) {
    const row = data[r] || [];
    const matched = row.filter(cell => /food|allow|night|canteen|fa|na/i.test(String(cell)));
    if (matched.length > 0) {
      console.log(`  Row ${r+1} matches:`, matched);
    }
  }
}
