import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkAdmin() {
  const { data: emps, error } = await admin.from('employees').select('id, first_name, organization_id, company_id').limit(1);
  console.log('Admin query employees:', emps, error);

  if (emps && emps[0]) {
    const orgId = emps[0].organization_id;
    const compId = emps[0].company_id;

    const testAsset = {
      organization_id: orgId,
      company_id: compId,
      asset_code: 'AST-TEST-SERVICE-01',
      name: 'Industrial Safety Helmet & Vest Kit',
      category: 'HARDWARE',
      serial_number: 'PPE-01',
      purchase_date: '2026-10-16',
      purchase_cost: 850,
      status: 'AVAILABLE'
    };

    const { data: insData, error: insErr } = await admin.from('assets').insert([testAsset]).select();
    console.log('Admin Asset Insert Result:', insErr ? insErr : 'SUCCESS! ' + JSON.stringify(insData));

    if (insData && insData[0]) {
      console.log('Successfully inserted asset:', insData[0]);
      // Test assignment
      const testAsgn = {
        organization_id: orgId,
        asset_id: insData[0].id,
        employee_id: emps[0].id,
        assigned_date: '2026-10-16',
        condition_on_assignment: 'New',
        status: 'ACTIVE'
      };
      const { data: asgnData, error: asgnErr } = await admin.from('asset_assignments').insert([testAsgn]).select();
      console.log('Admin Assignment Insert Result:', asgnErr ? asgnErr : 'SUCCESS! ' + JSON.stringify(asgnData));

      // Clean up probe records
      if (asgnData?.[0]) await admin.from('asset_assignments').delete().eq('id', asgnData[0].id);
      await admin.from('assets').delete().eq('id', insData[0].id);
      console.log('Cleaned up test probe.');
    }
  }
}

checkAdmin().catch(console.error);
