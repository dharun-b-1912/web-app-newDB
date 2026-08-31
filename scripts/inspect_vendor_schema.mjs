import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzU0NjcsImV4cCI6MjEwMjI1MTQ2N30.mRHhiRs7r7q9J3mphaRVyavL4_THkCAzdhD2dqgvnKA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
  'vendors',
  'vendor_employees',
  'vendor_contracts',
  'vendor_documents',
  'vendor_invoices',
  'vendor_purchase_orders',
  'vendor_audit_logs',
  'attendance_punches',
];

async function inspectVendorTables() {
  console.log('Inspecting vendor table columns via empty inserts...');
  for (const t of tables) {
    const { error } = await supabase.from(t).insert({}).select();
    console.log(`Table [${t}] error details (schema clue):`, error?.message, error?.details, error?.hint);
  }
}

inspectVendorTables();
