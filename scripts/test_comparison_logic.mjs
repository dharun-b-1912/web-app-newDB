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
  const url15 = `https://ysiajemrqakfngasehhi.supabase.co/rest/v1/attendance_daily?attendance_date=eq.2026-10-15&select=*`;
  const res15 = await fetch(url15, {
    headers: {
      'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
      'Authorization': `Bearer ${token}`
    }
  });
  const rows15 = await res15.json();

  const urlEmp = `https://ysiajemrqakfngasehhi.supabase.co/rest/v1/employees?select=id,employee_code,first_name,last_name,display_name&employment_status=eq.ACTIVE`;
  const resEmp = await fetch(urlEmp, {
    headers: {
      'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
      'Authorization': `Bearer ${token}`
    }
  });
  const emps = await resEmp.json();

  console.log(`Employees: ${emps.length}, 15-Oct records: ${rows15.length}`);
  const yMap = new Map();
  rows15.forEach(r => {
    if (r.employee_id) yMap.set(r.employee_id, r);
  });

  emps.forEach(emp => {
    const yRec = yMap.get(emp.id);
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name;
    const yPresent = yRec ? (/present|working/i.test(yRec.status) || !!yRec.first_check_in) : false;
    const yTime = yRec?.first_check_in ? new Date(yRec.first_check_in).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '—';
    console.log(`${emp.employee_code.padEnd(8)} | ${name.padEnd(20)} | Y-Present: ${yPresent ? 'YES' : 'NO '} | In: ${yTime}`);
  });
}

main();
