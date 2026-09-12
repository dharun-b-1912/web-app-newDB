import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const filePath = path.resolve(process.cwd(), 'Test Data/New format.xlsx');
console.log('Reading from:', filePath);
const fileBuffer = fs.readFileSync(filePath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });
console.log('Sheet Names:', wb.SheetNames);

wb.SheetNames.forEach(name => {
  console.log('\n========================================');
  console.log('--- Sheet:', name, '---');
  console.log('========================================');
  const ws = wb.Sheets[name];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: 0 });
  
  console.log('public static readonly CANONICAL_21_WORKERS_DATA: SourcePayrollRow[] = [');
  rows.forEach((r, idx) => {
    const slNo = r['Sl no'] || (idx + 1);
    const empId = r['Emp ID'] || '';
    const empName = r['Name'] || '';
    const payType = r['Pay Monthly/Daily'] || 'Daily';
    const fixedWorkingDays = Number(r['Fixed W Days']) || 25;
    const workedDays = Number(r['W Days']) || 0;
    const payableDays = Number(r['Payable Days']) || workedDays;
    const otHours = Number(r['OT Hrs']) || 0;
    const basic = Number(r['Basic']) || (payableDays * 420);
    const da = Number(r['DA']) || 0;
    const hra = Number(r['HRA']) || (payableDays * 180);
    const wages = Number(r['Basic'] || 0) + Number(r['HRA'] || 0);
    const nfhWages = Number(r['Holiday Wages']) || 0;
    const otWages = Number(r['OT Wages']) || (otHours * 75);
    const grossEarnings = Number(r['Gross Earnings']) || (basic + hra + otWages);
    const canteen = Number(r['Canteen']) || 0;
    const totalDeductions = Number(r['Total Deductions']) || 0;
    const advance = Number(r['Advance']) || (totalDeductions > canteen ? (totalDeductions - canteen) : 0);
    const netPayable = Number(r['Net Payable']) || (grossEarnings - totalDeductions);

    console.log(`    { slNo: ${slNo}, empId: '${empId}', name: '${empName.replace(/'/g, "\\'")}', payType: '${payType}', fixedWorkingDays: ${fixedWorkingDays}, workedDays: ${workedDays}, nfh: ${r['NFH'] || 0}, co: ${r['CO'] || 0}, od: ${r['OD'] || 0}, sundays: ${r['Sundays'] || 0}, pl: ${r['PL'] || 0}, cl: ${r['CL'] || 0}, sl: ${r['SL'] || 0}, payableDays: ${payableDays}, otHours: ${otHours}, basic: ${basic}, da: ${da}, hra: ${hra}, wages: ${wages}, nfhWages: ${nfhWages}, otWages: ${otWages}, foodAllowance: ${r['Food Allowance'] || 0}, nightAllowance: ${r['Night Allowance'] || 0}, attendanceBonus: ${r['Attendance Bonus'] || 0}, arrears: ${r['Arrears'] || 0}, productionIncentive: ${r['Production Incentive'] || 0}, medicalAllowance: ${r['Medical Allowance'] || 0}, sundayEarnings: 0, grossEarnings: ${grossEarnings}, pfDeductions: ${r['PF Deductions'] || 0}, esiDeductions: ${r['ESI Deductions'] || 0}, professionalTax: ${r['Professional Tax'] || 0}, lwf: ${r['LWF'] || 0}, canteen: ${canteen}, snacks: ${r['Snacks'] || 0}, rent: ${r['Tent'] || r['Rent'] || 0}, advance: ${advance}, others: ${r['Others'] || 0}, tds: ${r['TDS'] || 0}, medicalInsurance: ${r['Medical insurance'] || 0}, totalDeductions: ${totalDeductions}, netPayable: ${netPayable} },`);
  });
  console.log('  ];');
});
