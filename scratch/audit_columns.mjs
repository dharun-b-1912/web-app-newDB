// scratch/audit_columns.mjs
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
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: HR_EMAIL,
    password: HR_PASS,
  });

  if (authErr) {
    console.error('HR Auth error:', authErr);
    process.exit(1);
  }

  const tables = [
    'attendance_regularizations',
    'leave_requests',
    'leave_balances',
    'leave_types',
    'employee_requests',
    'notification_events',
    'employee_shift_assignments',
    'shifts',
    'payslips',
    'payroll_line_items',
    'employee_documents',
    'document_types',
    'posh_and_grievance_cases',
  ];

  console.log('--- Inspecting Table Column Names by Inserting Empty Object ---');
  for (const t of tables) {
    const { error } = await client.from(t).insert({});
    if (error) {
      console.log(`\nTable [${t}]:`);
      console.log(`  Msg: ${error.message}`);
      console.log(`  Details: ${error.details || ''}`);
      console.log(`  Hint: ${error.hint || ''}`);
    }
  }
}

main().catch(console.error);
