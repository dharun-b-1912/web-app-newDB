const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function main() {
  console.log('=== STEP 1: PARSE AND CLEAN ACTIVE WORKFORCE (217 ROWS) ===');
  const p1 = parseCSV(fs.readFileSync('scripts/raw_part1.csv', 'utf8'));

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

  // ONLY LIVE WORKERS (Omit all 87 LEFT workers completely)
  const liveRows = cleanRows.filter(r => (r['STATUS'] || 'LIVE').trim().toUpperCase() === 'LIVE');
  console.log(`Active LIVE workers count: ${liveRows.length}`);

  let nextTempNum = 23;
  const activeEmployees = [];

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

    const rawDept = (r['DEPARTMENT'] || '').trim().toUpperCase();
    const rawDesig = (r['DESIGNATION'] || '').trim().toUpperCase();
    const unitSNo = (r['UNIT S.No'] || '').trim().toUpperCase();

    let finalDept = 'B-PACK';
    let finalDesig = 'PRODUCTION ASSOCIATE';

    // Designation
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

    // Department
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
      if (finalDesig === 'MPL' || finalDesig === 'FORKLIFT OPERATOR') finalDept = 'MPL';
      else if (finalDesig === 'QUALITY CONTROL') finalDept = 'QC';
      else if (finalDesig === 'OPERATIONS' || finalDesig === 'EHS') finalDept = 'Operations';
      else if (unitSNo.includes('INTERN')) finalDept = 'BESS';
      else finalDept = 'B-PACK';
    }

    // Email
    let rawEmail = (r['EMAIL ID'] || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let workEmail = '';
    if (rawEmail && emailRegex.test(rawEmail.replace(/\s+/g, ''))) {
      workEmail = rawEmail.replace(/\s+/g, '').replace(/,com$/i, '.com');
    } else {
      workEmail = `${empCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@electraev.local`;
    }

    // Phone
    let rawPhone = (r['Mobile NO'] || '').replace(/\D/g, '');
    let phone = rawPhone;
    if (!phone || phone.length < 10) {
      phone = '9840000000';
    } else if (phone.length > 10) {
      phone = phone.slice(-10);
    }

    const dob = excelSerialToDateStr(r['DOB']) || '2000-01-01';
    const doj = excelSerialToDateStr(r['D.O.J']) || '2026-01-19';

    activeEmployees.push({
      employee_code: empCode,
      first_name: first,
      middle_name: middle,
      last_name: last,
      display_name: rawName,
      father_name: fatherName,
      work_email: workEmail,
      personal_email: rawEmail || workEmail,
      phone: phone,
      gender: (r['Gender'] || 'MALE').toUpperCase().includes('FEMALE') ? 'FEMALE' : 'MALE',
      dob: dob,
      doj: doj,
      department: finalDept,
      designation: finalDesig,
      employment_type: (finalDesig.includes('INTERN') || finalDesig.includes('TRAINEE')) ? 'INTERN' : 'CONTRACT',
      employment_status: 'ACTIVE',
      aadhaar: (r['Aadhar Number'] || '').replace(/\D/g, ''),
      pan: (r['PAN Number'] || '').trim().toUpperCase(),
      uan: (r['PF Number'] || '').replace(/\D/g, ''),
      pf_number: (r['PF Number'] || '').replace(/\D/g, ''),
      esi_number: (r['ESI number'] || '').replace(/\D/g, ''),
      bank_name: (r['Bank Name'] || 'STATE BANK OF INDIA').trim(),
      bank_account: (r['Bank Account Number'] || '').trim(),
      bank_ifsc: (r['Bank IFSC Code'] || '').trim(),
      current_address: (r['Current Address'] || 'Plant Campus, Coimbatore').trim(),
      city: (r['Current District'] || 'Coimbatore').trim(),
      state: (r['Worker Native State'] || 'TAMILNADU').trim().toUpperCase(),
      legacy_badge: legacyBadge
    });
  });

  console.log(`Prepared ${activeEmployees.length} active employees.`);

  // Sort primary by code, and prepare secondary alphabetical
  activeEmployees.sort((a, b) => a.employee_code.localeCompare(b.employee_code, undefined, { numeric: true }));

  console.log('\n=== STEP 2: GENERATE EXCEL WITH 217 ACTIVE WORKFORCE ONLY ===');
  const wb = XLSX.utils.book_new();

  // Sheet 1: SaaS Master Onboarding (47 Columns)
  const masterRows = activeEmployees.map(e => ({
    'Employee Code': e.employee_code,
    'First Name': e.first_name,
    'Middle Name': e.middle_name,
    'Last Name': e.last_name,
    'Work Email': e.work_email,
    'Personal Email': e.personal_email,
    'Mobile Number': e.phone,
    'Alternate Phone': '',
    'Gender': e.gender,
    'Date of Birth': e.dob,
    'Marital Status': 'Single',
    'Blood Group': 'O+',
    'Date of Joining': e.doj,
    'Department': e.department,
    'Designation': e.designation,
    'Work Location': 'Plant Branch — Coimbatore',
    'Work Mode': 'On-Site / Plant',
    'Employment Type': e.employment_type,
    'Employment Status': 'ACTIVE',
    'Reporting Manager Code': 'JCS-013',
    'Employment Source': 'VENDOR',
    'Vendor Name': 'Joy Manpower Services',
    'Probation Months': e.employment_type === 'CONTRACT' ? 0 : 3,
    'Notice Period Days': 15,
    'Annual CTC': e.employment_type === 'INTERN' ? 144000 : 216000,
    'Monthly Gross': e.employment_type === 'INTERN' ? 12000 : 18000,
    'Tax Regime': 'New Tax Regime (Sec 115BAC)',
    'Bank Name': e.bank_name,
    'Account Number': e.bank_account,
    'IFSC Code': e.bank_ifsc,
    'Account Holder Name': e.display_name,
    'Account Type': 'Savings',
    'PAN Number': e.pan,
    'UAN Number': e.uan,
    'PF Number': e.pf_number,
    'PF Applicable': e.pf_number ? 'Yes' : 'No',
    'ESIC Number': e.esi_number,
    'ESI Applicable': e.esi_number ? 'Yes' : 'No',
    'Aadhaar Number': e.aadhaar,
    'Current Address': e.current_address,
    'City': e.city,
    'State': e.state,
    'Postal Code': '641668',
    'Permanent Address': e.current_address,
    'Emergency Contact Name': e.father_name,
    'Emergency Contact Phone': e.phone,
    'Emergency Relationship': 'Father'
  }));

  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  XLSX.utils.book_append_sheet(wb, wsMaster, 'SaaS Master Onboarding');

  // Sheet 2: Alphabetical by Name
  const alphaRows = [...activeEmployees]
    .sort((a, b) => a.display_name.localeCompare(b.display_name))
    .map((e, idx) => ({
      'S.No': idx + 1,
      'Full Name': e.display_name,
      'Employee Code': e.employee_code,
      'Department': e.department,
      'Designation': e.designation,
      'Work Email': e.work_email,
      'Mobile Number': e.phone,
      'Status': 'ACTIVE',
      'Joining Date': e.doj
    }));
  const wsAlpha = XLSX.utils.json_to_sheet(alphaRows);
  XLSX.utils.book_append_sheet(wb, wsAlpha, 'Alphabetical by Name');

  // Sheet 3: Regular Plant Operators (Non-interns)
  const regularRows = activeEmployees
    .filter(e => !e.designation.includes('INTERN') && !e.designation.includes('TRAINEE'))
    .map((e, idx) => ({
      'S.No': idx + 1,
      'Employee Code': e.employee_code,
      'Name': e.display_name,
      'Department': e.department,
      'Designation': e.designation,
      'Mobile Number': e.phone,
      'Father Name': e.father_name,
      'Joining Date': e.doj
    }));
  const wsReg = XLSX.utils.json_to_sheet(regularRows);
  XLSX.utils.book_append_sheet(wb, wsReg, 'Regular Plant Operators');

  // Sheet 4: Interns & Trainees
  const internRows = activeEmployees
    .filter(e => e.designation.includes('INTERN') || e.designation.includes('TRAINEE'))
    .map((e, idx) => ({
      'S.No': idx + 1,
      'Employee Code': e.employee_code,
      'Name': e.display_name,
      'Category': e.designation.includes('INTERN') ? 'College Intern' : 'Graduate Trainee',
      'Department': e.department,
      'Designation': e.designation,
      'Mobile Number': e.phone,
      'Joining Date': e.doj
    }));
  const wsIntern = XLSX.utils.json_to_sheet(internRows);
  XLSX.utils.book_append_sheet(wb, wsIntern, 'Interns & Trainees');

  // Sheet 5: Analytics
  const deptDist = {};
  activeEmployees.forEach(e => { deptDist[e.department] = (deptDist[e.department] || 0) + 1; });
  const analyticsRows = [
    { 'Metric': 'Total Active Workforce', 'Count / Value': activeEmployees.length },
    { 'Metric': 'Official EEV Series (EEV8420 - EEV8759)', 'Count / Value': activeEmployees.filter(e => e.employee_code.startsWith('EEV')).length },
    { 'Metric': 'SUB01 Badge', 'Count / Value': 1 },
    { 'Metric': 'Temporary Badges (TEMP-01 to TEMP-45)', 'Count / Value': activeEmployees.filter(e => e.employee_code.startsWith('TEMP')).length },
    { 'Metric': 'Exited Records (LEFT)', 'Count / Value': '0 (Completely Removed)' },
    { 'Metric': 'Department: B-PACK (Battery Pack Assembly)', 'Count / Value': deptDist['B-PACK'] || 0 },
    { 'Metric': 'Department: BESS (Battery Storage Systems)', 'Count / Value': deptDist['BESS'] || 0 },
    { 'Metric': 'Department: MPL (Logistics & Forklifts)', 'Count / Value': deptDist['MPL'] || 0 },
    { 'Metric': 'Department: Operations (Stores, EHS, Facilities)', 'Count / Value': deptDist['Operations'] || 0 },
    { 'Metric': 'Department: QC (Quality Control & Testing)', 'Count / Value': deptDist['QC'] || 0 },
    { 'Metric': 'Department: E-BOX (Junction Boxes)', 'Count / Value': deptDist['E-BOX'] || 0 },
    { 'Metric': 'Sourcing Model', 'Count / Value': 'VENDOR (Joy Manpower Services)' },
    { 'Metric': 'SMS Channel Status', 'Count / Value': 'Suppressed (sms_enabled = false)' }
  ];
  const wsAnalytics = XLSX.utils.json_to_sheet(analyticsRows);
  XLSX.utils.book_append_sheet(wb, wsAnalytics, 'Workforce Analytics');

  const rootExcelPath = path.join(__dirname, '..', 'Electra_EV_Master_Workforce_SaaS_Onboarding.xlsx');
  const publicExcelPath = path.join(__dirname, '..', 'public', 'Electra_EV_Master_Workforce_SaaS_Onboarding.xlsx');

  XLSX.writeFile(wb, rootExcelPath);
  XLSX.writeFile(wb, publicExcelPath);
  console.log(`Saved Excel files to ${rootExcelPath} and ${publicExcelPath}`);

  console.log('\n=== STEP 3: SYNC 217 ACTIVE EMPLOYEES TO SUPABASE ===');
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const companyId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';
  const branchId = 'f192e38e-6ee2-44c2-ad6a-d87cb85992cb';

  // Get departments
  const { data: dbDepts } = await supabase.from('departments').select('id, name').eq('organization_id', orgId);
  const deptMap = {};
  dbDepts.forEach(d => { deptMap[d.name] = d.id; });
  console.log('DB departments:', deptMap);

  // Get designations
  const { data: dbDesigs } = await supabase.from('designations').select('id, title').eq('organization_id', orgId);
  const desigMap = {};
  if (dbDesigs) {
    dbDesigs.forEach(d => { desigMap[d.title] = d.id; });
  }
  console.log('DB designations:', desigMap);

  // Find reporting manager Shalini J (JCS-013)
  const { data: mgrRows } = await supabase.from('employees').select('id').eq('employee_code', 'JCS-013').limit(1);
  const reportingManagerId = mgrRows && mgrRows[0] ? mgrRows[0].id : null;

  // 1. DELETE ALL EXISTING EMPLOYEES FOR ELECTRA EV (Purges all 87 exited and old temp records)
  console.log('Purging all existing Electra EV employees to achieve 100% clean state...');
  const { error: delErr } = await supabase
    .from('employees')
    .delete()
    .eq('organization_id', orgId);

  if (delErr) {
    console.error('Delete error:', delErr);
    return;
  }
  console.log('Existing Electra EV employees deleted successfully.');

  // 2. INSERT THE 217 ACTIVE EMPLOYEES IN CHUNKS
  console.log(`Inserting ${activeEmployees.length} clean active employees...`);
  const chunkSize = 50;
  for (let i = 0; i < activeEmployees.length; i += chunkSize) {
    const chunk = activeEmployees.slice(i, i + chunkSize);
    const dbRows = chunk.map(e => ({
      organization_id: orgId,
      company_id: companyId,
      branch_id: branchId,
      department_id: deptMap[e.department] || null,
      designation_id: desigMap[e.designation] || null,
      reporting_manager_id: reportingManagerId,
      employee_code: e.employee_code,
      first_name: e.first_name,
      middle_name: e.middle_name || null,
      last_name: e.last_name || '.',
      display_name: e.display_name,
      work_email: e.work_email,
      personal_email: e.personal_email,
      phone: e.phone,
      gender: e.gender,
      dob: e.dob,
      doj: e.doj,
      employment_type: e.employment_type,
      employment_status: 'ACTIVE',
      whatsapp_enabled: true,
      sms_enabled: false, // Strict Electra EV SMS cost control
      communication_preference: 'WHATSAPP'
    }));

    const { error: insertErr } = await supabase.from('employees').insert(dbRows);
    if (insertErr) {
      console.error(`Insert error at chunk ${i}:`, insertErr);
    } else {
      console.log(`Chunk ${i / chunkSize + 1} (${chunk.length} employees) inserted successfully.`);
    }
  }

  // Verify final count in Supabase
  const { count: finalCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  console.log(`\n=== FINAL VERIFICATION ===`);
  console.log(`Final Electra EV headcount in Supabase: ${finalCount}`);
  console.log(`Expected: 217 (0 Exited records, 0 Errors)`);
}

main().catch(console.error);
