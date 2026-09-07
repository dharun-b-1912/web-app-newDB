import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function main() {
  console.log('=== FORENSIC INVESTIGATION: DOCUMENT VISIBILITY (PART 1 & 2) ===');
  
  // 1. Authenticate as Dharun
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr',
  });

  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }

  const user = authData.user;
  console.log('1. Authenticated Auth User:', {
    auth_uid: user.id,
    email: user.email,
  });

  // Resolve user_profiles
  const { data: profile, error: profErr } = await client
    .from('user_profiles')
    .select('*')
    .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  console.log('2. user_profiles resolved:', profile, 'Error:', profErr);

  // Resolve employees
  let empRow = null;
  if (profile?.employee_id) {
    const { data: emp, error: empErr } = await client
      .from('employees')
      .select('*')
      .eq('id', profile.employee_id)
      .maybeSingle();
    empRow = emp;
    console.log('3. employees resolved:', emp, 'Error:', empErr);
  }

  // 4. Query public.employee_documents using authenticated client (RLS check)
  console.log('\n--- 4. Querying employee_documents with Authenticated Client ---');
  const { data: authDocs, error: docErr } = await client
    .from('employee_documents')
    .select('*, document_types(id, name, code)')
    .order('created_at', { ascending: false });

  console.log('Authenticated Client Docs Count:', authDocs?.length, 'Error:', docErr);
  if (authDocs && authDocs.length > 0) {
    for (const d of authDocs) {
      console.log('Doc row:', {
        id: d.id,
        employee_id: d.employee_id,
        organization_id: d.organization_id,
        document_type_id: d.document_type_id,
        document_type_name: d.document_types?.name,
        file_name: d.file_name,
        storage_path: d.storage_path,
        file_size_bytes: d.file_size_bytes,
        mime_type: d.mime_type,
        verification_status: d.verification_status,
      });

      // Check storage object
      const { data: signed, error: signErr } = await client.storage
        .from('employee-documents')
        .createSignedUrl(d.storage_path, 60);
      console.log('Storage signed URL test:', {
        path: d.storage_path,
        hasSignedUrl: !!signed?.signedUrl,
        signError: signErr?.message,
      });
    }
  }

  // 5. Query without document_types join
  console.log('\n--- 5. Querying employee_documents WITHOUT join ---');
  const { data: rawDocs, error: rawErr } = await client
    .from('employee_documents')
    .select('*')
    .order('created_at', { ascending: false });
  console.log('Raw Docs Count:', rawDocs?.length, 'Error:', rawErr);

  // 6. Test with employee_id filter specifically
  if (empRow) {
    console.log('\n--- 6. Query with explicit employee_id filter ---');
    const { data: filteredDocs, error: fErr } = await client
      .from('employee_documents')
      .select('*, document_types(id, name, code)')
      .eq('employee_id', empRow.id);
    console.log('Filtered Docs count for empRow.id (' + empRow.id + '):', filteredDocs?.length, 'Error:', fErr);

    // Also test with employee code or other identifiers
    const { data: orDocs, error: orErr } = await client
      .from('employee_documents')
      .select('*, document_types(id, name, code)')
      .or(`employee_id.eq.${empRow.id},employee_id.eq.${profile.employee_id}`);
    console.log('OR filtered Docs count:', orDocs?.length, 'Error:', orErr);
  }
}

main().catch(console.error);
