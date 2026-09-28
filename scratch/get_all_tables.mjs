async function getTableList() {
  const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  const openapi = await res.json();
  const paths = Object.keys(openapi.paths || {}).map(p => p.replace(/^\//, ''));
  console.log('Available API tables/paths:', paths);
}

getTableList();
