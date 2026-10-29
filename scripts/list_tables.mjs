// scripts/list_tables.mjs
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function list() {
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  // We can query via PostgREST or RPC or inspect OpenAPI schema:
  const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SERVICE_ROLE_KEY}`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });

  const text = await res.text();
  let schema = null;
  try {
    schema = JSON.parse(text);
  } catch (e) {
    console.log('Failed parse:', text.slice(0, 200));
  }

  if (schema && schema.definitions) {
    console.log('Tables found in definitions:');
    const tableNames = Object.keys(schema.definitions);
    console.log(tableNames.filter(t => t.includes('payroll') || t.includes('attend') || t.includes('cycle') || t.includes('leave') || t.includes('shift') || t.includes('org')));
  } else if (schema && schema.paths) {
    console.log('Paths found:');
    const paths = Object.keys(schema.paths).map(p => p.replace('/', ''));
    console.log(paths.filter(t => t.includes('payroll') || t.includes('attend') || t.includes('cycle') || t.includes('leave') || t.includes('shift') || t.includes('org')));
  } else {
    console.log('No definitions/paths found');
  }
}

list();
