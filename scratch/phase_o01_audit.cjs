const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function audit() {
  console.log('================================================================');
  console.log('PHASE O.0.1 — READ-ONLY DEPENDENCY & SCHEMA RECONCILIATION');
  console.log('Target: Canonical Supabase (ysiajemrqakfngasehhi)');
  console.log('================================================================\n');

  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Authenticate as Platform Admin
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  if (authErr) {
    console.error('❌ Login failed:', authErr);
    process.exit(1);
  }
  console.log('✅ Platform Admin logged in. Auth UID:', authData.user.id);

  // 2. Inspect user_profiles for company_id or organization_id
  const { data: prof } = await client.from('user_profiles').select('*').eq('auth_user_id', authData.user.id);
  console.log('\n--- 1. PLATFORM ADMIN USER PROFILE ---');
  console.log(prof);

  // 3. Inspect user_roles
  const { data: uroles } = await client.from('user_roles').select('*').eq('user_profile_id', prof[0].id);
  console.log('\n--- 2. PLATFORM ADMIN USER ROLES ---');
  console.log(uroles);

  // 4. Inspect companies table
  const { data: comps } = await client.from('companies').select('*');
  console.log('\n--- 3. COMPANIES TABLE ---');
  console.log(comps);

  // 5. Inspect organizations table
  const { data: orgs } = await client.from('organizations').select('*');
  console.log('\n--- 4. ORGANIZATIONS TABLE ---');
  console.log(orgs);

  // 6. Test what tables exist by querying information_schema or checking canonical list
  console.log('\n--- 5. CHECKING TABLE LIST ---');
  // Let's test the 67 candidate tables and find which ones return valid responses
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

  const tableReport = [];
  for (const t of CANDIDATES) {
    const { count, error, data } = await client.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      // try select with limit 1
      const { data: d2, error: e2 } = await client.from(t).select('*').limit(1);
      if (e2) {
        tableReport.push({ table: t, exists: false, error: e2.message, count: null });
      } else {
        tableReport.push({ table: t, exists: true, error: null, count: d2 ? d2.length : 0 });
      }
    } else {
      tableReport.push({ table: t, exists: true, error: null, count });
    }
  }

  console.log(`Total candidate tables checked: ${CANDIDATES.length}`);
  const existingTables = tableReport.filter(t => t.exists);
  const nonExistingTables = tableReport.filter(t => !t.exists);
  console.log(`Existing tables: ${existingTables.length}`);
  console.log(`Non-existing tables: ${nonExistingTables.length}`, nonExistingTables);
}

audit().catch(console.error);
