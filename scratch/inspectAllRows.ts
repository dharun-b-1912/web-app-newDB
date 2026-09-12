import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const filePath = path.resolve('Test Data', 'New format.xlsx');
const buf = fs.readFileSync(filePath);
const workbook = (XLSX.read || (XLSX as any).default?.read)(buf, { type: 'buffer' });
const utils = XLSX.utils || (XLSX as any).default?.utils;

for (const sheetName of workbook.SheetNames) {
  console.log(`\n================ ALL ROWS IN ${sheetName} ================`);
  const sheet = workbook.Sheets[sheetName];
  const records: any[] = utils.sheet_to_json(sheet);
  records.forEach((r, idx) => {
    const nonZeroKeys = Object.keys(r).filter(k => r[k] !== 0 && r[k] !== null && r[k] !== '' && k !== 'Sl no' && k !== 'Emp ID' && k !== 'Name' && k !== 'Pay Monthly/Daily' && k !== 'Fixed W Days');
    console.log(`[#${idx + 1}] ${r['Emp ID']} (${r['Name']}):`, nonZeroKeys.map(k => `${k}=${r[k]}`).join(' | '));
  });
}
