// scripts/test_phase_m1_storage_security.mjs
// ============================================================================
// JOY PeopleHR — Phase M.1 Storage & Security Definer Lifecycle Testing
// Canonical Supabase: ysiajemrqakfngasehhi (https://ysiajemrqakfngasehhi.supabase.co)
// Real GoTrue Authenticated Sessions — Zero Mocking — Real Binary Uploads
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const CANONICAL_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const PERSONAS = {
  PLATFORM_ADMIN: {
    email: 'superadmin@joypeoplehr.com',
    pass: 'Dharun@1912',
    name: 'Platform Admin',
  },
  COMPANY_ADMIN: {
    email: 'e2e.companyadmin.1788509617070@joypeoplehr.com',
    pass: 'JoyCompAdmin@2026',
    name: 'Company Admin',
  },
  HR_HEAD: {
    email: 'e2e.hrhead.1788509683332@joypeoplehr.com',
    pass: 'JoyHrHead@2026',
    name: 'HR Head',
  },
  EMPLOYEE_A: {
    email: 'e2e.employee.1788509696336@joypeoplehr.com',
    pass: 'JoyEmployee@2026',
    name: 'Employee A',
  },
  EMPLOYEE_B: {
    email: 'e2e.employee.b.1788510620285@joypeoplehr.com',
    pass: 'JoyEmployeeB@2026',
    name: 'Employee B',
  },
};

const BUCKET = 'employee_documents';
const results = [];

function record(suite, testName, persona, expected, actual, pass, detail) {
  results.push({ suite, testName, persona, expected, actual, pass, detail });
  const status = pass ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${status} [${suite}] ${testName} (${persona}) -> ${detail}`);
}

async function getClient(email, password) {
  const client = createClient(CANONICAL_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (email && password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
    return { client, user: data.user, session: data.session };
  }
  return { client, user: null, session: null };
}

async function run() {
  console.log('================================================================');
  console.log('JOY PeopleHR — PHASE M.1 STORAGE & SECURITY VERIFICATION');
  console.log('Target:', CANONICAL_URL);
  console.log('================================================================\n');

  // Authenticate all personas
  const clients = {};
  for (const [key, creds] of Object.entries(PERSONAS)) {
    clients[key] = await getClient(creds.email, creds.pass);
    console.log(`✅ Authenticated ${creds.name} (UID: ${clients[key].user.id})`);
  }
  const anon = await getClient();
  console.log(`✅ Initialized Anonymous Client\n`);

  // Target IDs for Org, Employee A, Employee B
  const ORG_ID = 'e539780b-df07-4b45-beaa-ccf1d2224be8';
  const FOREIGN_ORG_ID = '00000000-0000-0000-0000-000000000099';
  const EMP_A_ID = '7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5';
  const EMP_B_ID = '1d9e2f8b-70f7-4704-a16f-200b251f0839';

  const docIdA = 'm1-test-doc-a-' + Date.now();
  const docIdB = 'm1-test-doc-b-' + Date.now();

  const pathA = `${ORG_ID}/${EMP_A_ID}/${docIdA}/offer_letter.pdf`;
  const pathB = `${ORG_ID}/${EMP_B_ID}/${docIdB}/id_proof.pdf`;
  const foreignPath = `${FOREIGN_ORG_ID}/${EMP_A_ID}/foreign-doc/sensitive.pdf`;

  const dummyPdfBytesA = Buffer.from('%PDF-1.4 Employee A Confidential Document content for Phase M.1');
  const dummyPdfBytesB = Buffer.from('%PDF-1.4 Employee B Confidential Document content for Phase M.1');

  // --------------------------------------------------------------------------
  // TEST SUITE 1: SECURITY DEFINER FUNCTIONS REGRESSION
  // --------------------------------------------------------------------------
  console.log('--- TEST SUITE 1: SECURITY DEFINER FUNCTIONS REGRESSION ---');

  // is_platform_admin()
  for (const [key, creds] of Object.entries(PERSONAS)) {
    const { data: res, error } = await clients[key].client.rpc('is_platform_admin');
    const expected = key === 'PLATFORM_ADMIN';
    record('SECDEF_FUNCTIONS', 'is_platform_admin() check', creds.name, expected, res, res === expected && !error, `Result: ${res}`);
  }
  const { data: anonPa, error: anonPaErr } = await anon.client.rpc('is_platform_admin');
  record('SECDEF_FUNCTIONS', 'is_platform_admin() [Anonymous]', 'Anonymous', 'DENIED', anonPaErr ? 'BLOCKED' : anonPa, !!anonPaErr || anonPa === false, `Result: ${anonPaErr?.message || anonPa}`);

  // is_org_admin(ORG_ID)
  for (const [key, creds] of Object.entries(PERSONAS)) {
    const { data: res, error } = await clients[key].client.rpc('is_org_admin', { p_org_id: ORG_ID });
    const expected = ['PLATFORM_ADMIN', 'COMPANY_ADMIN', 'HR_HEAD'].includes(key);
    record('SECDEF_FUNCTIONS', 'is_org_admin(own_org)', creds.name, expected, res, res === expected && !error, `Result: ${res}`);
  }

  // is_org_admin(FOREIGN_ORG_ID)
  for (const [key, creds] of Object.entries(PERSONAS)) {
    const { data: res, error } = await clients[key].client.rpc('is_org_admin', { p_org_id: FOREIGN_ORG_ID });
    const expected = key === 'PLATFORM_ADMIN'; // Only platform admin has cross-org admin rights
    record('SECDEF_FUNCTIONS', 'is_org_admin(foreign_org) isolation', creds.name, expected, res, res === expected && !error, `Result: ${res}`);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: STORAGE BINARY UPLOAD & LIFECYCLE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 2: STORAGE BINARY UPLOAD & LIFECYCLE ---');

  // 2.1 Anonymous upload MUST FAIL
  const { error: anonUpErr } = await anon.client.storage.from(BUCKET).upload(pathA, dummyPdfBytesA, {
    contentType: 'application/pdf',
    upsert: true,
  });
  record('STORAGE_LIFECYCLE', 'Anonymous upload blocked', 'Anonymous', 'FAIL', anonUpErr ? 'FAIL' : 'SUCCESS', !!anonUpErr, `Error: ${anonUpErr?.message}`);

  // 2.2 Employee A uploads own document MUST PASS
  const { data: upA, error: upAErr } = await clients.EMPLOYEE_A.client.storage.from(BUCKET).upload(pathA, dummyPdfBytesA, {
    contentType: 'application/pdf',
    upsert: true,
  });
  record('STORAGE_LIFECYCLE', 'Employee A uploads own document', 'Employee A', 'PASS', upAErr ? 'FAIL' : 'PASS', !upAErr, `Path: ${upA?.path || upAErr?.message}`);

  // 2.3 Employee B uploads own document MUST PASS
  const { data: upB, error: upBErr } = await clients.EMPLOYEE_B.client.storage.from(BUCKET).upload(pathB, dummyPdfBytesB, {
    contentType: 'application/pdf',
    upsert: true,
  });
  record('STORAGE_LIFECYCLE', 'Employee B uploads own document', 'Employee B', 'PASS', upBErr ? 'FAIL' : 'PASS', !upBErr, `Path: ${upB?.path || upBErr?.message}`);

  // 2.4 Employee A attempts to upload to Employee B's path MUST FAIL
  const maliciousPathB = `${ORG_ID}/${EMP_B_ID}/hacked-by-a/malicious.pdf`;
  const { data: badUpA, error: badUpAErr } = await clients.EMPLOYEE_A.client.storage.from(BUCKET).upload(maliciousPathB, dummyPdfBytesA, {
    contentType: 'application/pdf',
    upsert: true,
  });
  record('STORAGE_LIFECYCLE', 'Employee A upload to Employee B path BLOCKED', 'Employee A', 'FAIL', badUpAErr ? 'FAIL' : 'PASS', !!badUpAErr, `Result: ${badUpAErr?.message || 'Unexpected Success'}`);

  // 2.5 Employee A downloads own document MUST PASS
  const { data: dlA, error: dlAErr } = await clients.EMPLOYEE_A.client.storage.from(BUCKET).download(pathA);
  const dlAText = dlA ? await dlA.text() : '';
  const matchA = dlAText.includes('Employee A Confidential Document');
  record('STORAGE_LIFECYCLE', 'Employee A downloads own document', 'Employee A', 'MATCH', matchA ? 'MATCH' : 'MISMATCH', matchA && !dlAErr, `Content verified (${dlAText.length} bytes)`);

  // 2.6 Employee A attempts to download Employee B document MUST FAIL
  const { data: dlAfromB, error: dlAfromBErr } = await clients.EMPLOYEE_A.client.storage.from(BUCKET).download(pathB);
  record('STORAGE_LIFECYCLE', 'Employee A peer-download Employee B BLOCKED', 'Employee A', 'FAIL', dlAfromBErr ? 'FAIL' : 'PASS', !!dlAfromBErr, `Result: ${dlAfromBErr?.message || 'Leaked!'}`);

  // 2.7 Employee B attempts to download Employee A document MUST FAIL
  const { data: dlBfromA, error: dlBfromAErr } = await clients.EMPLOYEE_B.client.storage.from(BUCKET).download(pathA);
  record('STORAGE_LIFECYCLE', 'Employee B peer-download Employee A BLOCKED', 'Employee B', 'FAIL', dlBfromAErr ? 'FAIL' : 'PASS', !!dlBfromAErr, `Result: ${dlBfromAErr?.message || 'Leaked!'}`);

  // 2.8 Company Admin reads Employee A document MUST PASS
  const { data: caDlA, error: caDlAErr } = await clients.COMPANY_ADMIN.client.storage.from(BUCKET).download(pathA);
  record('STORAGE_LIFECYCLE', 'Company Admin reads Employee A document', 'Company Admin', 'PASS', caDlAErr ? 'FAIL' : 'PASS', !caDlAErr, `Downloaded: ${caDlA?.size} bytes`);

  // 2.9 Company Admin reads Employee B document MUST PASS
  const { data: caDlB, error: caDlBErr } = await clients.COMPANY_ADMIN.client.storage.from(BUCKET).download(pathB);
  record('STORAGE_LIFECYCLE', 'Company Admin reads Employee B document', 'Company Admin', 'PASS', caDlBErr ? 'FAIL' : 'PASS', !caDlBErr, `Downloaded: ${caDlB?.size} bytes`);

  // 2.10 HR Head reads Employee A document MUST PASS
  const { data: hrDlA, error: hrDlAErr } = await clients.HR_HEAD.client.storage.from(BUCKET).download(pathA);
  record('STORAGE_LIFECYCLE', 'HR Head reads Employee A document', 'HR Head', 'PASS', hrDlAErr ? 'FAIL' : 'PASS', !hrDlAErr, `Downloaded: ${hrDlA?.size} bytes`);

  // 2.11 Cross-Org Access: Company Admin attempts foreign organization document MUST FAIL
  const { data: caForeign, error: caForeignErr } = await clients.COMPANY_ADMIN.client.storage.from(BUCKET).download(foreignPath);
  record('STORAGE_LIFECYCLE', 'Company Admin foreign org access BLOCKED', 'Company Admin', 'FAIL', caForeignErr ? 'FAIL' : 'PASS', !!caForeignErr, `Result: ${caForeignErr?.message || 'Leaked!'}`);

  // 2.12 Anonymous download MUST FAIL
  const { data: anonDl, error: anonDlErr } = await anon.client.storage.from(BUCKET).download(pathA);
  record('STORAGE_LIFECYCLE', 'Anonymous download BLOCKED', 'Anonymous', 'FAIL', anonDlErr ? 'FAIL' : 'PASS', !!anonDlErr, `Result: ${anonDlErr?.message || 'Leaked!'}`);

  // 2.13 Employee A attempts to delete Employee B document MUST FAIL
  const { data: delPeer, error: delPeerErr } = await clients.EMPLOYEE_A.client.storage.from(BUCKET).remove([pathB]);
  // Supabase remove returns empty array or error if unauthorized
  const peerDelSuccess = Array.isArray(delPeer) && delPeer.length > 0 && delPeer[0].name === pathB;
  record('STORAGE_LIFECYCLE', 'Employee A peer-deletion of Employee B BLOCKED', 'Employee A', 'BLOCKED', peerDelSuccess ? 'DELETED' : 'BLOCKED', !peerDelSuccess, `Result: ${JSON.stringify(delPeer || delPeerErr)}`);

  // 2.14 Metadata Linkage: create record in employee_documents table
  console.log('\n--- TEST SUITE 3: METADATA LINKAGE & LIFECYCLE ---');

  // Fetch a document type
  const { data: docTypes } = await clients.COMPANY_ADMIN.client.from('document_types').select('id').limit(1);
  const docTypeId = docTypes?.[0]?.id;

  const docMetaA = {
    organization_id: ORG_ID,
    employee_id: EMP_A_ID,
    document_type_id: docTypeId,
    file_name: 'offer_letter.pdf',
    storage_path: pathA,
    file_size_bytes: dummyPdfBytesA.length,
    mime_type: 'application/pdf',
    verification_status: 'PENDING',
  };

  // Employee A inserts metadata for own document
  const { data: insMetaA, error: insMetaAErr } = await clients.EMPLOYEE_A.client
    .from('employee_documents')
    .insert(docMetaA)
    .select()
    .single();
  record('METADATA_LIFECYCLE', 'Employee A inserts own document metadata', 'Employee A', 'PASS', insMetaAErr ? 'FAIL' : 'PASS', !insMetaAErr, `Inserted ID: ${insMetaA?.id}`);

  // Employee A reads own document metadata
  const { data: readMetaA, error: readMetaAErr } = await clients.EMPLOYEE_A.client
    .from('employee_documents')
    .select('*')
    .eq('id', insMetaA?.id || '')
    .single();
  record('METADATA_LIFECYCLE', 'Employee A reads own document metadata', 'Employee A', 'FOUND', readMetaA ? 'FOUND' : 'NOT_FOUND', !readMetaAErr && readMetaA?.id === insMetaA?.id, `Read ID: ${readMetaA?.id}`);

  // Employee B attempts to read Employee A document metadata MUST RETURN 0 ROWS
  const { data: readBofA, error: readBofAErr } = await clients.EMPLOYEE_B.client
    .from('employee_documents')
    .select('*')
    .eq('id', insMetaA?.id || '');
  const blockedB = !readBofA || readBofA.length === 0;
  record('METADATA_LIFECYCLE', 'Employee B reading Employee A metadata BLOCKED', 'Employee B', 'BLOCKED (0 rows)', blockedB ? 'BLOCKED (0 rows)' : 'LEAKED', blockedB, `Rows visible: ${readBofA?.length}`);

  // HR Head reviews and verifies Employee A document
  const { data: verifyDoc, error: verifyErr } = await clients.HR_HEAD.client
    .from('employee_documents')
    .update({ verification_status: 'VERIFIED', verified_at: new Date().toISOString() })
    .eq('id', insMetaA?.id || '')
    .select()
    .single();
  record('METADATA_LIFECYCLE', 'HR Head verifies Employee A document', 'HR Head', 'VERIFIED', verifyDoc?.verification_status || verifyErr?.message, verifyDoc?.verification_status === 'VERIFIED', `Status: ${verifyDoc?.verification_status}`);

  // --------------------------------------------------------------------------
  // CLEANUP DISPOSABLE TEST OBJECTS
  // --------------------------------------------------------------------------
  console.log('\n--- CLEANUP DISPOSABLE TEST OBJECTS ---');
  if (insMetaA?.id) {
    await clients.COMPANY_ADMIN.client.from('employee_documents').delete().eq('id', insMetaA.id);
    console.log('✅ Cleaned up employee_documents metadata record');
  }
  await clients.PLATFORM_ADMIN.client.storage.from(BUCKET).remove([pathA, pathB]);
  console.log('✅ Cleaned up test binary objects in storage');

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log('\n================================================================');
  console.log(`PHASE M.1 STORAGE & SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    console.error(`❌ ${failed} tests failed!`);
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE M.1 STORAGE & SECURITY DEFINDER CHECKS PASSED 100%!');
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
