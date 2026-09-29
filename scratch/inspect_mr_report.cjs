const XLSX = require('xlsx');
const path = require('path');

const inoutPath = path.join('D:', 'web-app (2)', 'Joy PeopleHR', 'Test Data', 'Ref', 'JOY SEP IN & OUT.xlsx');
const wb = XLSX.readFile(inoutPath);
const ws = wb.Sheets['MR REPORT'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Row 6 (Headers):', data[5]);
console.log('Row 7 (First worker):', data[6]);
console.log('Row 8 (Second worker):', data[7]);

// Print all columns where FA or NA might be
const headers = data[5];
headers.forEach((h, i) => {
  console.log(`Col ${i} (${XLSX.utils.encode_col(i)}): ${h}`);
});

// Print values of these columns for first 15 workers
for (let r = 6; r < 20; r++) {
  console.log(`Row ${r+1} (${data[r]?.[1]} - ${data[r]?.[2]}):`, data[r]?.slice(7, 20));
}
