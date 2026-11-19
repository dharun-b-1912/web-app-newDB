const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
const compId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';
const branchId = 'f192e38e-6ee2-44c2-ad6a-d87cb85992cb';

async function importAll() {
  console.log('--- Loading Department & Designation Maps for Electra EV ---');
  const { data: deps } = await supabase.from('departments').select('id, name').eq('organization_id', orgId);
  const { data: desigs } = await supabase.from('designations').select('id, title').eq('organization_id', orgId);

  const depMap = new Map();
  (deps || []).forEach(d => depMap.set(d.name.trim().toUpperCase(), d.id));

  const desigMap = new Map();
  (desigs || []).forEach(d => desigMap.set(d.title.trim().toUpperCase(), d.id));

  const defaultDeptId = depMap.get('B-PACK') || deps?.[0]?.id;
  const defaultDesigId = desigMap.get('PRODUCTION ASSOCIATE') || desigs?.[0]?.id;

  console.log('--- Loading Excel File ---');
  const wb = XLSX.readFile('Electra_EV_Workforce_Cleaned_Production_Import.xlsx', { cellDates: true });
  const sheet = wb.Sheets['Employee Onboarding'];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  console.log(`Loaded ${rows.length} rows from Excel.`);

  let insertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const empCode = String(r['Employee Code'] || '').trim();
    if (!empCode) continue;

    const firstName = String(r['First Name'] || '').trim();
    const lastName = String(r['Last Name'] || '').trim() || '.';
    const displayName = `${firstName} ${lastName !== '.' ? lastName : ''}`.trim() || empCode;
    const workEmail = String(r['Work Email'] || `${empCode.toLowerCase()}@electraev.local`).trim();
    const personalEmail = String(r['Personal Email'] || '').trim() || null;
    const phone = String(r['Mobile Number'] || '').replace(/\D/g, '').slice(-10) || null;
    const gender = String(r['Gender'] || 'MALE').toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE';

    let dob = String(r['Date of Birth'] || '').trim();
    if (dob && !dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const d = new Date(dob);
      if (!isNaN(d.getTime())) dob = d.toISOString().split('T')[0];
      else dob = null;
    }
    if (!dob) dob = '2000-01-01';

    let doj = String(r['Date of Joining'] || '').trim();
    if (doj && !doj.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const d = new Date(doj);
      if (!isNaN(d.getTime())) doj = d.toISOString().split('T')[0];
      else doj = null;
    }
    if (!doj) doj = '2026-01-19';

    const rawDept = String(r['Department'] || '').trim().toUpperCase();
    const deptId = depMap.get(rawDept) || defaultDeptId;

    const rawDesig = String(r['Designation'] || '').trim().toUpperCase();
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
      work_email: workEmail,
      personal_email: personalEmail,
      phone: phone,
      gender: gender,
      dob: dob,
      doj: doj,
      employment_type: 'CONTRACT',
      employment_status: 'ACTIVE',
      whatsapp_enabled: true,
      sms_enabled: true,
    };

    const { error } = await supabase.from('employees').upsert(payload, { onConflict: 'organization_id,employee_code' });
    if (error) {
      console.error(`Row ${i + 1} (${empCode}) Error:`, error.message);
      errorCount++;
    } else {
      insertedCount++;
    }
  }

  console.log(`\nImport Finished! Successfully inserted/updated: ${insertedCount}, Errors: ${errorCount}`);
}

importAll().catch(console.error);

