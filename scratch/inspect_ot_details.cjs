const XLSX = require('xlsx');
const wb = XLSX.readFile('Test Data/JOY SEP IN & OUT.xlsx');
const otSheet = wb.Sheets['OT'];
const otData = XLSX.utils.sheet_to_json(otSheet, { header: 1 });
console.log('OT header rows:');
otData.slice(0, 7).forEach((r, i) => console.log(`Row ${i}:`, r.slice(0, 10)));
console.log('OT Total row (row 38 or last):');
otData.slice(35, 42).forEach((r, i) => console.log(`Row ${i + 35}:`, r.slice(0, 10), '... col AL/AM:', r.slice(36, 40)));
