const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function syncVendorWorkers() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const vendorId = 'efa06c62-4197-4c85-93eb-6d490dfd4302';
  const companyId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';

  // 1. Fetch all 171 Electra EV employees
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .eq('organization_id', orgId);

  console.log('Electra EV Employees fetched:', emps?.length);

  // 2. Fetch existing vendor_workers for Electra EV
  const { data: existingVw } = await supabase
    .from('vendor_workers')
    .select('id, employee_id, worker_code')
    .eq('organization_id', orgId);

  console.log('Existing vendor_workers for Electra EV:', existingVw?.length);

  const existingEmpIds = new Set((existingVw || []).map(w => w.employee_id).filter(Boolean));
  const missingEmps = (emps || []).filter(e => !existingEmpIds.has(e.id));
  console.log('Missing vendor_workers to insert:', missingEmps.length);

  if (missingEmps.length > 0) {
    const toInsert = missingEmps.map(e => ({
      organization_id: orgId,
      vendor_id: vendorId,
      employee_id: e.id,
      worker_code: e.employee_code,
      full_name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_code,
      first_name: e.first_name,
      last_name: e.last_name,
      phone: e.phone,
      email: e.work_email || e.personal_email,
      deployed_company_id: companyId,
      deployed_department_id: e.department_id,
      status: 'ACTIVE',
      work_location: 'Electra EV Plant',
      joining_date: e.doj || '2026-01-19',
      compliance_status: 'COMPLIANT'
    }));

    const { data: inserted, error: insErr } = await supabase
      .from('vendor_workers')
      .upsert(toInsert, { onConflict: 'id' })
      .select('id');

    if (insErr) {
      console.error('vendor_workers upsert error:', insErr);
    } else {
      console.log('✓ Successfully synced', inserted?.length, 'workers into vendor_workers for Joy Manpower Services.');
    }
  }
}
syncVendorWorkers();

