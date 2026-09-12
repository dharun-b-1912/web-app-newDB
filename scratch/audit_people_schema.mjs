import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pmimukwhasbdkocgdayy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtaW11a3doYXNiZGtvc2dkYXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzQxMzYsImV4cCI6MjA1NjgxMDEzNn0.8mF8VvCg0bUjA9N5H1L2y8fT0rK3s6W4q7X9z2_1A5c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tables = [
    'employees',
    'user_profiles',
    'employee_lifecycle_events',
    'departments',
    'designations',
    'job_roles',
    'employee_documents',
    'employee_bank_details',
    'employee_transfers',
    'employee_promotions',
    'employee_notes',
    'employee_shifts',
    'employee_emergency_contacts',
    'organizations',
    'company_settings'
  ];

  console.log('=== AUDITING PEOPLE DOMAIN TABLES IN SUPABASE ===');
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`❌ TABLE [${t}]: ${error.message} (${error.code})`);
    } else {
      console.log(`✅ TABLE [${t}]: row count >= ${data.length}`);
      if (data.length > 0) {
        console.log(`   Columns (${Object.keys(data[0]).length}): ${Object.keys(data[0]).join(', ')}`);
      } else {
        // Probe columns by querying with an invalid filter to get column list or inserting an empty payload test
        console.log(`   (Empty table, verifying columns via null query)`);
      }
    }
  }

  // Probe employees columns if empty
  const { data: emps, error: empErr } = await supabase.from('employees').select('*').limit(5);
  if (emps && emps.length > 0) {
    console.log('\n--- SAMPLE EMPLOYEES ROW ---');
    console.log(JSON.stringify(emps[0], null, 2));
  } else {
    console.log('\nEmployees table is currently empty or unreadable:', empErr);
  }

  // Check user_profiles
  const { data: profs } = await supabase.from('user_profiles').select('*').limit(1);
  if (profs && profs.length > 0) {
    console.log('\n--- SAMPLE USER_PROFILES ROW ---');
    console.log(JSON.stringify(profs[0], null, 2));
  }

  // Check employee_lifecycle_events
  const { data: events } = await supabase.from('employee_lifecycle_events').select('*').limit(1);
  if (events && events.length > 0) {
    console.log('\n--- SAMPLE EMPLOYEE_LIFECYCLE_EVENTS ROW ---');
    console.log(JSON.stringify(events[0], null, 2));
  }
}

run().catch(console.error);
