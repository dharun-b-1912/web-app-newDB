const XLSX = require('xlsx');
const path = require('path');

const inoutPath = path.join('D:', 'web-app (2)', 'Joy PeopleHR', 'Test Data', 'Ref', 'JOY SEP IN & OUT.xlsx');
const wb = XLSX.readFile(inoutPath);
const ws = wb.Sheets['MR REPORT'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

let sumFA = 0;
let sumNA = 0;
let countWorkers = 0;

for (let r = 7; r < data.length; r++) {
  const row = data[r];
  if (!row || !row[1]) continue;
  countWorkers++;
  const fa = Number(row[17]) || 0;
  const na = Number(row[18]) || 0;
  sumFA += fa;
  sumNA += na;
  if (fa > 0 || na > 0) {
    console.log(`Worker ${row[1]} (${row[2]}): FA=${fa}, NA=${na}`);
  }
}

console.log(`\nTotal Workers in MR REPORT: ${countWorkers}`);
console.log(`Total FA in MR REPORT: ${sumFA}`);
console.log(`Total NA in MR REPORT: ${sumNA}`);
