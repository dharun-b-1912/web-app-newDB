const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc');

async function run() {
  const joyOrg = '0c621892-e938-4707-9957-13534ea32c19';
  const electraOrg = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';

  const { count: jCount } = await s.from('employees').select('id', { count: 'exact', head: true }).eq('organization_id', joyOrg);
  const { count: eCount } = await s.from('employees').select('id', { count: 'exact', head: true }).eq('organization_id', electraOrg);

  const { data: jDevs } = await s.from('biometric_devices').select('*').eq('organization_id', joyOrg);
  const { data: eDevs } = await s.from('biometric_devices').select('*').eq('organization_id', electraOrg);

  console.log('Joy Corporate Employees in DB:', jCount);
  console.log('Electra EV Employees in DB:', eCount);
  console.log('Joy Corporate Devices in DB:', jDevs);
  console.log('Electra EV Devices in DB:', eDevs);
}
run();
