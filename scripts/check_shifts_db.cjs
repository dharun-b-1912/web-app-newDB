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

async function checkShifts() {
  const shifts = await testFetch('shifts?select=*&limit=5');
  console.log('Shifts:', shifts);

  const empShift = await testFetch('attendance_daily?select=shift_id&limit=5');
  console.log('Daily shift_ids:', empShift);

  const empShiftsAssignment = await testFetch('employee_shifts?select=*&limit=5');
  console.log('employee_shifts:', empShiftsAssignment);
}

checkShifts();
