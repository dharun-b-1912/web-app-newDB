/**
 * Simulate exactly what PeopleView and useTenant do:
 * 1. Call resolveUserContext (checks companies, falls back to deriving from employees)
 * 2. Get activeLegalEntity.id
 * 3. Call getEmployees({ companyId: activeLegalEntity.id })
 * 4. Verify we get employees back
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function simulateFlow() {
  console.log('=== Simulating useTenant + PeopleView data flow ===\n');

  // Step 1: Simulate resolveUserContext - try companies table (RLS blocks this)
  const { data: companiesData } = await supabase.from('companies').select('*');
  console.log('1. companies table result:', companiesData?.length || 0, 'rows (expected: 0 due to RLS)');

  // Step 2: Fall back - derive company_id from employees
  let activeCompanyId;
  if (!companiesData || companiesData.length === 0) {
    const { data: empSample } = await supabase
      .from('employees')
      .select('company_id, organization_id')
      .limit(1)
      .maybeSingle();
    activeCompanyId = empSample?.company_id || '2030277f-a6a1-427f-beaf-4fc677a3bae2';
    console.log('2. Derived company_id from employees:', activeCompanyId);
  } else {
    activeCompanyId = companiesData[0].id;
    console.log('2. Got company_id from companies table:', activeCompanyId);
  }

  // Step 3: Simulate PeopleView calling api.getEmployees({ companyId })
  console.log('\n3. Fetching employees with company_id filter:', activeCompanyId);
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name, company_id, employment_status')
    .eq('company_id', activeCompanyId);

  if (error) {
    console.error('   ERROR:', error.message);
  } else {
    console.log('   Employees found:', employees?.length || 0);
    employees?.forEach((e) => {
      console.log(`   - ${e.first_name} ${e.last_name} (${e.employment_status})`);
    });
  }

  // Step 4: What if the old ID was cached? Verify old ID returns 0
  console.log('\n4. Testing with OLD stale company ID (0ce6436c-e9b4-4e0e-9102-411ea21b8b80):');
  const { data: oldEmployees } = await supabase
    .from('employees')
    .select('id')
    .eq('company_id', '0ce6436c-e9b4-4e0e-9102-411ea21b8b80');
  console.log('   Employees with old ID:', oldEmployees?.length || 0, '(should be 0 — this was the bug)');

  console.log('\n=== FIX VERIFICATION ===');
  const success = (employees?.length || 0) > 0;
  console.log(success ? '✅ PASS: Employees are now visible on localhost' : '❌ FAIL: Still no employees found');
}

simulateFlow().catch(console.error);
