const fetch = globalThis.fetch || require('node-fetch');

let cachedToken = null;

async function getAdminToken() {
  if (cachedToken) return cachedToken;
  const res = await fetch('https://ysiajemrqakfngasehhi.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'marimuthu@joycorporatesolutions.com', password: 'joypeoplehr' })
  });
  const data = await res.json();
  cachedToken = data.access_token;
  return cachedToken;
}

async function testFetch(endpoint) {
  const token = await getAdminToken();
  const url = `https://ysiajemrqakfngasehhi.supabase.co/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
      'Authorization': `Bearer ${token}`
    }
  });
  return await res.json();
}

async function main() {
  const schedules = await testFetch('attendance_report_schedules?select=*');
  console.log('Schedules count:', schedules?.length);
  console.log('Schedules:', JSON.stringify(schedules, null, 2));

  const logs = await testFetch('attendance_report_logs?select=*&order=executed_at.desc&limit=5');
  console.log('Recent logs:', JSON.stringify(logs, null, 2));
}

main();
