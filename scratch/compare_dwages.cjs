const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('D:', 'web-app (2)', 'Joy PeopleHR', 'Test Data', 'Ref', "JOY MANPOWER SERVICE SALARY STATEMENT FOR THE MONTH OF SEPTEMBER'26_Unit III.xlsx");
const wb = XLSX.readFile(filePath);

console.log('Sheets:', wb.SheetNames);

const ws = wb.Sheets['D WAGES'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Total rows:', data.length);
// Print headers
console.log('Row 3 (Header):', data[2]);

// Print total row
for (let r = 40; r < data.length; r++) {
  if (data[r] && (data[r][0] === '*' || data[r][1] === '*' || String(data[r][2]).includes('TOTAL') || data[r][4] === 532409)) {
    console.log(`TOTAL Row ${r+1}:`, data[r]);
  }
}

// Print column headers with column indices
const headers = data[2];
headers.forEach((h, i) => {
  console.log(`Col ${i} (${XLSX.utils.encode_col(i)}): ${h}`);
});

// Print row 47 (Grand total)
console.log('Row 47:', data[46]);
