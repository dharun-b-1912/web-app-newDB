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

async function main() {
  const token = await getAdminToken();
  const headers = {
    'apikey': 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj',
    'Authorization': `Bearer ${token}`
  };

  // 1. Check Thirumalai employee record
  const empRes = await fetch('https://ysiajemrqakfngasehhi.supabase.co/rest/v1/employees?employee_code=eq.JCS-20&select=*', { headers });
  const emps = await empRes.json();
  console.log('=== All columns on employees row ===', Object.keys(emps[0]));
  console.log('=== Thirumalai JCS-20 Record in DB ===');
  console.log('reporting_manager_id:', emps[0]?.reporting_manager_id);
  console.log('reporting_manager_name:', emps[0]?.reporting_manager_name);
  console.log('manager_id:', emps[0]?.manager_id);
  console.log('manager_name:', emps[0]?.manager_name);
  console.log('reports_to_name:', emps[0]?.reports_to_name);
  console.log('employment jsonb:', emps[0]?.employment);

  // 2. Check Praveen B employee record
  const mgrRes = await fetch('https://ysiajemrqakfngasehhi.supabase.co/rest/v1/employees?display_name=ilike.%25Praveen%25&select=id,employee_code,first_name,last_name,display_name', { headers });
  const mgrs = await mgrRes.json();
  console.log('=== Praveen B in DB ===', mgrs);

  // 3. Check OpenAPI definitions for any reporting / manager / team lead tables
  const apiRes = await fetch('https://ysiajemrqakfngasehhi.supabase.co/rest/v1/?apikey=sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const openapi = await apiRes.json();
  const defs = Object.keys(openapi.definitions || {});
  const rpcPaths = Object.keys(openapi.paths || {}).filter(p => p.startsWith('/rpc/'));
  console.log('Available RPC functions:', rpcPaths);

  // 4. Check attendance_report_logs
  const logsRes = await fetch('https://ysiajemrqakfngasehhi.supabase.co/rest/v1/attendance_report_logs?limit=5&select=*', { headers });
  const logs = await logsRes.json();
  console.log('=== attendance_report_logs columns ===', logs);
  console.log('=== Recent attendance_report_logs ===', JSON.stringify(logs, null, 2));
}

main().catch(console.error);
