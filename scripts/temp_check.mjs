import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const sb = createClient(url, key);

async function inspect() {
  const { data: emps, error: empErr } = await sb
    .from('employees')
    .select('id, employee_code, display_name, first_name, last_name, email, work_email, reporting_manager_id, employment, profile')
    .or('employee_code.eq.JCS-20,email.eq.thirumalai@joyglobalcorp.com');
  console.log('Employee Error:', empErr);
  console.log('Employees:', JSON.stringify(emps, null, 2));

  const { data: schedules, error: schErr } = await sb.from('attendance_report_schedules').select('*');
  console.log('Schedule Error:', schErr);
  console.log('Schedules:', JSON.stringify(schedules, null, 2));
}

inspect();
