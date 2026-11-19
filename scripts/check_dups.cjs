const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function run() {
  const r = await fetch(SUPABASE_URL + '/rest/v1/employees?organization_id=eq.c5ab6b03-adde-47cc-a033-064f4c39b21e&select=*', {
    headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY }
  });
  const list = await r.json();
  console.log('Total fetched:', list.length);
  const emails = {};
  const names = {};
  const codes = {};
  list.forEach(e => {
    const em = (e.work_email || e.personal_email || '').toLowerCase().trim();
    const nm = (e.first_name + ' ' + (e.last_name || '')).toLowerCase().trim();
    const cd = (e.employee_code || '').toUpperCase().trim();
    if (em) emails[em] = (emails[em] || 0) + 1;
    if (nm) names[nm] = (names[nm] || 0) + 1;
    if (cd) codes[cd] = (codes[cd] || 0) + 1;
  });
  const dupEmails = Object.entries(emails).filter(([k, v]) => v > 1);
  const dupNames = Object.entries(names).filter(([k, v]) => v > 1);
  const dupCodes = Object.entries(codes).filter(([k, v]) => v > 1);
  console.log('Duplicate emails count:', dupEmails.length, dupEmails);
  console.log('Duplicate names count:', dupNames.length, dupNames);
  console.log('Duplicate codes count:', dupCodes.length, dupCodes);
}
run();
