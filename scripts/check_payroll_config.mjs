// scripts/check_payroll_config.mjs
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function fetchTable(name) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${name}?limit=5`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    });
    const data = await res.json();
    return { name, ok: res.ok, status: res.status, count: Array.isArray(data) ? data.length : 0, data };
  } catch (e) {
    return { name, error: e.message };
  }
}

async function run() {
  const tables = [
    'payroll_settings',
    'payroll_cycles',
    'attendance_policies',
    'organization_settings',
    'companies',
    'organizations'
  ];

  for (const t of tables) {
    const r = await fetchTable(t);
    console.log(`Table ${t}: status=${r.status}, count=${r.count}`);
    if (r.data && Array.isArray(r.data) && r.data.length > 0) {
      console.log(`Sample row from ${t}:`, JSON.stringify(r.data[0], null, 2));
    }
  }
}

run();
