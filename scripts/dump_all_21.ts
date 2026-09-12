import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const filePath = path.resolve(process.cwd(), 'Test Data/New format.xlsx');
const fileBuffer = fs.readFileSync(filePath);
const wb = XLSX.read(fileBuffer, { type: 'buffer' });

const ws = wb.Sheets[wb.SheetNames[0]];
const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: 0 });

console.log('=== EXACT 21 ROWS FROM WORKBOOK ===');
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

  console.log(`[${slNo}] ${empId} | ${empName} | Days: ${payableDays} | OT: ${otHours} | Basic: ${basic} | HRA: ${hra} | OT Wage: ${otWages} | Gross: ${grossEarnings} | Canteen: ${canteen} | Advance: ${advance} | TotDed: ${totalDeductions} | Net: ${netPayable}`);
});
