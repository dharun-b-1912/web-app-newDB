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
  const url = `https://ysiajemrqakfngasehhi.supabase.co/rest/v1/attendance_daily?attendance_date=eq.2026-10-15&select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
      'Authorization': `Bearer ${token}`
    }
  });
  const rows = await res.json();
  console.log('Count for 2026-10-15:', rows.length);
  if (rows.length > 0) {
    console.log('Sample row:', JSON.stringify(rows[0], null, 2));
    const present = rows.filter(r => r.status === 'Present' || r.status === 'Checked Out' || r.first_check_in).length;
    const late = rows.filter(r => (r.late_minutes || 0) > 0 || r.status === 'Late').length;
    console.log(`Present: ${present}, Late: ${late}`);
  }
}

main();
