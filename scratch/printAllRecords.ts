import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const filePath = path.resolve('Test Data', 'New format.xlsx');
const buf = fs.readFileSync(filePath);
const workbook = (XLSX.read || (XLSX as any).default?.read)(buf, { type: 'buffer' });
const utils = XLSX.utils || (XLSX as any).default?.utils;

const sheet = workbook.Sheets[workbook.SheetNames[0]];
const records: any[] = utils.sheet_to_json(sheet);

console.log('================ DEDUCTIONS BREAKDOWN ================');
records.filter(r => r['Total Deductions'] > 0).forEach(r => {
  console.log(`ID: ${r['Emp ID']} | Gross: ${r['Gross Earnings']} | PF: ${r['PF Deductions']} | ESI: ${r['ESI Deductions']} | PT: ${r['Professional Tax']} | LWF: ${r['LWF']} | Canteen: ${r['Canteen']} | Snacks: ${r['Snacks']} | Rent: ${r['Rent']} | Advance: ${r['Advance']} | Others: ${r['Others']} | TDS: ${r['TDS']} | Med: ${r['Medical insurance']} | Total Ded: ${r['Total Deductions']} | Net: ${r['Net Payable']}`);
});
