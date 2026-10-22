const fetch = globalThis.fetch || require('node-fetch');

async function test() {
  const tokenRes = await fetch('https://ysiajemrqakfngasehhi.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'marimuthu@joycorporatesolutions.com', password: 'joypeoplehr' })
  });
  const token = (await tokenRes.json()).access_token;
  
  const res = await fetch('https://ysiajemrqakfngasehhi.supabase.co/rest/v1/employees?select=*&limit=5', {
    headers: { 'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj', 'Authorization': 'Bearer ' + token }
  });
  const emps = await res.json();
  console.log('Employees result:', emps);
}
test();
