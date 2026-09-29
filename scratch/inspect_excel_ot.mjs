import xlsx from 'xlsx';
import fs from 'fs';

const filePath = fs.existsSync('./Test Data/JOY SEP IN & OUT.xlsx') 
  ? './Test Data/JOY SEP IN & OUT.xlsx'
  : './scratch/JOY_SEP_IN_AND_OUT_JOY_MANPOWER_SERVICES_26_Aug_2026___To_25_.xlsx';

const wb = xlsx.readFile(filePath);
const sheet = wb.Sheets['IN&OUT'];
const dataRaw = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });
const dataFormatted = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

console.log('--- RAW VALUES ---');
for (let r = 999; r <= 1008; r++) {
  console.log(`Row ${r + 1}:`, dataRaw[r]);
}

console.log('--- FORMATTED VALUES ---');
for (let r = 999; r <= 1008; r++) {
  console.log(`Row ${r + 1}:`, dataFormatted[r]);
}
