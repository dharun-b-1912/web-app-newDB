const XLSX = require('xlsx');

const wb = XLSX.readFile('Electra_EV_Workforce_Cleaned_Production_Import.xlsx', { cellDates: true });
const sheet = wb.Sheets['Employee Onboarding'];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

console.log('Total rows in cleaned Excel:', rows.length);
if (rows.length > 0) {
  console.log('Sample row columns:', Object.keys(rows[0]));
  console.log('Row 0:', rows[0]);
}

