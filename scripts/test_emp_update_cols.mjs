import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function main() {
  const { data, error } = await client
    .from('employees')
    .update({ reporting_manager_id: '55f486f8-e3aa-4133-9e85-dfc519ed2825' })
    .eq('id', '0dc8993f-c0cc-4143-aedc-d4893e41b001')
    .select('id, employee_code, reporting_manager_id');

  console.log('Update reporting_manager_id result:', { data, error });

  const { data: testCols, error: errCols } = await client
    .from('employees')
    .update({ team_lead_id: '55f486f8-e3aa-4133-9e85-dfc519ed2825' })
    .eq('id', '0dc8993f-c0cc-4143-aedc-d4893e41b001')
    .select('id');

  console.log('Update team_lead_id result:', { testCols, errCols });
}

main().catch(console.error);
