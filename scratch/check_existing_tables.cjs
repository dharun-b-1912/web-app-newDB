const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const CANDIDATES = [
  'approval_actions',
  'approval_instances',
  'approval_workflows',
  'asset_assignments',
  'assets',
  'attendance_daily',
  'attendance_punches',
  'attendance_regularizations',
  'audit_logs',
  'background_jobs',
  'branches',
  'companies',
  'custom_field_definitions',
  'custom_field_values',
  'departments',
  'designations',
  'document_types',
  'employee_addresses',
  'employee_bank_details',
  'employee_documents',
  'employee_lifecycle_events',
  'employee_onboarding',
  'employee_profiles',
  'employee_requests',
  'employee_salary_assignments',
  'employee_separations',
  'employee_shift_assignments',
  'employee_statutory_details',
  'employees',
  'holidays',
  'job_applicants',
  'job_openings',
  'leave_balances',
  'leave_ledger_entries',
  'leave_requests',
  'leave_types',
  'lms_courses',
  'lms_enrollments',
  'notification_events',
  'organization_domains',
  'organization_invitations',
  'organization_subscriptions',
  'organizations',
  'payroll_line_items',
  'payroll_runs',
  'payslips',
  'performance_cycles',
  'performance_goals',
  'performance_reviews',
  'permissions',
  'platform_plans',
  'platform_subscriptions',
  'posh_and_grievance_cases',
  'role_permissions',
  'roles',
  'salary_components',
  'salary_structure_components',
  'salary_structures',
  'shifts',
  'user_profiles',
  'user_roles',
  'vendor_invoices',
  'vendor_workers',
  'vendors',
  'webhook_deliveries',
  'webhook_endpoints',
  'work_locations'
];

async function run() {
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });

  const existing = [];
  const missing = [];

  for (const t of CANDIDATES) {
    try {
      const { data, error } = await client.from(t).select('id').limit(1);
      if (error) {
        missing.push({ table: t, error: error.message });
      } else {
        existing.push(t);
      }
    } catch (e) {
      missing.push({ table: t, error: e.message });
    }
  }

  console.log(`TOTAL CANDIDATES: ${CANDIDATES.length}`);
  console.log(`EXISTING (${existing.length}):`, existing);
  console.log(`MISSING/ERROR (${missing.length}):`, missing);
}

run().catch(console.error);
