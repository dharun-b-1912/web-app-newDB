async function testSupabase() {
  const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  };

  const endpoint = `employees?phone=ilike.*9384125278*&limit=1`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, { headers });
  const data = await res.json();
  console.log('Lookup by phone:', data);
}

testSupabase();
