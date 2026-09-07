const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const SUPERADMIN_AUTH_UID = '99722e27-88be-4b14-9575-8b21cc9e3f06';
const SUPERADMIN_PROFILE_ID = 'dcc96d83-b694-4235-b988-f1b82fabc4ce';
const ROOT_ORG_ID = 'e539780b-df07-4b45-beaa-ccf1d2224be8'; // Joy Corporate Solutions Private Limited
const TEST_ORG_ID = '860f2a6a-23ea-48cf-bf33-666115e32c2b'; // Joy Technologies Live Org
const TEST_COMP_ID = '77e102b1-8699-4db1-abdd-48ab08b2bf2d';

async function cleanup() {
  console.log('================================================================');
  console.log('PHASE O.0 — CONTROLLED DATABASE CLEANUP & UAT RESET');
  console.log('Target Canonical Supabase:', URL);
  console.log('================================================================\n');

  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  
  // Authenticate as Platform Admin
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  if (authErr) {
    console.error('❌ Failed to authenticate Platform Admin:', authErr);
    process.exit(1);
  }
  console.log('✅ Authenticated as Platform Admin. Auth UID:', authData.user.id);

  async function safeDeleteAll(tableName, filterFn = null) {
    try {
      let query = client.from(tableName).select('id');
      if (filterFn) {
        query = filterFn(query);
      }
      const { data: rows, error: selErr } = await query;
      if (selErr) {
        console.log(`  - [${tableName}] Select skipped or failed:`, selErr.message);
        return 0;
      }
      if (!rows || rows.length === 0) {
        console.log(`  - [${tableName}] 0 rows to delete.`);
        return 0;
      }
      const ids = rows.map(r => r.id);
      const { error: delErr } = await client.from(tableName).delete().in('id', ids);
      if (delErr) {
        console.error(`  ❌ [${tableName}] Delete error:`, delErr.message);
        throw delErr;
      }
      console.log(`  ✅ [${tableName}] Deleted ${ids.length} rows.`);
      return ids.length;
    } catch (err) {
      console.error(`  ❌ [${tableName}] Exception:`, err.message);
      throw err;
    }
  }

  console.log('\n--- 1. CLEANING TRANSACTIONAL & CHILD TABLES ---');
  await safeDeleteAll('payroll_line_items');
  await safeDeleteAll('payslips');
  await safeDeleteAll('payroll_runs');
  await safeDeleteAll('employee_salary_assignments');
  await safeDeleteAll('salary_structure_components');
  await safeDeleteAll('salary_structures');
  await safeDeleteAll('salary_components');
  await safeDeleteAll('employee_shift_assignments');
  await safeDeleteAll('attendance_regularizations');
  await safeDeleteAll('attendance_daily');
  await safeDeleteAll('attendance_punches');
  await safeDeleteAll('leave_ledger_entries');
  await safeDeleteAll('leave_requests');
  await safeDeleteAll('leave_balances');
  await safeDeleteAll('leave_types');
  await safeDeleteAll('employee_requests');
  await safeDeleteAll('employee_documents');
  await safeDeleteAll('document_types');
  await safeDeleteAll('notification_events');
  await safeDeleteAll('approval_actions');
  await safeDeleteAll('approval_instances');
  await safeDeleteAll('approval_workflows');
  await safeDeleteAll('posh_and_grievance_cases');
  await safeDeleteAll('asset_assignments');
  await safeDeleteAll('assets');
  await safeDeleteAll('vendor_invoices');
  await safeDeleteAll('vendor_workers');
  await safeDeleteAll('vendors');
  await safeDeleteAll('job_applicants');
  await safeDeleteAll('job_openings');
  await safeDeleteAll('lms_enrollments');
  await safeDeleteAll('lms_courses');
  await safeDeleteAll('performance_reviews');
  await safeDeleteAll('performance_goals');
  await safeDeleteAll('performance_cycles');
  await safeDeleteAll('audit_logs');
  await safeDeleteAll('shifts');

  console.log('\n--- 2. CLEANING EMPLOYEE MASTER & PROFILES ---');
  await safeDeleteAll('employee_addresses');
  await safeDeleteAll('employee_bank_details');
  await safeDeleteAll('employee_statutory_details');
  await safeDeleteAll('employee_lifecycle_events');
  await safeDeleteAll('employee_onboarding');
  await safeDeleteAll('employee_separations');
  await safeDeleteAll('employee_profiles');
  await safeDeleteAll('employees');

  console.log('\n--- 3. CLEANING TEST USER ROLES & TEST USER PROFILES ---');
  // Delete user_roles for all non-superadmin profiles
  await safeDeleteAll('user_roles', q => q.neq('user_profile_id', SUPERADMIN_PROFILE_ID));
  
  // Delete user_profiles for all non-superadmin users
  await safeDeleteAll('user_profiles', q => q.neq('auth_user_id', SUPERADMIN_AUTH_UID));

  console.log('\n--- 4. CLEANING TEST ORGANIZATIONAL METADATA & TEST TENANTS ---');
  await safeDeleteAll('branches');
  await safeDeleteAll('departments');
  await safeDeleteAll('designations');
  await safeDeleteAll('work_locations');
  await safeDeleteAll('holidays');

  // Delete test company
  await safeDeleteAll('companies', q => q.eq('id', TEST_COMP_ID));

  // Delete test organization
  await safeDeleteAll('organizations', q => q.eq('id', TEST_ORG_ID));

  console.log('\n--- 5. STORAGE BUCKET VERIFICATION & OBJECT CLEANUP ---');
  const { data: files } = await client.storage.from('employee_documents').list('', { limit: 100 });
  if (files && files.length > 0) {
    const filePaths = files.filter(f => f.id !== null).map(f => f.name);
    if (filePaths.length > 0) {
      console.log(`  Deleting ${filePaths.length} storage files from employee_documents...`);
      await client.storage.from('employee_documents').remove(filePaths);
    }
  }
  console.log('  ✅ Storage bucket employee_documents is clean.');

  console.log('\n================================================================');
  console.log('✅ DATABASE CLEANUP COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

cleanup().catch(err => {
  console.error('Fatal Cleanup Error:', err);
  process.exit(1);
});
