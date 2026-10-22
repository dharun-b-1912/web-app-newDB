import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listTables() {
  const possibleTables = [
    'employees',
    'employee_bank_details',
    'employee_statutory_details',
    'employee_emergency_contacts',
    'employee_addresses',
    'employee_profiles',
    'employee_documents',
    'employee_assets',
    'employee_shift_assignments',
    'employee_work_location_assignments',
    'shifts',
    'branches',
    'departments',
    'designations',
    'companies',
    'organizations',
    'attendance_daily',
    'attendance_punches',
    'attendance_events',
    'attendance_regularizations',
    'leave_requests',
    'leave_balances',
    'leave_types',
    'user_profiles',
    'app_users',
    'devices',
    'biometric_punches',
    'notification_events',
    'notification_deliveries',
    'expense_claims',
    'helpdesk_tickets',
    'payslips'
  ];

  for (const t of possibleTables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Table ${t}: ${error.message} (${error.code})`);
    } else {
      console.log(`✅ Table ${t}: ${count} rows`);
    }
  }
}

listTables();
