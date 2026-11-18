const XLSX = require('xlsx');
const outPath = 'C:/Users/hp/.gemini/antigravity/brain/fd7ea8f7-0476-4a0b-851c-1c9b1ce88eb7/Electra_EV_Workforce_Cleaned_Production_Import.xlsx';

const wb = XLSX.readFile(outPath);
const sheet = wb.Sheets['Employee Onboarding'];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

console.log(`Verifying cleaned sheet: ${rows.length} records`);

let blockingErrors = 0;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

rows.forEach((r, idx) => {
  const rowNum = idx + 2;
  const code = r['Employee Code'];
  const first = r['First Name'];
  const email = r['Work Email'];
  const phone = r['Mobile Number'];
  const doj = r['Date of Joining'];
  const dob = r['Date of Birth'];

  if (!code) {
    console.error(`Row ${rowNum}: Missing code`);
    blockingErrors++;
  }
  if (!first) {
    console.error(`Row ${rowNum}: Missing first name`);
    blockingErrors++;
  }
  if (!email || !emailRegex.test(email)) {
    console.error(`Row ${rowNum}: Invalid email "${email}"`);
    blockingErrors++;
  }
  if (!phone || phone.length < 10) {
    console.error(`Row ${rowNum}: Invalid phone "${phone}"`);
    blockingErrors++;
  }
  if (!doj || !/^\d{4}-\d{2}-\d{2}$/.test(doj)) {
    console.error(`Row ${rowNum}: Invalid DOJ "${doj}"`);
    blockingErrors++;
  }
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    console.error(`Row ${rowNum}: Invalid DOB "${dob}"`);
    blockingErrors++;
  }
});

console.log(`\nValidation complete: ${blockingErrors} blocking errors across ${rows.length} records.`);

