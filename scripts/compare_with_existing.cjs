const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const wb = XLSX.readFile('Electra_EV_Workforce_Cleaned_Production_Import.xlsx');
const sheet = wb.Sheets['Employee Onboarding'];
const existing171 = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

console.log('Existing 171 count:', existing171.length);
const existingCodes = new Set(existing171.map(r => String(r['Employee Code'] || '').trim().toUpperCase()));
const existingNames = new Set(existing171.map(r => String(r['First Name'] || '').trim().toUpperCase()));

function parseLine(text) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(field.trim());
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field.trim());
  return fields;
}

const p1Lines = fs.readFileSync(path.join(__dirname, 'raw_part1.csv'), 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
const header = parseLine(p1Lines[0]);
const p1Rows = [];
for (let i = 1; i < p1Lines.length; i++) {
  const vals = parseLine(p1Lines[i]);
  const r = {};
  header.forEach((h, idx) => r[h] = vals[idx] || '');
  r._line = i + 1;
  p1Rows.push(r);
}

let matchedByCode = 0;
let matchedByName = 0;
let notIn171 = 0;

const p1NotIn171 = [];

p1Rows.forEach(r => {
  const code = (r['EMP NO'] || '').trim().toUpperCase();
  const name = (r['NAME'] || '').trim().toUpperCase();
  if (code && existingCodes.has(code)) {
    matchedByCode++;
  } else if (name && existingNames.has(name)) {
    matchedByName++;
  } else {
    notIn171++;
    p1NotIn171.push({ code, name, status: r['STATUS'], line: r._line });
  }
});

console.log(`Matched by Code in existing 171: ${matchedByCode}`);
console.log(`Matched by Name in existing 171: ${matchedByName}`);
console.log(`NEW / NOT in existing 171: ${notIn171}`);
console.log('\nSample of employees NOT in existing 171 (first 25):', p1NotIn171.slice(0, 25));

const newByStatus = {};
p1NotIn171.forEach(r => {
  const s = r.status || 'EMPTY';
  newByStatus[s] = (newByStatus[s] || 0) + 1;
});
console.log('\nNew records by status:', newByStatus);
