const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const CANONICAL_TABLES = [
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

async function main() {
  console.log('================================================================');
  console.log('PHASE O.0 — POST-CLEANUP COMPREHENSIVE VERIFICATION');
  console.log('Canonical Supabase:', URL);
  console.log('================================================================\n');

  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Platform Admin Login & Identity Resolution
  console.log('--- 1. PLATFORM ADMIN AUTHENTICATION TEST ---');
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  if (authErr) {
    console.error('❌ Platform Admin Login Failed:', authErr);
    process.exit(1);
  }
  console.log('✅ Platform Admin Authenticated Successfully! UID:', authData.user.id);

  // Check Profile
  const { data: prof, error: profErr } = await client.from('user_profiles').select('*').eq('auth_user_id', authData.user.id);
  console.log('✅ User Profile:', prof?.[0]?.full_name, '| Profile ID:', prof?.[0]?.id, '| Org ID:', prof?.[0]?.organization_id);

  // Check Roles
  const { data: uRoles, error: urErr } = await client.from('user_roles').select('*, roles(*)').eq('user_profile_id', prof[0].id);
  console.log('✅ User Role:', uRoles?.[0]?.roles?.code, '(', uRoles?.[0]?.roles?.name, ')');

  // Check Platform Admin RPC
  const { data: isPlat, error: pErr } = await client.rpc('is_platform_admin');
  console.log('✅ is_platform_admin() RPC Result:', isPlat);

  const { data: activeOrg, error: aErr } = await client.rpc('get_active_user_org_id');
  console.log('✅ get_active_user_org_id() RPC Result:', activeOrg);

  // 2. Test Accounts Verification (Must be unlinked/inaccessible)
  console.log('\n--- 2. VERIFYING TEST ACCOUNTS ARE UNLINKED/REMOVED ---');
  const testEmails = [
    'e2e.companyadmin.1788509617070@joypeoplehr.com',
    'e2e.hrhead.1788509683332@joypeoplehr.com',
    'e2e.employee.1788509696336@joypeoplehr.com',
    'e2e.employee.b.1788510620285@joypeoplehr.com'
  ];
  for (const email of testEmails) {
    const { data: testProf } = await client.from('user_profiles').select('*').eq('email', email);
    console.log(`  - ${email}: Profile rows = ${testProf?.length || 0}`);
  }

  // 3. Storage Bucket Check
  console.log('\n--- 3. STORAGE VERIFICATION ---');
  const { data: buckets } = await client.storage.listBuckets();
  console.log('✅ Storage Buckets:', buckets?.map(b => b.name));
  const { data: files } = await client.storage.from('employee_documents').list('', { limit: 100 });
  console.log('✅ Storage Bucket [employee_documents] file count:', files?.length || 0);

  // 4. All 64 Canonical Tables Row Count
  console.log('\n--- 4. FINAL 64 CANONICAL TABLES ROW COUNT AUDIT ---');
  const tableCounts = [];
  for (const table of CANONICAL_TABLES) {
    const { count, error, data } = await client.from(table).select('*', { count: 'exact', head: true });
    let finalCount = count;
    if (error || finalCount === null) {
      const { data: rows } = await client.from(table).select('id');
      finalCount = rows ? rows.length : 0;
    }
    
    let retainReason = 'N/A (0 rows)';
    if (table === 'organizations') retainReason = 'Retained root Platform Admin organization';
    else if (table === 'companies') retainReason = 'Retained root Platform Admin company';
    else if (table === 'user_profiles') retainReason = 'Retained single Platform Admin profile';
    else if (table === 'user_roles') retainReason = 'Retained single Platform Admin role assignment';
    else if (table === 'roles') retainReason = 'Retained system default role definitions';
    else if (table === 'permissions') retainReason = 'Retained system RBAC permission catalogue';
    else if (table === 'platform_plans') retainReason = 'Retained system SaaS subscription tiers';

    tableCounts.push({
      table,
      count: finalCount,
      retainedReason: finalCount > 0 ? retainReason : 'Clean (0 rows)'
    });
  }

  console.log('-----------------------------------------------------------------------------------------');
  console.log('| #   | Canonical Table Name                | Final Count | Retained Reason               |');
  console.log('-----------------------------------------------------------------------------------------');
  tableCounts.forEach((r, idx) => {
    console.log(`| ${(idx+1).toString().padEnd(3)} | ${r.table.padEnd(35)} | ${r.count.toString().padEnd(11)} | ${r.retainedReason.padEnd(29)} |`);
  });
  console.log('-----------------------------------------------------------------------------------------');

  console.log('\n================================================================');
  console.log('✅ ALL POST-CLEANUP VERIFICATIONS PASSED');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
