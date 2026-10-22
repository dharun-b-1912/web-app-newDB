import fetch from 'node-fetch';

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

async function getThirumalaiToken() {
  // Try logging in as Thirumalai
  const res = await fetch('https://ysiajemrqakfngasehhi.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'thirumalai@joyglobalcorp.com', password: 'joypeoplehr' })
  });
  const data = await res.json();
  return data.access_token;
}

async function testRls() {
  const tToken = await getThirumalaiToken();
  console.log('Thirumalai token obtained:', !!tToken);

  if (tToken) {
    // Try querying Praveen B using Thirumalai's token
    const mgrId = '55f486f8-e3aa-4133-9e85-dfc519ed2825';
    const mgrRes = await fetch(`https://ysiajemrqakfngasehhi.supabase.co/rest/v1/employees?id=eq.${mgrId}&select=id,first_name,last_name,display_name`, {
      headers: {
        'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
        'Authorization': `Bearer ${tToken}`
      }
    });
    const mgrData = await mgrRes.json();
    console.log('Query Praveen B with Thirumalai token:', mgrData);
  } else {
    console.log('Could not log in as Thirumalai directly.');
  }
}

testRls().catch(console.error);
