import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj');

const candidateTables = [
  'platform_plans', 'organizations', 'saas_subscriptions', 'background_jobs', 'companies', 'branches', 'work_locations',
  'departments', 'designations', 'user_profiles', 'roles', 'permissions', 'role_permissions', 'user_roles',
  'employees', 'employee_bank_details', 'employee_emergency_contacts', 'employee_family_details', 'employee_statutory_details',
  'employee_onboarding', 'employee_lifecycle_events', 'employee_separations', 'shifts', 'shift_assignments', 'attendance_punches',
  'attendance_daily', 'leave_types', 'leave_balances', 'leave_requests', 'leave_ledger', 'holiday_calendars', 'holidays',
  'approval_workflows', 'approval_instances', 'approval_actions', 'salary_structures', 'salary_components', 'salary_structure_components',
  'employee_salary_assignments', 'payroll_runs', 'payroll_line_items', 'payslips', 'vendors', 'vendor_contracts', 'vendor_employees',
  'vendor_invoices', 'vendor_compliance_documents', 'performance_cycles', 'performance_reviews', 'goals', 'kpis', 'lms_courses',
  'lms_modules', 'lms_enrollments', 'lms_certifications', 'documents', 'employee_documents', 'document_categories',
  'employee_requests', 'asset_categories', 'assets', 'asset_assignments', 'job_openings', 'candidates', 'interviews',
  'notifications', 'notification_preferences', 'webhook_endpoints', 'audit_logs', 'payroll_periods', 'payroll_run_history',
  'separation_clearances', 'separation_asset_recoveries', 'fnf_settlements', 'domain_events', 'invoices', 'document_requirements'
];

async function main() {
  const results = {};
  for (const t of candidateTables) {
    const { data, error } = await sb.from(t).select('count', { count: 'exact', head: true });
    if (error) {
      results[t] = { exists: false, error: error.message };
    } else {
      results[t] = { exists: true };
    }
  }

  const deployed = Object.keys(results).filter(k => results[k].exists);
  const missing = Object.keys(results).filter(k => !results[k].exists);

  console.log(`\n=== AUDIT RESULTS: ${deployed.length} DEPLOYED / ${missing.length} UNVERIFIED OR MISSING ===`);
  console.log('DEPLOYED:', JSON.stringify(deployed, null, 2));
  console.log('MISSING:', JSON.stringify(missing, null, 2));
}

main();
