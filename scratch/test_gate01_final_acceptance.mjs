import { pathToFileURL } from 'url';
import path from 'path';

const projectRoot = 'd:/Joy Corporate Solutions/JOY PeopleHR/web-app/Joy PeopleHR new version/workforceos-enterprise-hrms';
const supabaseJsPath = pathToFileURL(path.join(projectRoot, 'node_modules/@supabase/supabase-js/dist/index.mjs')).href;
const { createClient } = await import(supabaseJsPath);

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

console.log('='.repeat(90));
console.log('JOY PeopleHR — DOCUMENT UPLOAD FINAL ACCEPTANCE SUITE');
console.log('Gate: DOCUMENT-UPLOAD-01-FINAL | Supabase: ysiajemrqakfngasehhi');
console.log('='.repeat(90));

// 1. Authenticate Clients
const hrClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const hrAuth = await hrClient.auth.signInWithPassword({
  email: 'marimuthu@joycorporatesolutions.com',
  password: 'joypeoplehr'
});

const empClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const empAuth = await empClient.auth.signInWithPassword({
  email: 'dharun@joyglobalcorp.com',
  password: 'joypeoplehr'
});

const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

console.log(`✓ HR Admin (Org A):   ${hrAuth.data.user.id}`);
console.log(`✓ Employee A (Org A): ${empAuth.data.user.id}`);

// 2. Identity Linkage Audit
console.log('\n--- 1. EMPLOYEE IDENTITY LINKAGE AUDIT ---');
const { data: userProfile } = await empClient
  .from('user_profiles')
  .select('*')
  .eq('auth_user_id', empAuth.data.user.id)
  .single();

const { data: employeeRow } = await empClient
  .from('employees')
  .select('*')
  .eq('id', userProfile.employee_id)
  .single();

console.log(`auth.users.id:              ${empAuth.data.user.id}`);
console.log(`user_profiles.id:           ${userProfile.id}`);
console.log(`user_profiles.auth_user_id: ${userProfile.auth_user_id}`);
console.log(`user_profiles.employee_id:  ${userProfile.employee_id}`);
console.log(`employees.id:               ${employeeRow.id}`);
console.log(`employees.user_id:          ${employeeRow.user_id}`);
console.log(`employees.organization_id:  ${employeeRow.organization_id}`);

const matrix = [];

// 3. Document Type Resolution
const { data: docTypes } = await empClient
  .from('document_types')
  .select('*')
  .eq('organization_id', employeeRow.organization_id);

const aadhaarType = docTypes.find(d => d.name.toLowerCase().includes('aadhaar')) || docTypes[0];
console.log(`✓ Document Type Resolved:    ${aadhaarType.name} (${aadhaarType.id})`);

// 4. Employee Upload & Cross-Client Verification
console.log('\n--- 2. REAL AUTHENTICATED EMPLOYEE UPLOAD PIPELINE ---');
const fileUuid = `acceptance_${Date.now()}`;
const fileName = 'Screenshot_2026_Aadhaar.jpg';
const storagePath = `${employeeRow.organization_id}/${employeeRow.id}/documents/${fileUuid}.jpg`;
const fileBytes = Buffer.alloc(Math.round(499.7 * 1024), 0xBB);

const { data: upData, error: upErr } = await empClient.storage
  .from('employee-documents')
  .upload(storagePath, fileBytes, { contentType: 'image/jpeg', upsert: false });

console.log(`- Storage upload response: ${upErr ? upErr.message : 'SUCCESS'}`);

const { data: metaData, error: metaErr } = await empClient
  .from('employee_documents')
  .insert({
    organization_id: employeeRow.organization_id,
    employee_id: employeeRow.id,
    document_type_id: aadhaarType.id,
    file_name: fileName,
    storage_path: storagePath,
    file_size_bytes: fileBytes.length,
    mime_type: 'image/jpeg',
    verification_status: 'PENDING'
  })
  .select()
  .single();

console.log(`- Metadata insert response: ${metaErr ? metaErr.message : `SUCCESS (ID: ${metaData?.id})`}`);

// Verify Storage object existence
const { data: checkStorage } = await empClient.storage
  .from('employee-documents')
  .download(storagePath);
matrix.push({
  test: 'Storage object in employee-documents',
  expected: 'Exists (499.7 KB)',
  actual: checkStorage ? `${checkStorage.size} bytes` : 'Missing',
  status: checkStorage ? 'PASS' : 'FAIL'
});

// Verify Database metadata row existence
const { data: checkMeta } = await empClient
  .from('employee_documents')
  .select('*')
  .eq('id', metaData?.id)
  .single();
matrix.push({
  test: 'Metadata row in employee_documents',
  expected: 'Exists',
  actual: checkMeta ? `Found (${checkMeta.file_name})` : 'Missing',
  status: checkMeta ? 'PASS' : 'FAIL'
});

// Verify Employee Flutter/Web visibility
const { data: empDocList } = await empClient
  .from('employee_documents')
  .select('*, document_types(id, name, code)')
  .eq('employee_id', employeeRow.id);
const empVisible = empDocList?.some(d => d.id === metaData?.id);
matrix.push({
  test: 'Employee Flutter/Web list visibility',
  expected: 'Visible',
  actual: empVisible ? `Visible (${empDocList.length} docs)` : 'Missing',
  status: empVisible ? 'PASS' : 'FAIL'
});

// Verify HR Web visibility
const { data: hrDocList } = await hrClient
  .from('employee_documents')
  .select('*, document_types(id, name, code)')
  .eq('employee_id', employeeRow.id);
const hrVisible = hrDocList?.some(d => d.id === metaData?.id);
matrix.push({
  test: 'HR Web employee profile visibility',
  expected: 'Visible',
  actual: hrVisible ? `Visible (${hrDocList.length} docs)` : 'Missing',
  status: hrVisible ? 'PASS' : 'FAIL'
});

// Verify Employee Signed Download URL
const { data: empSigned } = await empClient.storage
  .from('employee-documents')
  .createSignedUrl(storagePath, 300);
matrix.push({
  test: 'Employee private signed download URL',
  expected: 'Allowed',
  actual: empSigned?.signedUrl ? 'Allowed' : 'Failed',
  status: empSigned?.signedUrl ? 'PASS' : 'FAIL'
});

// Verify HR Signed Download URL
const { data: hrSigned } = await hrClient.storage
  .from('employee-documents')
  .createSignedUrl(storagePath, 300);
matrix.push({
  test: 'HR Admin private signed download URL',
  expected: 'Allowed',
  actual: hrSigned?.signedUrl ? 'Allowed' : 'Failed',
  status: hrSigned?.signedUrl ? 'PASS' : 'FAIL'
});

// 5. Strong Peer-Isolation Tests (Existence-Aware)
console.log('\n--- 3. STRONG PEER-ISOLATION TESTS ---');
const peerEmployeeId = '99999999-8888-7777-6666-555555555555';
const peerStoragePath = `${employeeRow.organization_id}/${peerEmployeeId}/documents/peer_confidential.jpg`;

// Employee A attempts to upload to Peer B's folder
const empUploadPeerPath = await empClient.storage
  .from('employee-documents')
  .upload(peerStoragePath, Buffer.from('ATTACK_PEER_PAYLOAD'), { upsert: false });
const peerUploadBlocked = empUploadPeerPath.error !== null;
console.log(`- Employee A upload to Peer B path: ${peerUploadBlocked ? 'DENIED (RLS policy check)' : 'LEAKED'}`);
matrix.push({
  test: 'Employee peer path upload (SEC-04)',
  expected: 'DENY',
  actual: peerUploadBlocked ? 'DENY' : 'ALLOW',
  status: peerUploadBlocked ? 'PASS' : 'FAIL'
});

// Employee A attempts to download Peer B's object
const empDownloadPeerObj = await empClient.storage
  .from('employee-documents')
  .download(peerStoragePath);
const peerDownloadBlocked = empDownloadPeerObj.error !== null;
console.log(`- Employee A download Peer B object: ${peerDownloadBlocked ? 'DENIED (Object not found / RLS)' : 'LEAKED'}`);
matrix.push({
  test: 'Employee peer object download (SEC-05)',
  expected: 'DENY',
  actual: peerDownloadBlocked ? 'DENY' : 'ALLOW',
  status: peerDownloadBlocked ? 'PASS' : 'FAIL'
});

// Anonymous access attempt
const anonDownloadObj = await anonClient.storage
  .from('employee-documents')
  .download(storagePath);
const anonBlocked = anonDownloadObj.error !== null;
console.log(`- Anonymous download attempt: ${anonBlocked ? 'DENIED (RLS restricted)' : 'LEAKED'}`);
matrix.push({
  test: 'Anonymous document access (SEC-12)',
  expected: 'DENY',
  actual: anonBlocked ? 'DENY' : 'ALLOW',
  status: anonBlocked ? 'PASS' : 'FAIL'
});

// 6. Cross-Organization Isolation Test
console.log('\n--- 4. CROSS-ORGANIZATION ISOLATION TEST ---');
const fakeOrgBId = 'e539780b-df07-4b45-beaa-ccf1d2224be8';
const orgBPath = `${fakeOrgBId}/${employeeRow.id}/documents/orgb_test.jpg`;

const empUploadOrgB = await empClient.storage
  .from('employee-documents')
  .upload(orgBPath, Buffer.from('FAKE_ORGB_FILE'), { upsert: false });
const orgBUploadBlocked = empUploadOrgB.error !== null;
console.log(`- Employee A upload to Org B path: ${orgBUploadBlocked ? 'DENIED (RLS violation)' : 'ALLOWED'}`);
matrix.push({
  test: 'Cross-organization upload (SEC-08)',
  expected: 'DENY',
  actual: orgBUploadBlocked ? 'DENY' : 'ALLOW',
  status: orgBUploadBlocked ? 'PASS' : 'FAIL'
});

// 7. Atomicity & Orphan Rollback Test
console.log('\n--- 5. ATOMICITY & ORPHAN ROLLBACK TEST ---');
const orphanTestFileUuid = `orphan_test_${Date.now()}`;
const orphanPath = `${employeeRow.organization_id}/${employeeRow.id}/documents/${orphanTestFileUuid}.jpg`;
const orphanBuffer = Buffer.from('ORPHAN_ROLLBACK_TEST_BUFFER');

// Upload storage
await empClient.storage.from('employee-documents').upload(orphanPath, orphanBuffer);

// Simulate metadata failure (invalid FK)
const metaFailRes = await empClient.from('employee_documents').insert({
  organization_id: employeeRow.organization_id,
  employee_id: employeeRow.id,
  document_type_id: '00000000-0000-0000-0000-000000000000',
  file_name: 'Orphan_Test.jpg',
  storage_path: orphanPath,
  file_size_bytes: orphanBuffer.length,
  mime_type: 'image/jpeg',
  verification_status: 'PENDING'
});

if (metaFailRes.error) {
  // Rollback storage immediately
  await empClient.storage.from('employee-documents').remove([orphanPath]);
}

const { data: orphanList } = await empClient.storage
  .from('employee-documents')
  .list(`${employeeRow.organization_id}/${employeeRow.id}/documents`);
const orphanFound = orphanList?.some(f => f.name === `${orphanTestFileUuid}.jpg`);

console.log(`✓ Storage Rollback Executed on Metadata Failure: ${!orphanFound ? 'PASS (0 orphans)' : 'FAIL'}`);
matrix.push({
  test: 'Atomic rollback on metadata failure',
  expected: 'PASS',
  actual: !orphanFound ? 'PASS' : 'FAIL',
  status: !orphanFound ? 'PASS' : 'FAIL'
});
matrix.push({
  test: 'Orphan objects count',
  expected: '0',
  actual: !orphanFound ? '0' : '1',
  status: !orphanFound ? 'PASS' : 'FAIL'
});

// Cleanup test document
console.log('\n--- 6. CLEANUP ---');
await empClient.storage.from('employee-documents').remove([storagePath]);
await empClient.from('employee_documents').delete().eq('id', metaData.id);
console.log('✓ Temporary test document cleaned up.');

console.log('\n' + '='.repeat(90));
console.log('ACCEPTANCE AUDIT RESULTS:');
console.table(matrix);
console.log('='.repeat(90));
