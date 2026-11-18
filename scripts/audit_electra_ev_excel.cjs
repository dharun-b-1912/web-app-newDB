const XLSX = require('xlsx');
const path = 'C:/Users/hp/.gemini/antigravity/brain/fd7ea8f7-0476-4a0b-851c-1c9b1ce88eb7/.user_uploaded/media_1794976165034_e7cbe9e9.xlsx';

const wb = XLSX.readFile(path, { cellDates: true });
const sheet = wb.Sheets['Employee Onboarding'];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

console.log(`Total data rows loaded from "Employee Onboarding": ${rawRows.length}`);

// We analyze every row
const issues = [];
const cleanRows = [];
const codeMap = new Map();
const emailMap = new Map();
const phoneMap = new Map();

rawRows.forEach((r, idx) => {
  const rowNum = idx + 2;
  const empCode = String(r['Employee Code'] || '').trim();
  const firstName = String(r['First Name'] || '').trim();
  const lastName = String(r['Last Name'] || '').trim();
  const workEmail = String(r['Work Email'] || '').trim();
  const personalEmail = String(r['Personal Email'] || '').trim();
  const mobile = String(r['Mobile Number'] || '').trim();
  const dob = String(r['Date of Birth'] || '').trim();
  const doj = String(r['Date of Joining'] || '').trim();
  const dept = String(r['Department'] || '').trim();
  const desig = String(r['Designation'] || '').trim();
  const aadhaar = String(r['Aadhaar Number'] || '').trim();
  const bankAcc = String(r['Account Number'] || '').trim();
  const ifsc = String(r['IFSC Code'] || '').trim();
  const uan = String(r['UAN Number'] || '').trim();
  const esic = String(r['ESIC Number'] || '').trim();

  // Check if completely blank row
  const hasAnyData = Object.values(r).some(v => String(v).trim().length > 0);
  if (!hasAnyData) {
    issues.push({ row: rowNum, emp: firstName || empCode, type: 'EMPTY_ROW', msg: 'Row is completely empty' });
    return;
  }

  // 1. Employee Code
  if (!empCode) {
    issues.push({ row: rowNum, emp: firstName, type: 'MISSING_CODE', msg: 'Employee Code is completely missing/blank' });
  } else if (/^\d+$/.test(empCode) && parseInt(empCode, 10) < 100) {
    issues.push({ row: rowNum, emp: firstName, code: empCode, type: 'NON_STANDARD_CODE', msg: `Single/small digit code "${empCode}" instead of standard EEV prefix` });
  } else if (empCode === 'SUB01') {
    issues.push({ row: rowNum, emp: firstName, code: empCode, type: 'NON_STANDARD_CODE', msg: `Non-standard vendor code "SUB01"` });
  }

  if (empCode) {
    if (codeMap.has(empCode)) {
      issues.push({ row: rowNum, emp: firstName, code: empCode, type: 'DUPLICATE_CODE', msg: `Duplicate code "${empCode}" with row ${codeMap.get(empCode)}` });
    } else {
      codeMap.set(empCode, rowNum);
    }
  }

  // 2. Name
  if (!firstName) {
    issues.push({ row: rowNum, emp: 'UNKNOWN', type: 'MISSING_FIRST_NAME', msg: 'First Name is blank' });
  }

  // 3. Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!workEmail) {
    issues.push({ row: rowNum, emp: `${firstName} (${empCode})`, type: 'MISSING_EMAIL', msg: 'Work Email is missing' });
  } else if (!emailRegex.test(workEmail)) {
    issues.push({ row: rowNum, emp: `${firstName} (${empCode})`, email: workEmail, type: 'INVALID_EMAIL', msg: `Malformed email syntax: "${workEmail}"` });
  } else {
    if (emailMap.has(workEmail.toLowerCase())) {
      issues.push({ row: rowNum, emp: `${firstName} (${empCode})`, email: workEmail, type: 'DUPLICATE_EMAIL', msg: `Duplicate email "${workEmail}" with row ${emailMap.get(workEmail.toLowerCase())}` });
    } else {
      emailMap.set(workEmail.toLowerCase(), rowNum);
    }
  }

  // 4. Mobile
  const cleanMobile = mobile.replace(/[^0-9]/g, '');
  if (!cleanMobile) {
    issues.push({ row: rowNum, emp: `${firstName} (${empCode})`, type: 'MISSING_PHONE', msg: 'Mobile number is missing' });
  } else if (cleanMobile.length !== 10) {
    issues.push({ row: rowNum, emp: `${firstName} (${empCode})`, phone: mobile, type: 'INVALID_PHONE_LENGTH', msg: `Phone has ${cleanMobile.length} digits: "${mobile}" (requires exactly 10)` });
  } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
    issues.push({ row: rowNum, emp: `${firstName} (${empCode})`, phone: mobile, type: 'INVALID_PHONE_START', msg: `Invalid Indian phone prefix: "${mobile}"` });
  }

  // 5. Aadhaar
  const cleanAadhaar = aadhaar.replace(/[^0-9]/g, '');
  if (aadhaar && cleanAadhaar.length !== 12) {
    issues.push({ row: rowNum, emp: `${firstName} (${empCode})`, aadhaar, type: 'INVALID_AADHAAR', msg: `Aadhaar has ${cleanAadhaar.length} digits: "${aadhaar}" (must be 12 digits)` });
  }

  // 6. Dates
  if (!doj) {
    issues.push({ row: rowNum, emp: `${firstName} (${empCode})`, type: 'MISSING_DOJ', msg: 'Date of Joining is missing' });
  }
  if (!dob) {
    issues.push({ row: rowNum, emp: `${firstName} (${empCode})`, type: 'MISSING_DOB', msg: 'Date of Birth is missing' });
  }
});

console.log(`\n=== ROWS 171 to 173 DATES ===`);
for (let i = 169; i < rawRows.length; i++) {
  console.log(`Row ${i+2}: ${rawRows[i]['First Name']} | DOB: "${rawRows[i]['Date of Birth']}" | DOJ: "${rawRows[i]['Date of Joining']}"`);
}

for (let i = 154; i < rawRows.length; i++) {
  console.log(`Row ${i+2}: emp="${rawRows[i]['First Name']}", code="${rawRows[i]['Employee Code']}", phone="${rawRows[i]['Mobile Number']}", acc="${rawRows[i]['Account Number']}", ifsc="${rawRows[i]['IFSC Code']}"`);
}

console.log(`Total issues detected: ${issues.length}`);

const grouped = {};
issues.forEach(i => {
  grouped[i.type] = (grouped[i.type] || []);
  grouped[i.type].push(i);
});

for (const [type, list] of Object.entries(grouped)) {
  console.log(`\n[${type}] Count: ${list.length}`);
  list.slice(0, 10).forEach(item => {
    console.log(`  Row ${item.row}: ${item.emp} -> ${item.msg}`);
  });
  if (list.length > 10) {
    console.log(`  ... and ${list.length - 10} more`);
  }
}
