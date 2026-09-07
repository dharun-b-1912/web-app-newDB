import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

console.log('='.repeat(80));
console.log('JOY PeopleHR — DOCUMENT VISIBILITY / RETRIEVAL GATE 03 SUITE');
console.log('Canonical Supabase: ysiajemrqakfngasehhi');
console.log('='.repeat(80));

async function runVisibilitySuite() {
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const empClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const peerClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  // 1. Authenticate HR & Employee
  const { data: hrAuth } = await hrClient.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });
  const { data: empAuth } = await empClient.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr',
  });
  const { data: peerAuth } = await peerClient.auth.signInWithPassword({
    email: 'e2e.employee.b.1788510620285@joypeoplehr.com',
    password: 'JoyEmployeeB@2026',
  });

  const matrix = [];

  // Step 1: Resolve authenticated identity
  const { data: prof } = await empClient
    .from('user_profiles')
    .select('id, employee_id, organization_id')
    .eq('auth_user_id', empAuth.user.id)
    .single();

  const { data: empRow } = await empClient
    .from('employees')
    .select('id, organization_id, employee_code, display_name')
    .eq('id', prof.employee_id)
    .single();

  console.log(`\n[Persona] Dharun B:`);
  console.log(`  Auth UID:        ${empAuth.user.id}`);
  console.log(`  Profile ID:      ${prof.id}`);
  console.log(`  Employee ID:     ${empRow.id}`);
  console.log(`  Org ID:          ${empRow.organization_id}`);
  console.log(`  Employee Code:   ${empRow.employee_code}`);

  // Step 2: Query public.employee_documents using Employee A's session
  const { data: empDocs, error: empErr } = await empClient
    .from('employee_documents')
    .select('*, document_types(id, name, code)')
    .eq('employee_id', empRow.id)
    .order('created_at', { ascending: false });

  console.log(`\n[Query] Employee Own Documents Count: ${empDocs?.length}`);
  matrix.push({
    test: 'Employee own RLS SELECT',
    expected: 'ALLOW',
    actual: `${empDocs?.length} rows retrieved without error`,
    status: !empErr && (empDocs?.length ?? 0) > 0 ? 'PASS' : 'FAIL',
  });

  if (empDocs && empDocs.length > 0) {
    const target = empDocs[0];
    console.log(`  Target Document ID:   ${target.id}`);
    console.log(`  Document Type Name:   ${target.document_types?.name}`);
    console.log(`  File Name:            ${target.file_name}`);
    console.log(`  Storage Path:         ${target.storage_path}`);
    console.log(`  File Size Bytes:      ${target.file_size_bytes}`);
    console.log(`  Verification Status:  ${target.verification_status}`);

    matrix.push({
      test: 'employee_documents row exists',
      expected: 'YES',
      actual: `Found ${target.id} (${target.file_name})`,
      status: 'PASS',
    });

    matrix.push({
      test: 'Correct employee_id',
      expected: 'YES',
      actual: target.employee_id === empRow.id ? `Matches (${target.employee_id})` : 'Mismatch',
      status: target.employee_id === empRow.id ? 'PASS' : 'FAIL',
    });

    matrix.push({
      test: 'Correct organization_id',
      expected: 'YES',
      actual: target.organization_id === empRow.organization_id ? `Matches (${target.organization_id})` : 'Mismatch',
      status: target.organization_id === empRow.organization_id ? 'PASS' : 'FAIL',
    });

    matrix.push({
      test: 'Correct document_type_id',
      expected: 'YES',
      actual: `Resolved ${target.document_types?.name} (${target.document_type_id})`,
      status: target.document_type_id ? 'PASS' : 'FAIL',
    });

    // Step 3: Storage signed URL for Employee
    const { data: signed, error: signErr } = await empClient.storage
      .from('employee-documents')
      .createSignedUrl(target.storage_path, 900);

    matrix.push({
      test: 'Flutter / Employee preview signed URL',
      expected: 'WORKS',
      actual: signed?.signedUrl ? 'Signed URL generated (900s)' : `Failed: ${signErr?.message}`,
      status: signed?.signedUrl ? 'PASS' : 'FAIL',
    });

    // Step 4: HR Web Query
    const { data: hrDocs, error: hrErr } = await hrClient
      .from('employee_documents')
      .select('*, document_types(id, name, code)')
      .eq('employee_id', empRow.id);

    matrix.push({
      test: 'HR Web Document Query',
      expected: 'VISIBLE',
      actual: `HR retrieved ${hrDocs?.length} documents`,
      status: !hrErr && (hrDocs?.length ?? 0) > 0 ? 'PASS' : 'FAIL',
    });

    // Step 5: Peer Security Isolation
    const { data: peerDocs } = await peerClient
      .from('employee_documents')
      .select('*')
      .eq('id', target.id);

    const { data: peerSign, error: peerSignErr } = await peerClient.storage
      .from('employee-documents')
      .createSignedUrl(target.storage_path, 60);

    matrix.push({
      test: 'Peer RLS SELECT',
      expected: 'DENY',
      actual: (peerDocs?.length ?? 0) === 0 ? '0 rows returned' : 'LEAKED',
      status: (peerDocs?.length ?? 0) === 0 ? 'PASS' : 'FAIL',
    });

    matrix.push({
      test: 'Peer Storage Read',
      expected: 'DENY',
      actual: !peerSign?.signedUrl ? 'Access denied' : 'LEAKED',
      status: !peerSign?.signedUrl ? 'PASS' : 'FAIL',
    });
  }

  console.log('\n=== VISIBILITY ACCEPTANCE MATRIX ===\n');
  console.table(matrix);
}

runVisibilitySuite().catch(console.error);
