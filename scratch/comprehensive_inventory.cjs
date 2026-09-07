const { createClient } = require('@supabase/supabase-js');
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
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  if (authErr) {
    console.error('Superadmin login failed:', authErr);
    process.exit(1);
  }
  console.log('Superadmin logged in. Auth UID:', authData.user.id);

  // Check Storage Buckets
  console.log('\n=== STORAGE BUCKETS & OBJECTS ===');
  const { data: buckets, error: bErr } = await client.storage.listBuckets();
  console.log('Buckets:', buckets, bErr);

  if (buckets) {
    for (const b of buckets) {
      const { data: objs, error: oErr } = await client.storage.from(b.name).list();
      console.log(`Bucket [${b.name}] root objects:`, objs?.length, oErr || '');
      // List subfolders if any
      if (objs) {
        for (const o of objs) {
          const { data: subObjs } = await client.storage.from(b.name).list(o.name);
          console.log(`  - ${o.name} (${subObjs ? subObjs.length + ' sub-items' : 'file'})`);
        }
      }
    }
  }

  // Check all user_profiles & user_roles
  console.log('\n=== USER PROFILES ===');
  const { data: profiles, error: pErr } = await client.from('user_profiles').select('*');
  console.log(`Total user_profiles: ${profiles?.length}`, pErr || '');
  profiles?.forEach(p => {
    console.log(`  Profile ID: ${p.id} | Auth UID: ${p.auth_user_id} | Email: ${p.email} | Name: ${p.full_name} | EmpID: ${p.employee_id} | OrgID: ${p.organization_id}`);
  });

  // Check all user_roles
  console.log('\n=== USER ROLES ===');
  const { data: uRoles, error: urErr } = await client.from('user_roles').select('*, roles(*)');
  console.log(`Total user_roles: ${uRoles?.length}`, urErr || '');
  uRoles?.forEach(ur => {
    console.log(`  UserRole ID: ${ur.id} | UserProfID: ${ur.user_profile_id} | Role: ${ur.roles?.code} (${ur.roles?.name})`);
  });

  // Check organizations and companies
  console.log('\n=== ORGANIZATIONS & COMPANIES ===');
  const { data: orgs, error: oErr } = await client.from('organizations').select('*');
  console.log('Organizations:', orgs, oErr || '');
  const { data: comps, error: cErr } = await client.from('companies').select('*');
  console.log('Companies:', comps, cErr || '');

  // Check all canonical tables
  console.log('\n=== ALL 64 CANONICAL TABLES INVENTORY ===');
  const results = [];
  for (const table of CANONICAL_TABLES) {
    const { count, error, data } = await client
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      // try selecting id
      const { data: d2, error: e2 } = await client.from(table).select('id');
      results.push({ table, count: d2 ? d2.length : 'ERR', error: error.message || e2?.message });
    } else {
      results.push({ table, count, error: null });
    }
  }

  console.log('\nTABLE COUNTS SUMMARY:');
  console.table(results);
}

main().catch(console.error);
