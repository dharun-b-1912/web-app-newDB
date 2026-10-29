import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function check() {
  const dateStr = '2026-10-28';
  const { data: daily, error: dailyErr } = await sb.from('attendance_daily').select('*').eq('attendance_date', dateStr);
  console.log('Daily count for', dateStr, ':', daily?.length, 'error:', dailyErr);
  if (daily && daily.length > 0) {
    console.log('Sample daily:', daily[0]);
  }

  const { data: punches, error: pErr } = await sb.from('attendance_punches').select('*')
    .or(`attendance_date.eq.${dateStr},and(attendance_date.is.null,punch_time.gte.${dateStr}T00:00:00+05:30,punch_time.lte.${dateStr}T23:59:59+05:30)`);
  console.log('Punches count with dispatcher filter:', punches?.length, 'error:', pErr);

  const { data: allPunches } = await sb.from('attendance_punches').select('id, punch_time, punch_type, punch_source, attendance_date, employee_id')
    .order('punch_time', { ascending: false })
    .limit(10);
  console.log('Latest 10 punches in DB:', allPunches);
}

check();
