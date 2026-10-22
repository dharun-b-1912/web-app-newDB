import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function main() {
  const candidateTables = [
    'employee_work_location_assignments',
    'employee_shift_assignments',
    'employee_statutory_details',
    'employee_bank_details',
    'employee_emergency_contacts',
    'employee_documents',
    'employee_hierarchy',
    'employee_relations',
    'teams',
    'team_members',
    'employee_teams',
    'employee_assignments',
    'app_settings',
    'system_settings',
    'employee_metadata',
    'departments',
    'branches',
    'designations',
    'user_profiles',
  ];

  for (const t of candidateTables) {
    const { data, error } = await client.from(t).select('*').limit(1);
    if (!error) {
      console.log(`Table exists: ${t}`);
      if (data && data.length > 0) {
        console.log(`  Columns in ${t}:`, Object.keys(data[0]));
      }
    }
  }
}

main().catch(console.error);
