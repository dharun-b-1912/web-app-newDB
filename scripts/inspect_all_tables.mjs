import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzU0NjcsImV4cCI6MjEwMjI1MTQ2N30.mRHhiRs7r7q9J3mphaRVyavL4_THkCAzdhD2dqgvnKA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const candidateTables = [
  'organizations',
  'organization_profiles',
  'organization_invitations',
  'users',
  'employees',
  'employee_profiles',
  'employee_documents',
  'document_requirements',
  'attendance',
  'attendance_records',
  'attendance_punches',
  'attendance_daily_summary',
  'attendance_regularizations',
  'shifts',
  'shift_roster',
  'leaves',
  'leave_requests',
  'leave_balances',
  'payroll',
  'payrolls',
  'payroll_runs',
  'payroll_records',
  'vendors',
  'vendor_workers',
  'vendor_employees',
  'vendor_contracts',
  'vendor_documents',
  'vendor_invoices',
  'vendor_purchase_orders',
  'vendor_attendance',
  'vendor_audit_logs',
  'notification_events',
  'notifications',
  'audit_logs',
  'system_logs',
];

async function inspectTables() {
  console.log('Inspecting Supabase database tables...');
  const availableTables = [];
  const missingTables = [];

  for (const table of candidateTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      const sampleRow = data && data.length > 0 ? data[0] : null;
      const columns = sampleRow ? Object.keys(sampleRow) : '(Table exists, 0 rows)';
      availableTables.push({ table, columns, count: data?.length || 0 });
      console.log(`✅ [EXISTS] ${table} -> Columns:`, columns);
    } else {
      missingTables.push({ table, error: error.message });
      console.log(`❌ [MISSING] ${table} -> ${error.message}`);
    }
  }

  console.log('\n--- Employee Table Schema (if exists) ---');
  const { data: empSample, error: empErr } = await supabase.from('employees').select('*').limit(1);
  if (!empErr && empSample && empSample.length > 0) {
    console.log('Employees columns:', Object.keys(empSample[0]));
    console.log('Employees sample row:', empSample[0]);
  } else if (!empErr) {
    console.log('Employees table is empty. Testing empty insert to check column names...');
    const { error: insErr } = await supabase.from('employees').insert({}).select();
    console.log('Insert error showing missing/required fields:', insErr);
  }
}

inspectTables();
