const XLSX = require('xlsx');
const path = require('path');

const inoutPath = path.join('D:', 'web-app (2)', 'Joy PeopleHR', 'Test Data', 'Ref', 'JOY SEP IN & OUT.xlsx');
const wb = XLSX.readFile(inoutPath);
const ws = wb.Sheets['MR REPORT'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

const salaryPath = path.join('D:', 'web-app (2)', 'Joy PeopleHR', 'Test Data', 'Ref', "JOY MANPOWER SERVICE SALARY STATEMENT FOR THE MONTH OF SEPTEMBER'26_Unit III.xlsx");
const wbSal = XLSX.readFile(salaryPath);
const wsSal = wbSal.Sheets['D WAGES'];
const dataSal = XLSX.utils.sheet_to_json(wsSal, { header: 1 });

const canteenMap = {};
for (let r = 3; r < dataSal.length; r++) {
  const row = dataSal[r];
  if (row && row[1] && row[1] !== '*') {
    const empId = String(row[1]).trim();
    canteenMap[empId] = Number(row[23]) || 0;
  }
}

const map = {};
for (let r = 7; r < data.length; r++) {
  const row = data[r];
  if (row && row[1]) {
    const empId = String(row[1]).trim();
    const fa = Number(row[17]) || 0;
    const na = Number(row[18]) || 0;
    const canteen = canteenMap[empId] || 0;
    map[empId] = { fa, na, canteen };
  }
}

console.log('const JOY_SEP_ALLOWANCES_MAP = ' + JSON.stringify(map, null, 2) + ';');
