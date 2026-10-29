import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testEntitlementsEngine() {
  const [{ data: emps }, { data: types }, { data: reqs }, { data: balances }] = await Promise.all([
    supabase.from('employees').select('id, first_name, last_name, employee_code, department_id, departments:department_id(name), designations:designation_id(title)').order('employee_code'),
    supabase.from('leave_types').select('*').order('name'),
    supabase.from('leave_requests').select('*'),
    supabase.from('leave_balances').select('*')
  ]);

  console.log(`Employees: ${emps?.length}, Types: ${types?.length}, Requests: ${reqs?.length}, Balances: ${balances?.length}`);

  const entitlements = [];

  for (const emp of (emps || [])) {
    const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    const deptName = emp.departments?.name || 'General';
    const desigTitle = emp.designations?.title || 'Staff';

    for (const lt of (types || [])) {
      const explicitBal = (balances || []).find(b => b.employee_id === emp.id && b.leave_type_id === lt.id);

      const empRequests = (reqs || []).filter(r => r.employee_id === emp.id && r.leave_type_id === lt.id);
      const consumedFromReqs = empRequests
        .filter(r => (r.status || '').toUpperCase() === 'APPROVED')
        .reduce((sum, r) => sum + Number(r.total_days || 0), 0);
      const pendingFromReqs = empRequests
        .filter(r => (r.status || '').toUpperCase() === 'PENDING')
        .reduce((sum, r) => sum + Number(r.total_days || 0), 0);

      const quota = Number(lt.annual_quota || 12);
      const opening = explicitBal ? Number(explicitBal.opening_balance) : quota;
      const accrued = explicitBal ? Number(explicitBal.accrued) : quota;
      const consumed = explicitBal ? Number(explicitBal.consumed) : consumedFromReqs;
      const pending = pendingFromReqs;
      const closing = explicitBal ? Number(explicitBal.closing_balance) : (opening - consumed);
      const available = closing - pending;

      const isCarryForward = Boolean(lt.is_carry_forward_allowed);
      const maxCarryForward = Number(lt.max_carry_forward_days || 0);
      const carryForwardEligible = isCarryForward ? Math.min(Math.max(0, available), maxCarryForward) : 0;
      const lapsedDays = isCarryForward ? Math.max(0, available - maxCarryForward) : Math.max(0, available);

      entitlements.push({
        id: `ent-${emp.id}-${lt.id}`,
        employee_id: emp.id,
        employee_code: emp.employee_code,
        employee_name: empName,
        department_name: deptName,
        designation: desigTitle,
        leave_type_id: lt.id,
        leave_type_name: lt.name,
        leave_type_code: lt.code,
        period: '2026',
        opening_balance: opening,
        accrued: accrued,
        consumed: consumed,
        pending: pending,
        available_balance: available,
        closing_balance: closing,
        is_carry_forward_allowed: isCarryForward,
        max_carry_forward_days: maxCarryForward,
        carry_forward_eligible: carryForwardEligible,
        lapsed_days: lapsedDays,
        is_encashable: Boolean(lt.is_encashable),
      });
    }
  }

  console.log(`Generated ${entitlements.length} live corporate entitlements.`);
  const sample = entitlements.filter(e => e.consumed > 0 || e.pending > 0);
  console.log('Employees with leave activity:');
  sample.forEach(s => {
    console.log(`- [${s.employee_code}] ${s.employee_name} (${s.department_name}) | ${s.leave_type_code}: Open=${s.opening_balance}, Consumed=${s.consumed}, Pending=${s.pending}, Available=${s.available_balance}, CF_Eligible=${s.carry_forward_eligible}, Lapsed=${s.lapsed_days}`);
  });
}

testEntitlementsEngine();
