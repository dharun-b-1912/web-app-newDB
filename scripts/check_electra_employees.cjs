const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function check() {
  const res = await fetch(SUPABASE_URL + '/rest/v1/employees?organization_id=eq.c5ab6b03-adde-47cc-a033-064f4c39b21e&select=id,employee_code,first_name,last_name,department_id,branch_id', {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Prefer': 'count=exact'
    }
  });
  const count = res.headers.get('content-range');
  const data = await res.json();
  console.log('Electra EV Employees Count:', count || data.length);
  console.log('Sample Electra EV Employees (first 3):', data.slice(0, 3));
}

check().catch(console.error);

