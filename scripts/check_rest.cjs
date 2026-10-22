const fetch = globalThis.fetch || require('node-fetch');

async function checkRest() {
  const key = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
  const url = 'https://ysiajemrqakfngasehhi.supabase.co/rest/v1/attendance_punches?select=punch_type,punch_time&limit=5';
  const res = await fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
  console.log('attendance_punches status:', res.status, await res.json());

  const urlDaily = 'https://ysiajemrqakfngasehhi.supabase.co/rest/v1/attendance_daily?select=*&limit=5';
  const resDaily = await fetch(urlDaily, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
  console.log('attendance_daily status:', resDaily.status, await resDaily.json());
}

checkRest();
