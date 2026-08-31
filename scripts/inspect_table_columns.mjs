import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzU0NjcsImV4cCI6MjEwMjI1MTQ2N30.mRHhiRs7r7q9J3mphaRVyavL4_THkCAzdhD2dqgvnKA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tablesToCheck = [
  'employees',
  'vendors',
  'vendor_employees',
  'vendor_contracts',
  'vendor_documents',
  'vendor_invoices',
  'vendor_purchase_orders',
  'vendor_audit_logs',
  'attendance_punches',
];

async function inspectColumns() {
  console.log('Inspecting column names for SQL indexing...\n');
  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error && data && data.length > 0) {
      console.log(`Table [${table}] columns:`, Object.keys(data[0]));
    } else if (!error) {
      // If 0 rows, let's probe common column names by selecting them specifically
      const probeCols = ['id', 'organization_id', 'tenant_id', 'vendor_id', 'employee_id', 'status', 'created_at', 'punch_time', 'timestamp'];
      const validCols = [];
      for (const col of probeCols) {
        const { error: colErr } = await supabase.from(table).select(col).limit(1);
        if (!colErr) validCols.push(col);
      }
      console.log(`Table [${table}] (0 rows) probed columns:`, validCols);
    } else {
      console.log(`Table [${table}] error:`, error.message);
    }
  }
}

inspectColumns();
