const fetch = globalThis.fetch || require('node-fetch');

async function testAuth() {
  const res = await fetch('https://ysiajemrqakfngasehhi.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'marimuthu@joycorporatesolutions.com', password: 'joypeoplehr' })
  });
  const data = await res.json();
  console.log('Login success:', !!data.access_token);
  if (data.access_token) {
    const pRes = await fetch('https://ysiajemrqakfngasehhi.supabase.co/rest/v1/attendance_punches?select=id,punch_time&limit=3', {
      headers: {
        'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
        'Authorization': `Bearer ${data.access_token}`
      }
    });
    console.log('Punches with token:', pRes.status, await pRes.json());
  }
}

testAuth();
