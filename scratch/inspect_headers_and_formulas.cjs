const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Test Data', 'JOY SEP IN & OUT.xlsx');
const wb = XLSX.readFile(filePath);

const mrWs = wb.Sheets['MR REPORT'];
console.log('--- MR REPORT ROW 6 & 7 COLS: ---');
const mrRows = XLSX.utils.sheet_to_json(mrWs, { header: 1, defval: '' });
console.log('Row 6:', mrRows[5]);
console.log('Row 7:', mrRows[6]);
console.log('Row 8 (First emp):', mrRows[7]);
console.log('Row 51 (Total):', mrRows[50]);
console.log('Cell P51 formula:', mrWs['P51']?.f || mrWs['P51']?.v);
console.log('Cell Q51 formula:', mrWs['Q51']?.f || mrWs['Q51']?.v);
console.log('Cell R51 formula:', mrWs['R51']?.f || mrWs['R51']?.v);
console.log('Cell S51 formula:', mrWs['S51']?.f || mrWs['S51']?.v);

const otWs = wb.Sheets['OT'];
const inoutWs = wb.Sheets['IN&OUT'];
console.log('\n--- IN&OUT ROW 6 COLS: ---');
const inoutRows = XLSX.utils.sheet_to_json(inoutWs, { header: 1, defval: '' });
console.log('Row 6:', inoutRows[5]);
console.log('Row 7:', inoutRows[6]);
console.log('Row 8:', inoutRows[7]);
console.log('Row 9:', inoutRows[8]);
console.log('Row 10:', inoutRows[9]);
console.log('Total IN&OUT rows:', inoutRows.length);
