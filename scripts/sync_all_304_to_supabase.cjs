const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
const compId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';
const branchId = 'f192e38e-6ee2-44c2-ad6a-d87cb85992cb';

async function runSync() {
  console.log('--- Loading Department & Designation Maps for Electra EV ---');
  const { data: deps } = await supabase.from('departments').select('id, name').eq('organization_id', orgId);
  const { data: desigs } = await supabase.from('designations').select('id, title').eq('organization_id', orgId);

  const depMap = new Map();
  (deps || []).forEach(d => depMap.set(d.name.trim().toUpperCase(), d.id));

  const desigMap = new Map();
  (desigs || []).forEach(d => desigMap.set(d.title.trim().toUpperCase(), d.id));

  const defaultDeptId = depMap.get('B-PACK') || deps?.[0]?.id;
  const defaultDesigId = desigMap.get('PRODUCTION ASSOCIATE') || desigs?.[0]?.id;

  // Read master Excel file
  const wb = XLSX.readFile('Electra_EV_Master_Workforce_SaaS_Onboarding.xlsx');
  const sheet = wb.Sheets['SaaS Master Onboarding'];
  const employees = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  console.log(`Loaded ${employees.length} employees from Master Sheet.`);

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    const empCode = e['Employee Code'];
    const firstName = e['First Name'];
    const lastName = e['Last Name'] || '.';
    const displayName = `${firstName} ${lastName !== '.' ? lastName : ''}`.trim();
    // Unique work email per employee code to avoid collisions
    const email = `${empCode.toLowerCase()}@electraev.local`;
    const personalEmail = (e['Personal Email'] && e['Personal Email'].includes('@')) ? e['Personal Email'] : null;
    const phone = e['Mobile Number'] ? String(e['Mobile Number']).slice(-10) : null;
    const gender = e['Gender'] === 'FEMALE' ? 'FEMALE' : 'MALE';
    const dob = e['Date of Birth'] || '2000-01-01';
    const doj = e['Date of Joining'] || '2026-01-19';
    const status = e['Employment Status'] === 'ACTIVE' ? 'ACTIVE' : 'RESIGNED';
    const type = e['Employment Type'] === 'INTERN' ? 'INTERN' : 'CONTRACT';

    const rawDept = String(e['Department'] || '').trim().toUpperCase();
    const deptId = depMap.get(rawDept) || defaultDeptId;

    const rawDesig = String(e['Designation'] || '').trim().toUpperCase();
    const desigId = desigMap.get(rawDesig) || defaultDesigId;

    const payload = {
      organization_id: orgId,
      company_id: compId,
      branch_id: branchId,
      department_id: deptId,
      designation_id: desigId,
      employee_code: empCode,
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      work_email: email,
      personal_email: personalEmail,
      phone: phone,
      gender: gender,
      dob: dob,
      doj: doj,
      employment_type: type,
      employment_status: status,
      whatsapp_enabled: true,
      sms_enabled: false,
    };

    const { error } = await supabase.from('employees').upsert(payload, { onConflict: 'organization_id,employee_code' });
    if (error) {
      console.error(`Row ${i + 1} (${empCode}) Error:`, error.message);
      errors++;
    } else {
      inserted++;
    }
  }

  console.log(`\n✓ Successfully synced to Supabase PostgreSQL: ${inserted} employees (${errors} errors).`);

  // Verify total count in DB
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);
  console.log(`Current total employees in DB for Electra EV: ${count}`);
}

runSync();
