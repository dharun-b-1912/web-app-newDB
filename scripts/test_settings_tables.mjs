import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const client = createClient(url, key);

async function main() {
  const tables = [
    'app_settings',
    'system_settings',
    'platform_settings',
    'company_settings',
    'organization_settings',
    'employee_hierarchy',
    'organization_hierarchies',
    'employee_reporting',
    'organization_architecture',
    'audit_events',
  ];

  for (const t of tables) {
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
