import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkCols() {
  const { data: emps } = await admin.from('employees').select('id, organization_id, company_id').limit(1);
  const orgId = emps[0].organization_id;
  const compId = emps[0].company_id;

  const { data, error } = await admin.from('assets').insert([{
    organization_id: orgId,
    company_id: compId,
    asset_code: 'INSPECT-ROW-01',
    name: 'Inspector Asset',
    category: 'HARDWARE',
    status: 'AVAILABLE'
  }]).select('*');

  console.log('Inserted row keys in assets:', Object.keys(data[0]));
  console.log('Inserted row data:', data[0]);

  // Insert assignment to inspect columns
  const { data: asgnData } = await admin.from('asset_assignments').insert([{
    organization_id: orgId,
    asset_id: data[0].id,
    employee_id: emps[0].id,
    assigned_date: '2026-10-16',
    status: 'ACTIVE'
  }]).select('*');

  console.log('Inserted row keys in asset_assignments:', Object.keys(asgnData[0]));
  console.log('Inserted assignment data:', asgnData[0]);

  // Clean up
  await admin.from('asset_assignments').delete().eq('id', asgnData[0].id);
  await admin.from('assets').delete().eq('id', data[0].id);
  console.log('Cleaned up inspect rows.');
}

checkCols();
