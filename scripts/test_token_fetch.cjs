const fetch = globalThis.fetch || require('node-fetch');

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAdminToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;
  const res = await fetch('https://ysiajemrqakfngasehhi.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'marimuthu@joycorporatesolutions.com', password: 'joypeoplehr' })
  });
  const data = await res.json();
  if (data?.access_token) {
    cachedToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in || 3600) * 1000 - 60000;
    return cachedToken;
  }
  return null;
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

async function run() {
  const empId = '0ce6436c-e9b4-4e0e-9102-93ea238be0df';
  const todayStr = '2026-10-14';
  const startOfDay = `${todayStr}T00:00:00.000Z`;

  const punches = await testFetch(`attendance_punches?select=punch_type,punch_time,verification_mode&employee_id=eq.${empId}&punch_time=gte.${startOfDay}&order=punch_time.asc`);
  console.log('Today punches for Dharun:', punches);

  const daily = await testFetch(`attendance_daily?select=*&employee_id=eq.${empId}&attendance_date=eq.${todayStr}`);
  console.log('Today daily for Dharun:', daily);
}

run();
