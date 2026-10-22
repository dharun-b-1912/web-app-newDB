import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

async function breakdown() {
  const { data: emps } = await admin.from('employees').select('id, employee_code, first_name, last_name, display_name');
  const { data: assigns } = await admin.from('employee_salary_assignments').select('*').eq('organization_id', ORG_ID);
  const { data: stats } = await admin.from('employee_statutory_details').select('*').eq('organization_id', ORG_ID);

  const statMap = new Map(stats.map(s => [s.employee_id, s]));
  const assignMap = new Map(assigns.map(a => [a.employee_id, a]));

  const rows = [];

  let grandGross = 0;
  let grandBasic = 0;
  let grandHra = 0;
  let grandSpecial = 0;
  let grandPfEmp = 0;
  let grandPfEmpr = 0;
  let grandEsiEmp = 0;
  let grandEsiEmpr = 0;
  let grandPt = 0;
  let grandNet = 0;
  let grandCtcCost = 0;

  for (const emp of emps) {
    const a = assignMap.get(emp.id);
    const s = statMap.get(emp.id);
    if (!a) continue;

    const gross = Number(a.monthly_gross || 0);
    const basic = Math.round(gross * 0.50);
    const hra = Math.round(gross * 0.30);
    const special = gross - basic - hra;

    // Statutory PF: 12% of basic, statutory wage ceiling is 15000 (max 1800) or actual
    const pfWage = Math.min(basic, 15000);
    const isPf = s ? s.is_pf_eligible : true;
    const pfEmp = isPf ? Math.round(pfWage * 0.12) : 0;
    const pfEmpr = isPf ? Math.round(pfWage * 0.12) : 0; // 3.67% EPF + 8.33% EPS

    // Statutory ESI: Applicable only if gross <= 21000
    const isEsi = gross <= 21000 && (s ? s.is_esi_eligible !== false : false);
    const esiEmp = isEsi ? Math.round(gross * 0.0075) : 0;
    const esiEmpr = isEsi ? Math.round(gross * 0.0325) : 0;

    // Professional Tax (Tamil Nadu half-yearly assessment monthly proration)
    const halfYearGross = gross * 6;
    const isPt = s ? s.is_pt_eligible !== false : true;
    const pt = isPt
      ? (halfYearGross > 75000 ? 208 : halfYearGross > 60000 ? 171 : halfYearGross > 45000 ? 115 : halfYearGross > 30000 ? 53 : halfYearGross > 21000 ? 23 : 0)
      : 0;

    const totalDeductions = pfEmp + esiEmp + pt;
    const netPay = gross - totalDeductions;
    const totalCost = gross + pfEmpr + esiEmpr;

    grandGross += gross;
    grandBasic += basic;
    grandHra += hra;
    grandSpecial += special;
    grandPfEmp += pfEmp;
    grandPfEmpr += pfEmpr;
    grandEsiEmp += esiEmp;
    grandEsiEmpr += esiEmpr;
    grandPt += pt;
    grandNet += netPay;
    grandCtcCost += totalCost;

    rows.push({
      code: emp.employee_code,
      name: `${emp.first_name} ${emp.last_name || ''}`.trim(),
      gross,
      basic,
      hra,
      special,
      pfEmp,
      pfEmpr,
      esiEmp,
      esiEmpr,
      pt,
      netPay,
      totalCost
    });
  }

  console.log('=== 21 EMPLOYEES DETAILED PAYROLL BREAKDOWN ===');
  console.table(rows.map(r => ({
    Code: r.code,
    Name: r.name,
    Gross: `₹${r.gross.toLocaleString('en-IN')}`,
    Basic: `₹${r.basic.toLocaleString('en-IN')}`,
    HRA: `₹${r.hra.toLocaleString('en-IN')}`,
    Special: `₹${r.special.toLocaleString('en-IN')}`,
    EPF_12: `₹${r.pfEmp.toLocaleString('en-IN')}`,
    ESI_075: `₹${r.esiEmp.toLocaleString('en-IN')}`,
    PT: `₹${r.pt.toLocaleString('en-IN')}`,
    NetTakeHome: `₹${r.netPay.toLocaleString('en-IN')}`,
  })));

  console.log('\n======================================================');
  console.log('=== GRAND TOTAL CONSOLIDATED PAYROLL REGISTER (₹) ===');
  console.log('======================================================');
  console.log(`Total Headcount:                 ${rows.length} Staff`);
  console.log(`1. Gross Wage Pool:              ₹${grandGross.toLocaleString('en-IN')}`);
  console.log(`   - Basic Salary (50%):         ₹${grandBasic.toLocaleString('en-IN')}`);
  console.log(`   - HRA (30%):                  ₹${grandHra.toLocaleString('en-IN')}`);
  console.log(`   - Special / Other Allowances: ₹${grandSpecial.toLocaleString('en-IN')}`);
  console.log(`------------------------------------------------------`);
  console.log(`2. Employee Deductions:          ₹${(grandPfEmp + grandEsiEmp + grandPt).toLocaleString('en-IN')}`);
  console.log(`   - Employee EPF (12%):         ₹${grandPfEmp.toLocaleString('en-IN')}`);
  console.log(`   - Employee ESIC (0.75%):      ₹${grandEsiEmp.toLocaleString('en-IN')}`);
  console.log(`   - Professional Tax (PT):      ₹${grandPt.toLocaleString('en-IN')}`);
  console.log(`------------------------------------------------------`);
  console.log(`3. Net Take-Home Payout:         ₹${grandNet.toLocaleString('en-IN')}`);
  console.log(`------------------------------------------------------`);
  console.log(`4. Employer Statutory Liability: ₹${(grandPfEmpr + grandEsiEmpr).toLocaleString('en-IN')}`);
  console.log(`   - Employer EPF + EPS (12%):   ₹${grandPfEmpr.toLocaleString('en-IN')}`);
  console.log(`   - Employer ESIC (3.25%):      ₹${grandEsiEmpr.toLocaleString('en-IN')}`);
  console.log(`------------------------------------------------------`);
  console.log(`5. Total Employer Payroll Cost:  ₹${grandCtcCost.toLocaleString('en-IN')}`);
  console.log('======================================================');
}

breakdown();
