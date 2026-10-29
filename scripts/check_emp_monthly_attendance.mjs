// scripts/check_emp_monthly_attendance.mjs
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance_daily?organization_id=eq.0c621892-e938-4707-9957-13534ea32c19&attendance_date=gte.2026-10-01&attendance_date=lte.2026-10-28&limit=1000`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  const data = await res.json();
  console.log(`Fetched ${data.length} records.`);

  // Group by employee_code
  const empStats = new Map();
  data.forEach(r => {
    const code = r.employee_code || r.employee_id;
    const cur = empStats.get(code) || {
      count: 0,
      present: 0,
      absent: 0,
      late: 0,
      workMins: 0,
      otMins: 0
    };
    cur.count++;
    if (r.status === 'Present' || r.status === 'PRESENT' || !!r.first_check_in) {
      cur.present++;
    } else {
      cur.absent++;
    }
    if ((r.late_minutes || 0) > 0) cur.late++;
    cur.workMins += (r.total_work_minutes || r.net_working_minutes || 0);
    cur.otMins += (r.overtime_minutes || 0);
    empStats.set(code, cur);
  });

  console.log('Sample Employee Aggregations for October:');
  for (const [code, s] of Array.from(empStats.entries()).slice(0, 5)) {
    console.log(`${code}: ${s.present} present, ${s.absent} absent, ${s.late} late, ${Math.floor(s.workMins/60)}h ${s.workMins%60}m work, ${Math.floor(s.otMins/60)}h ${s.otMins%60}m OT`);
  }
}

run();
