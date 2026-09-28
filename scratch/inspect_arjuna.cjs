const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const filePath = path.join(__dirname, '..', 'Test Data', "ARJUNA NATURALS INVOICE JULY'26.xlsx");
console.log('Reading from:', filePath);
const wb = xlsx.readFile(filePath);
const workings = xlsx.utils.sheet_to_json(wb.Sheets['Workings'], { header: 1 });
const allowance = xlsx.utils.sheet_to_json(wb.Sheets['Allowance'], { header: 1 });
const breakup = xlsx.utils.sheet_to_json(wb.Sheets['Breakup'], { header: 1 });
const invoice = xlsx.utils.sheet_to_json(wb.Sheets['INVOICE'], { header: 1 });

const employees = [];
for (let i = 3; i <= 25; i++) {
  const w = workings[i];
  const a = allowance[i];
  employees.push({
    sNo: w[0],
    code: w[1],
    name: w[2],
    dept: w[3],
    dailyWages: w[4],
    payDays: w[5],
    wages: w[6],
    otHours: w[7],
    otStipend: w[8],
    gross: w[10],
    pf12: w[11],
    esi075: w[12],
    net: w[15],
    allowanceWorkingDays: a ? a[5] : 0,
    roomAllowance: a ? a[6] : 0,
    transportAllowance: a ? a[7] : 0,
    totalAllowance: a ? a[8] : 0,
  });
}

console.log('Total employee rows:', employees.length);
console.log('Sample row:', employees[0]);

const totals = {
  payDays: employees.reduce((s, e) => s + Number(e.payDays || 0), 0),
  wages: employees.reduce((s, e) => s + Number(e.wages || 0), 0),
  otHours: employees.reduce((s, e) => s + Number(e.otHours || 0), 0),
  otStipend: employees.reduce((s, e) => s + Number(e.otStipend || 0), 0),
  gross: employees.reduce((s, e) => s + Number(e.gross || 0), 0),
  pf12: employees.reduce((s, e) => s + Number(e.pf12 || 0), 0),
  esi075: employees.reduce((s, e) => s + Number(e.esi075 || 0), 0),
  net: employees.reduce((s, e) => s + Number(e.net || 0), 0),
  allowanceWorkingDays: employees.reduce((s, e) => s + Number(e.allowanceWorkingDays || 0), 0),
  roomAllowance: employees.reduce((s, e) => s + Number(e.roomAllowance || 0), 0),
  transportAllowance: employees.reduce((s, e) => s + Number(e.transportAllowance || 0), 0),
  totalAllowance: employees.reduce((s, e) => s + Number(e.totalAllowance || 0), 0),
};

console.log('Calculated Totals:', totals);
