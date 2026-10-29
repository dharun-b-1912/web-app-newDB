// scripts/inspect_payroll_tables.mjs
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function fetchTable(name) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${name}?limit=10`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  return res.json();
}

async function run() {
  console.log('--- PAYROLL PERIODS ---');
  const periods = await fetchTable('payroll_periods');
  console.log(JSON.stringify(periods, null, 2));

  console.log('--- PAYROLL STATUTORY CONFIGS ---');
  const stat = await fetchTable('payroll_statutory_configs');
  console.log(JSON.stringify(stat, null, 2));

  console.log('--- PAYROLL OT POLICIES ---');
  const ot = await fetchTable('payroll_ot_policies');
  console.log(JSON.stringify(ot, null, 2));
}

run();
