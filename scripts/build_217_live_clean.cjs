const fs = require('fs');

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const header = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    let cells = [];
    let inQuotes = false;
    let curr = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cells.push(curr.trim()); curr = ''; }
      else { curr += ch; }
    }
    cells.push(curr.trim());
    const obj = {};
    header.forEach((h, idx) => { obj[h] = cells[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

function excelSerialToDateStr(val) {
  if (!val) return '';
  const num = Number(val);
  if (isNaN(num)) {
    const s = String(val).trim();
    if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
    if (s.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      const parts = s.split('.');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (s.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const parts = s.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (s.match(/^\d{2}-\d{2}-20206$/)) {
      const parts = s.split('-');
      return `2026-11-${parts[0]}`;
    }
    return s;
  }
  if (num < 1000) return '';
  const date = new Date(Math.round((num - 25569) * 86400 * 1000));
  if (isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function splitName(fullName) {
  let clean = fullName.trim().replace(/\s+/g, ' ');
  if (!clean) return { first: 'UNKNOWN', middle: '', last: '.' };

  const endInitialMatch = clean.match(/^(.+?)\s+([A-Z])$/i);
  if (endInitialMatch) {
    const namePart = endInitialMatch[1].trim();
    const initial = endInitialMatch[2].toUpperCase();
    const parts = namePart.split(' ');
    if (parts.length === 1) return { first: parts[0], middle: '', last: initial };
    return { first: parts[0], middle: parts.slice(1).join(' '), last: initial };
  }

  const startInitialMatch = clean.match(/^([A-Z])[\.\s]+(.+)$/i);
  if (startInitialMatch) {
    const initial = startInitialMatch[1].toUpperCase();
    const namePart = startInitialMatch[2].trim();
    const parts = namePart.split(' ');
    if (parts.length === 1) return { first: parts[0], middle: '', last: initial };
    return { first: parts[0], middle: parts.slice(1).join(' '), last: initial };
  }

  const parts = clean.split(' ');
  if (parts.length === 1) return { first: parts[0], middle: '', last: '.' };
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
  return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
}

const p1 = parseCSV(fs.readFileSync('scripts/raw_part1.csv', 'utf8'));

// Filter out duplicate Kishore and blank row Dharinish
const seenAadhaar = new Set();
const cleanRows = [];
p1.forEach((r, idx) => {
  const name = (r['NAME'] || '').trim();
  const aadhaar = (r['Aadhar Number'] || '').replace(/\D/g, '');
  const empNo = (r['EMP NO'] || '').trim();
  if (!name && !aadhaar && !empNo) return;
  if (name === 'DHARINISH' && !aadhaar && !empNo) return;

  if (aadhaar && seenAadhaar.has(aadhaar)) return;
  if (aadhaar) seenAadhaar.add(aadhaar);
  cleanRows.push({ ...r, _origLine: idx + 2 });
});

// Filter ONLY LIVE employees (omit all 87 LEFT employees completely)
const liveRows = cleanRows.filter(r => (r['STATUS'] || 'LIVE').trim().toUpperCase() === 'LIVE');
console.log(`Processing exactly ${liveRows.length} ACTIVE (LIVE) employees.`);

// Now allocate proper codes:
// 1. Official EEV codes (e.g. EEV8420)
// 2. SUB01 -> SUB01
// 3. Numeric badges (1, 2, 4..22) -> TEMP-01, TEMP-02, ...
// 4. Blank unassigned -> TEMP-23, TEMP-24...
let nextTempNum = 23;

const liveCleaned = [];

liveRows.forEach(r => {
  const rawCode = (r['EMP NO'] || '').trim().toUpperCase();
  const rawName = (r['NAME'] || '').trim();
  const fatherName = (r['FATHER NAME'] || '').trim();
  const { first, middle, last } = splitName(rawName);

  let empCode = '';
  let legacyBadge = '';

  if (rawCode.startsWith('EEV')) {
    empCode = rawCode;
    legacyBadge = rawCode;
  } else if (rawCode === 'SUB01' || rawCode.startsWith('SUB')) {
    empCode = 'SUB01';
    legacyBadge = 'SUB01';
  } else if (/^\d+$/.test(rawCode)) {
    const badgeNum = parseInt(rawCode, 10);
    empCode = `TEMP-${String(badgeNum).padStart(2, '0')}`;
    legacyBadge = `Badge #${rawCode}`;
  } else {
    empCode = `TEMP-${String(nextTempNum++).padStart(2, '0')}`;
    legacyBadge = `Unassigned (Row ${r._origLine})`;
  }

  // Department and Designation mapping
  const rawDept = (r['DEPARTMENT'] || '').trim().toUpperCase();
  const rawDesig = (r['DESIGNATION'] || '').trim().toUpperCase();
  const unitSNo = (r['UNIT S.No'] || '').trim().toUpperCase();

  let finalDept = 'B-PACK';
  let finalDesig = 'PRODUCTION ASSOCIATE';

  // Determine designation
  if (unitSNo.includes('INTERN') || rawDesig.includes('INTERN')) {
    finalDesig = 'INTERN-PRODUCTION ASSOCIATE';
  } else if (rawDesig.includes('TRAINEE')) {
    finalDesig = 'TRAINEE-PRODUCTION ASSOCIATE';
  } else if (rawDesig.includes('QUALITY') || rawDesig === 'QC') {
    finalDesig = 'QUALITY CONTROL';
  } else if (rawDesig.includes('FORKLIFT')) {
    finalDesig = 'FORKLIFT OPERATOR';
  } else if (rawDesig.includes('MPL')) {
    finalDesig = 'MPL';
  } else if (rawDesig.includes('MAINTENANCE')) {
    finalDesig = 'MAINTENANCE';
  } else if (rawDesig.includes('EHS')) {
    finalDesig = 'EHS';
  } else if (rawDesig.includes('HOUSE') || rawDesig === 'HK') {
    finalDesig = 'OPERATIONS';
  } else {
    finalDesig = 'PRODUCTION ASSOCIATE';
  }

  // Determine department
  if (rawDept === 'BESS') {
    finalDept = 'BESS';
  } else if (rawDept === 'MPL' || finalDesig === 'MPL' || finalDesig === 'FORKLIFT OPERATOR') {
    finalDept = 'MPL';
  } else if (rawDept === 'QC' || finalDesig === 'QUALITY CONTROL') {
    finalDept = 'QC';
  } else if (rawDept === 'E-BOX') {
    finalDept = 'E-BOX';
  } else if (rawDept === 'HK' || rawDept === 'STORE' || rawDept === 'STORES' || finalDesig === 'OPERATIONS' || finalDesig === 'EHS') {
    finalDept = 'Operations';
  } else if (rawDept === 'B-PACK') {
    finalDept = 'B-PACK';
  } else {
    // If rawDept is blank, assign logically based on designation or unit
    if (finalDesig === 'MPL' || finalDesig === 'FORKLIFT OPERATOR') {
      finalDept = 'MPL';
    } else if (finalDesig === 'QUALITY CONTROL') {
      finalDept = 'QC';
    } else if (finalDesig === 'OPERATIONS' || finalDesig === 'EHS') {
      finalDept = 'Operations';
    } else if (unitSNo.includes('INTERN')) {
      finalDept = 'BESS'; // Default interns to BESS or B-PACK
    } else {
      finalDept = 'B-PACK';
    }
  }

  // Email
  let rawEmail = (r['EMAIL ID'] || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let workEmail = '';
  if (rawEmail && emailRegex.test(rawEmail.replace(/\s+/g, ''))) {
    workEmail = rawEmail.replace(/\s+/g, '').replace(/,com$/i, '.com');
  } else {
    workEmail = `${empCode.toLowerCase()}@electraev.local`;
  }

  // Phone
  let rawPhone = (r['Mobile NO'] || '').replace(/\D/g, '');
  let phone = rawPhone;
  if (!phone || phone.length < 10) {
    phone = '9840000000'; // Default plant reachable contact fallback
  } else if (phone.length > 10) {
    phone = phone.slice(-10);
  }

  const dob = excelSerialToDateStr(r['DOB']);
  const doj = excelSerialToDateStr(r['D.O.J']) || '2026-01-19';

  liveCleaned.push({
    employee_code: empCode,
    first_name: first,
    middle_name: middle,
    last_name: last,
    display_name: rawName,
    father_name: fatherName,
    work_email: workEmail,
    phone: phone,
    gender: (r['Gender'] || 'MALE').toUpperCase().includes('FEMALE') ? 'FEMALE' : 'MALE',
    dob: dob || '2000-01-01',
    doj: doj,
    department: finalDept,
    designation: finalDesig,
    employment_type: finalDesig.includes('INTERN') ? 'INTERN' : finalDesig.includes('TRAINEE') ? 'TRAINEE' : 'CONTRACT',
    employment_status: 'ACTIVE',
    aadhaar: (r['Aadhar Number'] || '').replace(/\D/g, ''),
    legacy_badge: legacyBadge
  });
});

console.log(`Successfully prepared ${liveCleaned.length} live cleaned records.`);

// Department breakdown
const deptCounts = {};
liveCleaned.forEach(e => {
  deptCounts[e.department] = (deptCounts[e.department] || 0) + 1;
});
console.log('Department breakdown of 217 LIVE employees:', deptCounts);

// Code breakdown
const codeBreakdown = { eev: 0, sub: 0, temp: 0 };
liveCleaned.forEach(e => {
  if (e.employee_code.startsWith('EEV')) codeBreakdown.eev++;
  else if (e.employee_code.startsWith('SUB')) codeBreakdown.sub++;
  else codeBreakdown.temp++;
});
console.log('Code breakdown:', codeBreakdown);

