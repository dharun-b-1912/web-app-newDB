const fetch = globalThis.fetch || require('node-fetch');

async function getAdminToken() {
  const res = await fetch('https://ysiajemrqakfngasehhi.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'marimuthu@joycorporatesolutions.com', password: 'joypeoplehr' })
  });
  const data = await res.json();
  return data.access_token;
}

async function main() {
  const token = await getAdminToken();
  const url = `https://ysiajemrqakfngasehhi.supabase.co/rest/v1/attendance_report_schedules?id=eq.07c8fbf4-d483-484f-b902-c9edef5b5cef`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Delete status:', res.status);
}

main();
