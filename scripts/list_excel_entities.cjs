const XLSX = require('xlsx');

const wb = XLSX.readFile('Electra_EV_Workforce_Cleaned_Production_Import.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

const depts = new Set();
const desigs = new Set();
const branches = new Set();

for (const row of data) {
  if (row.Department) depts.add(String(row.Department).trim());
  if (row.Designation) desigs.add(String(row.Designation).trim());
  if (row['Work Location']) branches.add(String(row['Work Location']).trim());
}

console.log('Unique Departments in Excel:', Array.from(depts));
console.log('Unique Designations in Excel:', Array.from(desigs));
console.log('Unique Branches / Locations in Excel:', Array.from(branches));

