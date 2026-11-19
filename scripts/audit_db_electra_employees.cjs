const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function check() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  // 1. Count total employees for Electra EV in DB
  const res = await fetch(SUPABASE_URL + `/rest/v1/employees?organization_id=eq.${orgId}&select=id,employee_code,first_name,last_name,employment_type,employment_status`, {
    headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, Prefer: 'count=exact' }
  });
  const count = res.headers.get('content-range');
  const data = await res.json();
  console.log('Total in Supabase employees table:', count, 'Length:', data.length);

  // 2. Check vendor_id or employment_source column if present
  const colRes = await fetch(SUPABASE_URL + `/rest/v1/employees?limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY }
  });
  const sample = await colRes.json();
  console.log('Employee table keys:', Object.keys(sample[0] || {}));
}

check().catch(console.error);

