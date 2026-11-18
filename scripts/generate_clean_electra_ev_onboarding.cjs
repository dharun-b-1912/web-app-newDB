const XLSX = require('xlsx');
const path = 'C:/Users/hp/.gemini/antigravity/brain/fd7ea8f7-0476-4a0b-851c-1c9b1ce88eb7/.user_uploaded/media_1794976165034_e7cbe9e9.xlsx';
const outPath = 'C:/Users/hp/.gemini/antigravity/brain/fd7ea8f7-0476-4a0b-851c-1c9b1ce88eb7/Electra_EV_Workforce_Cleaned_Production_Import.xlsx';

const wb = XLSX.readFile(path, { cellDates: false });
const rawSheet = wb.Sheets['Employee Onboarding'];
const rawData = XLSX.utils.sheet_to_json(rawSheet, { defval: '', raw: false });

console.log(`Original rows loaded: ${rawData.length}`);

// Helper to normalize dates
function normalizeDate(raw) {
  if (!raw) return '';
  const clean = String(raw).trim();
  if (!clean) return '';

  // Numeric serial
  if (/^\d{4,5}$/.test(clean)) {
    const serial = parseInt(clean, 10);
    if (serial > 1000 && serial < 100000) {
      const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return d.toISOString().split('T')[0];
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  const mdy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (mdy) {
    let year = mdy[3];
    if (year.length === 2) {
      const yNum = parseInt(year, 10);
      year = yNum <= 30 ? `20${year.padStart(2, '0')}` : `19${year.padStart(2, '0')}`;
    }
    const p1 = parseInt(mdy[1], 10);
    const p2 = parseInt(mdy[2], 10);
    if (p1 > 12) {
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
  }

  return clean;
}

// Find highest existing EEV number
let maxEev = 8750;
rawData.forEach(r => {
  const code = String(r['Employee Code'] || '').trim();
  const m = code.match(/^EEV(\d+)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n > maxEev) maxEev = n;
  }
});
console.log(`Max EEV code detected: EEV${maxEev}`);

let nextEev = maxEev + 1;
let nextTempSeq = 13; // Codes 1..12 correspond to short contractor numbers; blank rows start at 13
const cleanedList = [];
const anomaliesLogged = [];
const tempAssignedList = [];

rawData.forEach((r, idx) => {
  const rowNum = idx + 2;
  const firstName = String(r['First Name'] || '').trim();
  const lastName = String(r['Last Name'] || '').trim();
  let empCode = String(r['Employee Code'] || '').trim();
  let workEmail = String(r['Work Email'] || '').trim();
  let personalEmail = String(r['Personal Email'] || '').trim();
  let mobile = String(r['Mobile Number'] || '').replace(/[^0-9]/g, '');
  let altPhone = String(r['Alternate Phone'] || '').replace(/[^0-9]/g, '');
  let dob = normalizeDate(r['Date of Birth']);
  let doj = normalizeDate(r['Date of Joining']);
  let aadhaar = String(r['Aadhaar Number'] || '').trim().replace(/['"`]/g, '');
  let uan = String(r['UAN Number'] || '').trim();
  let esic = String(r['ESIC Number'] || '').trim();
  let pan = String(r['PAN Number'] || '').trim();
  let bankName = String(r['Bank Name'] || '').trim();
  let accNum = String(r['Account Number'] || '').trim();
  let ifsc = String(r['IFSC Code'] || '').trim();
  let dept = String(r['Department'] || '').trim() || 'Operations';
  let desig = String(r['Designation'] || '').trim() || 'Production Associate';
  let address = String(r['Current Address'] || r['Permanent Address'] || '').trim();
  let city = String(r['City'] || '').trim();
  let state = String(r['State'] || '').trim() || 'Tamil Nadu';
  let pin = String(r['Postal Code'] || '').trim();

  // Skip ghost empty rows (like Row 163 which only has an account number and no person)
  if (!firstName && !empCode && !mobile) {
    console.log(`Skipping ghost empty row ${rowNum}: Acc: ${accNum}, IFSC: ${ifsc}`);
    return;
  }

  // 1. Employee Code Standardization (Provisional Temporary ID Assignment)
  if (!empCode) {
    const oldCode = '(BLANK)';
    empCode = `TEMP-${String(nextTempSeq++).padStart(2, '0')}`;
    anomaliesLogged.push(`Row ${rowNum} (${firstName}): Auto-assigned provisional temporary code "${empCode}" (Awaiting official Electra EV permanent ID)`);
    tempAssignedList.push({ row: rowNum, name: `${firstName} ${lastName}`.trim(), original: oldCode, assigned: empCode, type: 'Missing Code' });
  } else if (empCode === 'SUB01') {
    const oldCode = empCode;
    empCode = 'TEMP-SUB01';
    anomaliesLogged.push(`Row ${rowNum} (${firstName}): Prefixed subcontractor token as provisional "${empCode}"`);
    tempAssignedList.push({ row: rowNum, name: `${firstName} ${lastName}`.trim(), original: oldCode, assigned: empCode, type: 'Subcontractor Token' });
  } else if (/^\d+$/.test(empCode) && parseInt(empCode, 10) < 100) {
    const oldCode = empCode;
    const num = parseInt(empCode, 10);
    empCode = `TEMP-${String(num).padStart(2, '0')}`;
    anomaliesLogged.push(`Row ${rowNum} (${firstName}): Prefixed short contractor number as provisional "${empCode}"`);
    tempAssignedList.push({ row: rowNum, name: `${firstName} ${lastName}`.trim(), original: oldCode, assigned: empCode, type: 'Short Number' });
  }

  // 2. Email Sanitization
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (workEmail) {
    workEmail = workEmail
      .replace(/,com$/i, '.com')
      .replace(/@gmai\.com$/i, '@gmail.com')
      .replace(/@gamil\.com$/i, '@gmail.com')
      .replace(/\s+/g, '');
  }
  if (personalEmail) {
    personalEmail = personalEmail
      .replace(/,com$/i, '.com')
      .replace(/@gmai\.com$/i, '@gmail.com')
      .replace(/@gamil\.com$/i, '@gmail.com')
      .replace(/\s+/g, '');
  }

  if (!workEmail) {
    if (personalEmail && emailRegex.test(personalEmail)) {
      workEmail = personalEmail;
    } else {
      const slug = (firstName + '.' + empCode).toLowerCase().replace(/[^a-z0-9.]/g, '');
      workEmail = `${slug}@electraev.local`;
      anomaliesLogged.push(`Row ${rowNum} (${firstName}): Generated provisional email "${workEmail}"`);
    }
  }

  // 3. Mobile formatting
  if (mobile.length === 11 && mobile.startsWith('0')) mobile = mobile.slice(1);
  if (mobile.length === 12 && mobile.startsWith('91')) mobile = mobile.slice(2);
  if (mobile.length !== 10) {
    anomaliesLogged.push(`Row ${rowNum} (${firstName} - ${empCode}): Phone has ${mobile.length} digits: "${r['Mobile Number']}"`);
  }

  // 4. Aadhaar
  if (aadhaar === '0') aadhaar = '';
  if (aadhaar && aadhaar.length !== 12) {
    anomaliesLogged.push(`Row ${rowNum} (${firstName} - ${empCode}): Aadhaar "${aadhaar}" has ${aadhaar.length} digits (expected 12)`);
  }

  // 5. Default Date fallbacks
  if (!doj) doj = '2026-01-19';
  if (!dob) dob = '2000-01-01';

  cleanedList.push({
    'Employee Code': empCode,
    'First Name': firstName,
    'Middle Name': String(r['Middle Name'] || '').trim(),
    'Last Name': lastName,
    'Work Email': workEmail,
    'Personal Email': personalEmail,
    'Mobile Number': mobile,
    'Alternate Phone': altPhone,
    'Gender': String(r['Gender'] || 'MALE').toUpperCase().includes('FEMALE') ? 'FEMALE' : 'MALE',
    'Date of Birth': dob,
    'Marital Status': String(r['Marital Status'] || 'Single').trim(),
    'Blood Group': String(r['Blood Group'] || '').trim(),
    'Date of Joining': doj,
    'Department': dept,
    'Designation': desig,
    'Work Location': 'Electra EV Plant',
    'Work Mode': 'Onsite',
    'Employment Type': 'Contract',
    'Employment Status': 'ACTIVE',
    'Reporting Manager Code': 'JCS-013', // Shalini J (Vendor Representative)
    'Employment Source': 'VENDOR',
    'Vendor Name': 'Joy Manpower Services',
    'Probation Months': '',
    'Notice Period Days': '30',
    'Annual CTC': 212400,
    'Monthly Gross': 17700,
    'Tax Regime': 'NEW',
    'Bank Name': bankName,
    'Account Number': accNum,
    'IFSC Code': ifsc,
    'Account Holder Name': String(r['Account Holder Name'] || `${firstName} ${lastName}`).trim(),
    'Account Type': 'SALARY',
    'PAN Number': pan,
    'UAN Number': uan === '0' ? '' : uan,
    'PF Number': String(r['PF Number'] || '').trim(),
    'PF Applicable': uan && uan !== '0' ? 'YES' : 'NO',
    'ESIC Number': esic === '0' ? '' : esic,
    'ESI Applicable': esic && esic !== '0' ? 'YES' : 'NO',
    'Aadhaar Number': aadhaar,
    'Current Address': address,
    'City': city,
    'State': state,
    'Postal Code': pin,
    'Permanent Address': String(r['Permanent Address'] || address).trim(),
    'Emergency Contact Name': String(r['Emergency Contact Name'] || '').trim(),
    'Emergency Contact Phone': String(r['Emergency Contact Phone'] || '').trim(),
    'Emergency Relationship': String(r['Emergency Relationship'] || 'Family').trim(),
  });
});

console.log(`\nSuccessfully cleaned and transformed ${cleanedList.length} valid employee records.`);
console.log(`Total anomalies resolved / logged: ${anomaliesLogged.length}`);
console.log(`\n=== PROVISIONAL TEMPORARY CODES ASSIGNED (${tempAssignedList.length}) ===`);
console.table(tempAssignedList);

// Create new clean Excel workbook
const newWb = XLSX.utils.book_new();
const newWs = XLSX.utils.json_to_sheet(cleanedList);
XLSX.utils.book_append_sheet(newWb, newWs, 'Employee Onboarding');
XLSX.writeFile(newWb, outPath);

console.log(`Clean production onboarding Excel file written to: ${outPath}`);

