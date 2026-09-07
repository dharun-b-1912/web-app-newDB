// scratch/audit_live_database_tables.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const env = dotenv.parse(fs.readFileSync('.env.local'));
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const HR_EMAIL = 'marimuthu@joycorporatesolutions.com';
const HR_PASS = 'joypeoplehr';

const client = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  console.log('--- Connecting to Supabase as HR Head ---');
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: HR_EMAIL,
    password: HR_PASS,
  });

  if (authErr) {
    console.error('HR Auth error:', authErr);
    process.exit(1);
  }
  console.log('HR Authenticated successfully. User ID:', authData.user.id);

  const tablesToCheck = [
    'employees',
    'employee_profiles',
    'employee_addresses',
    'employee_bank_details',
    'employee_statutory_details',
    'employee_documents',
    'document_types',
    'work_locations',
    'employee_work_location_assignments',
    'attendance_daily',
    'attendance_punches',
    'attendance_regularizations',
    'leave_types',
    'leave_balances',
    'leave_requests',
    'leave_ledger_entries',
    'employee_shift_assignments',
    'shifts',
    'payroll_runs',
    'payslips',
    'payroll_line_items',
    'employee_salary_assignments',
    'employee_requests',
    'posh_and_grievance_cases',
    'notification_events',
    'organizations',
    'companies',
  ];

  console.log('\n--- Auditing Canonical Tables on Live Supabase ---');
  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await client
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        console.log(`[TABLE] ${table.padEnd(38)}: ❌ ERROR (${error.code}: ${error.message})`);
      } else {
        const sampleKeys = data && data.length > 0 ? Object.keys(data[0]).join(', ') : '(0 rows, table exists)';
        console.log(`[TABLE] ${table.padEnd(38)}: ✅ EXISTS (count: ${count ?? 0})`);
        if (data && data.length > 0) {
          console.log(`        Columns: ${sampleKeys}`);
        }
      }
    } catch (e) {
      console.log(`[TABLE] ${table.padEnd(38)}: ❌ EXCEPTION (${e.message})`);
    }
  }
}

main().catch(console.error);
