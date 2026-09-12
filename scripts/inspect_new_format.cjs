const xlsx = require('xlsx');
const path = 'D:/web-app (2)/Joy PeopleHR/Test Data/New format.xlsx';

const wb = xlsx.readFile(path);
console.log('Sheet names:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n================ Sheet: "${name}" (${rows.length} rows) ================`);
  rows.slice(0, 35).forEach((r, i) => {
    if (r && r.length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(r));
    }
  });
}
