import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testJoin() {
  console.log('--- 1. Fetching leave_requests with employee & leave_type ---');
  const { data: requests, error: reqErr } = await supabase
    .from('leave_requests')
    .select(`
      id,
      organization_id,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      total_days,
      is_half_day,
      reason,
      status,
      approved_by,
      approved_at,
      created_at,
      employees:employee_id (
        id,
        first_name,
        last_name,
        employee_code,
        department_id,
        departments:department_id (id, name),
        designations:designation_id (id, title)
      ),
      leave_types:leave_type_id (
        id,
        name,
        code,
        is_carry_forward_allowed,
        max_carry_forward_days
      )
    `);

  if (reqErr) {
    console.error('Req error:', reqErr);
  } else {
    console.log(`Fetched ${requests.length} requests:`);
    requests.forEach(r => {
      console.log(`- [${r.employees?.employee_code || 'N/A'}] ${r.employees?.first_name} ${r.employees?.last_name || ''} | ${r.leave_types?.name} (${r.leave_types?.code}) | ${r.start_date} to ${r.end_date} (${r.total_days}d) | Status: ${r.status} | Dept: ${r.employees?.departments?.name || 'N/A'}`);
    });
  }

  console.log('\n--- 2. Fetching leave_balances with employee & leave_type ---');
  const { data: balances, error: balErr } = await supabase
    .from('leave_balances')
    .select(`
      id,
      organization_id,
      employee_id,
      leave_type_id,
      calendar_year,
      opening_balance,
      accrued,
      consumed,
      closing_balance,
      employees:employee_id (
        id,
        first_name,
        last_name,
        employee_code,
        department_id,
        departments:department_id (id, name),
        designations:designation_id (id, title)
      ),
      leave_types:leave_type_id (
        id,
        name,
        code,
        annual_quota,
        is_carry_forward_allowed,
        max_carry_forward_days,
        is_encashable
      )
    `);

  if (balErr) {
    console.error('Bal error:', balErr);
  } else {
    console.log(`Fetched ${balances.length} balances:`);
    balances.forEach(b => {
      console.log(`- [${b.employees?.employee_code || 'N/A'}] ${b.employees?.first_name} ${b.employees?.last_name || ''} | ${b.leave_types?.name} (${b.leave_types?.code}) | Open: ${b.opening_balance}, Acc: ${b.accrued}, Cons: ${b.consumed}, Close: ${b.closing_balance}`);
    });
  }

  console.log('\n--- 3. Total active employees in org ---');
  const { count, data: emps } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employee_code, department_id, departments:department_id(name), designations:designation_id(title)', { count: 'exact' });
  console.log(`Total employees: ${count}`);
  if (emps && emps.length > 0) {
    console.log('Sample emps:', emps.slice(0, 3).map(e => `${e.employee_code}: ${e.first_name} ${e.last_name || ''} (${e.departments?.name})`));
  }
}

testJoin();
