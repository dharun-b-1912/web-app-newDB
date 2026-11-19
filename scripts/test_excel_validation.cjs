const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('Electra_EV_Master_Workforce_SaaS_Onboarding.xlsx');
console.log('Sheets in workbook:', wb.SheetNames);

const sheetName = wb.SheetNames[0]; // 'SaaS Master Onboarding'
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
console.log(`Total rows in ${sheetName}: ${rows.length}`);

// Let's check for missing required fields in bulkImportService:
// 1. first_name
// 2. work_email
// 3. phone
// 4. dob
// 5. doj
// 6. employee_code duplicate
let missingEmail = 0;
let missingPhone = 0;
let invalidEmail = 0;
let invalidPhone = 0;
let missingFirstName = 0;
let invalidDob = 0;
let invalidDoj = 0;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errors = [];

rows.forEach((r, idx) => {
  const rowNum = idx + 2;
  const empCode = r['Employee Code'];
  const firstName = r['First Name'];
  const email = (r['Work Email'] || '').trim();
  const phone = String(r['Mobile Number'] || '').replace(/[^0-9]/g, '');
  const dob = r['Date of Birth'];
  const doj = r['Date of Joining'];
  const status = r['Employment Status'];
  const dept = r['Department'];

  let rowHasError = false;
  let reason = [];
  if (!firstName) { missingFirstName++; rowHasError = true; reason.push('Missing First Name'); }
  if (!email) { missingEmail++; rowHasError = true; reason.push('Missing Email'); }
  else if (!emailRegex.test(email)) { invalidEmail++; rowHasError = true; reason.push('Invalid Email: ' + email); }
  
  if (!phone) { missingPhone++; rowHasError = true; reason.push('Missing Phone'); }
  else if (phone.length < 10) { invalidPhone++; rowHasError = true; reason.push('Invalid Phone: ' + phone); }

  if (rowHasError) {
    errors.push({ rowNum, empCode, firstName, email, phone, status, dept, reason });
  }
});

console.log('Validation results:');
console.log(`Missing First Name: ${missingFirstName}`);
console.log(`Missing Email: ${missingEmail}`);
console.log(`Invalid Email: ${invalidEmail}`);
console.log(`Missing Phone: ${missingPhone}`);
console.log(`Invalid Phone (< 10 digits): ${invalidPhone}`);
console.log(`Total rows with errors: ${errors.length}`);
console.log('Sample rows with errors:', errors.slice(0, 10));
