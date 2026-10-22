import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function updateSchedule() {
  const recipients = [
    'hr@joycorporatesolutions.com',
    'marimuthu@joycorporatesolutions.com',
    'gopika@joycorporatesolutions.com',
    'harikrishnan@joycorporatesolutions.com',
    'haripriya@joycorporatesolutions.com',
    'thirumalai@joyglobalcorp.com'
  ];

  const { data, error } = await client
    .from('attendance_report_schedules')
    .update({
      recipients,
      last_morning_status: null, // Reset morning lock so new schedule time can run
      last_morning_run_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('organization_id', '0c621892-e938-4707-9957-13534ea32c19')
    .select('*');

  console.log('Update schedule result:', { data, error });
}

updateSchedule().catch(console.error);
