import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const filePath = path.resolve('Test Data', 'New format.xlsx');
console.log('Reading workbook from:', filePath);

const buf = fs.readFileSync(filePath);
const workbook = (XLSX.read || (XLSX as any).default?.read)(buf, { type: 'buffer' });
const utils = XLSX.utils || (XLSX as any).default?.utils;
console.log('Sheet Names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n================ SHEET: ${sheetName} ================`);
  const sheet = workbook.Sheets[sheetName];
  const jsonData = utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total Rows: ${jsonData.length}`);
  
  if (jsonData.length > 0) {
    console.log('First 5 rows:');
    jsonData.slice(0, 5).forEach((row: any, i: number) => {
      console.log(`Row ${i}:`, JSON.stringify(row));
    });
  }

  // Also try formatted object JSON
  const objectData = utils.sheet_to_json(sheet);
  console.log(`Total Object Rows: ${objectData.length}`);
  if (objectData.length > 0) {
    console.log('First record keys:', Object.keys(objectData[0] as object));
    console.log('First record sample:', JSON.stringify(objectData[0], null, 2));
  }
}
