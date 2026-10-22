import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function checkDetailed() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  // Check columns of employees table
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .limit(10);

  console.log('--- EMPLOYEES (Count: ' + (emps?.length || 0) + ') ---');
  if (emps && emps.length > 0) {
    emps.forEach(e => {
      console.log(`ID: ${e.id} | Name: ${e.first_name || ''} ${e.last_name || ''} | Code: ${e.code || e.emp_code || e.employee_number || 'N/A'} | Email: ${e.email || e.work_email} | Org: ${e.organization_id}`);
    });
  }

  // Check latest punches
  const { data: punches, error: punchErr } = await supabase
    .from('attendance_punches')
    .select('*')
    .order('punch_time', { ascending: false })
    .limit(10);

  console.log('\n--- LATEST 10 ATTENDANCE PUNCHES (by punch_time DESC) ---');
  if (punches) {
    punches.forEach(p => {
      console.log(`PunchID: ${p.id} | EmpID: ${p.employee_id} | Type: ${p.punch_type} | Time: ${p.punch_time} | Source: ${p.source || p.device_id || 'mobile'} | Created: ${p.created_at}`);
      if (p.location || p.latitude || p.gps_coordinates || p.metadata) {
        console.log(`   Location/Metadata:`, JSON.stringify({ lat: p.latitude, lng: p.longitude, loc: p.location, meta: p.metadata }));
      }
    });
  }

  // Check attendance_daily for 2026-10-10 and 2026-10-09
  const { data: dailyRecords } = await supabase
    .from('attendance_daily')
    .select('*')
    .in('attendance_date', ['2026-10-10', '2026-10-09', '2026-10-08'])
    .order('attendance_date', { ascending: false })
    .limit(15);

  console.log('\n--- ATTENDANCE DAILY RECORDS (Recent) ---');
  if (dailyRecords) {
    dailyRecords.forEach(d => {
      console.log(`DailyID: ${d.id} | Date: ${d.attendance_date} | EmpID: ${d.employee_id} | Status: ${d.status} | CheckIn: ${d.first_check_in} | CheckOut: ${d.last_check_out} | WorkMins: ${d.total_work_minutes}`);
    });
  }
}

checkDetailed().catch(console.error);
