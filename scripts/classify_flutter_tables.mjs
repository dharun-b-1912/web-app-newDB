import fs from 'fs';

const CANONICAL_64 = [
  'approval_actions', 'approval_instances', 'approval_workflows', 'asset_assignments', 'assets',
  'attendance_daily', 'attendance_punches', 'attendance_regularizations', 'audit_logs', 'background_jobs',
  'biometric_devices', 'branches', 'companies', 'departments', 'designations',
  'document_types', 'employee_addresses', 'employee_bank_details', 'employee_documents', 'employee_lifecycle_events',
  'employee_onboarding', 'employee_profiles', 'employee_requests', 'employee_salary_assignments', 'employee_separations',
  'employee_shift_assignments', 'employee_statutory_details', 'employees', 'holidays', 'job_applicants',
  'job_openings', 'leave_balances', 'leave_ledger_entries', 'leave_requests', 'leave_types',
  'lms_courses', 'lms_enrollments', 'notification_events', 'organizations', 'payroll_line_items',
  'payroll_runs', 'payslips', 'performance_cycles', 'performance_goals', 'performance_reviews',
  'permissions', 'platform_plans', 'platform_users', 'posh_and_grievance_cases', 'role_permissions',
  'roles', 'saas_subscriptions', 'salary_components', 'salary_structure_components', 'salary_structures',
  'shifts', 'user_profiles', 'user_roles', 'vendor_invoices', 'vendor_workers',
  'vendors', 'webhook_deliveries', 'webhook_endpoints', 'work_locations'
];

const inventory = JSON.parse(fs.readFileSync('scratch/flutter_inventory.json', 'utf8'));

console.log('=== FLUTTER TABLE MAPPING CLASSIFICATION ===\n');

for (const [tbl, files] of Object.entries(inventory.tables)) {
  const isCanonical = CANONICAL_64.includes(tbl);
  const status = isCanonical ? '✅ CANONICAL (Shared DB)' : '⚠️ NON-CANONICAL / SPECIALIZED';
  console.log(`Table: [${tbl}] -> ${status}`);
  files.forEach(f => console.log(`    ${f}`));
}
