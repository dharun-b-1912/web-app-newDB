import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function testJsonCondition() {
  const { data: emps } = await admin.from('employees').select('id, organization_id, company_id').limit(1);
  const orgId = emps[0].organization_id;
  const compId = emps[0].company_id;

  const { data: ast } = await admin.from('assets').insert([{
    organization_id: orgId,
    company_id: compId,
    asset_code: 'TEST-META-01',
    name: 'Industrial Torque Wrench & Uniform Kit',
    category: 'HARDWARE',
    serial_number: 'TW-4455 [RET:YES|DED:1200]',
    purchase_cost: 3500,
    status: 'ASSIGNED'
  }]).select('*');

  const metaPayload = JSON.stringify({
    condition: 'EXCELLENT',
    is_returnable: true,
    deduction_amount: 1200,
    expected_return_date: '2026-12-31',
    purpose: 'Machining & Assembly Floor',
    notes: 'Safety uniform and calibrated torque tool issued to technician'
  });

  const { data: asgn } = await admin.from('asset_assignments').insert([{
    organization_id: orgId,
    asset_id: ast[0].id,
    employee_id: emps[0].id,
    assigned_date: '2026-10-16',
    condition_on_assignment: metaPayload,
    status: 'ACTIVE'
  }]).select('*');

  console.log('Saved condition_on_assignment payload:', asgn[0].condition_on_assignment);
  const parsed = JSON.parse(asgn[0].condition_on_assignment);
  console.log('Parsed is_returnable:', parsed.is_returnable);
  console.log('Parsed deduction_amount:', parsed.deduction_amount);

  // Clean up
  await admin.from('asset_assignments').delete().eq('id', asgn[0].id);
  await admin.from('assets').delete().eq('id', ast[0].id);
  console.log('Test passed and cleaned up!');
}

testJsonCondition();
