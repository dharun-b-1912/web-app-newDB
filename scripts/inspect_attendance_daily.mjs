// scripts/inspect_attendance_daily.mjs
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance_daily?organization_id=eq.0c621892-e938-4707-9957-13534ea32c19&attendance_date=gte.2026-10-01&order=attendance_date.desc&limit=500`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  const data = await res.json();
  console.log(`Total attendance_daily rows for Oct 2026: ${data.length}`);

  // Count distinct dates
  const dates = Array.from(new Set(data.map(r => r.attendance_date))).sort();
  console.log('Distinct dates:', dates);

  // Group by date
  dates.forEach(d => {
    const dayRows = data.filter(r => r.attendance_date === d);
    const pres = dayRows.filter(r => r.status === 'Present' || r.status === 'PRESENT' || !!r.first_check_in).length;
    const late = dayRows.filter(r => (r.late_minutes || 0) > 0 || r.status === 'Late' || r.status === 'LATE').length;
    const otMins = dayRows.reduce((acc, r) => acc + (r.overtime_minutes || 0), 0);
    console.log(`Date ${d}: ${dayRows.length} records, ${pres} present, ${late} late, ${Math.round(otMins/60*10)/10}h OT`);
  });
}

run();
