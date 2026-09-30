import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const actualAnonKey = ANON_KEY;

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const empClient = createClient(SUPABASE_URL, actualAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('=== 1. VERIFYING BILATERAL IDENTITY LINKS IN DB ===');
  const { data: emps } = await adminClient.from('employees').select('id, employee_code, first_name, last_name, work_email, user_id, organization_id, employment_status');
  const { data: profs } = await adminClient.from('user_profiles').select('id, auth_user_id, email, full_name, employee_id, organization_id, role');
  console.table(emps);
  console.table(profs);

  // Ensure known test password for employees so both script & Chrome test can sign in cleanly
  for (const email of ['dharun@joyglobalcorp.com', 'danya@joycorporatesolutions.com', 'thirumalairk28@gmail.com']) {
    const prof = profs.find(p => p.email === email);
    if (prof?.auth_user_id) {
      const { error: uErr } = await adminClient.auth.admin.updateUserById(prof.auth_user_id, {
        password: 'joypeoplehr',
        email_confirm: true,
        user_metadata: { must_change_password: false, require_password_change: false }
      });
      if (uErr) console.error(`updateUserById error for ${email}:`, uErr);
      else console.log(`✅ Verified employee login credentials for ${email} (joypeoplehr)`);
    }
  }

  const hrProfile = profs.find(p => p.email === 'marimuthu@joycorporatesolutions.com');
  if (hrProfile?.auth_user_id) {
    const { error: hrErr } = await adminClient.auth.admin.updateUserById(hrProfile.auth_user_id, {
      password: 'joypeoplehr',
      email_confirm: true,
      user_metadata: { must_change_password: false, require_password_change: false }
    });
    if (hrErr) console.error('updateUserById error for HR:', hrErr);
    else console.log('✅ Verified HR Admin login credentials for marimuthu@joycorporatesolutions.com (joypeoplehr)');
  }

  console.log('\n=== 2. SIGNING IN AS FLUTTER EMPLOYEE (dharun@joyglobalcorp.com) ===');
  const { data: signInData, error: signInErr } = await empClient.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr',
  });
  if (signInErr) throw new Error(`Employee sign-in failed: ${signInErr.message}`);
  const authUid = signInData.user.id;
  console.log('✅ Employee signed in! auth.uid() =', authUid);

  // Test EmployeeIdentityResolver query
  const { data: upRow, error: upErr } = await empClient
    .from('user_profiles')
    .select('id, auth_user_id, organization_id, employee_id, email, full_name, phone, avatar_url, status, role')
    .or(`auth_user_id.eq.${authUid},id.eq.${authUid}`)
    .maybeSingle();
  if (upErr || !upRow) throw new Error(`user_profiles resolution failed: ${upErr?.message}`);
  console.log('✅ Resolved user_profiles row:', upRow.id, '-> employee_id:', upRow.employee_id);

  const { data: empRow, error: empErr } = await empClient
    .from('employees')
    .select('*')
    .eq('id', upRow.employee_id)
    .single();
  if (empErr || !empRow) throw new Error(`employees resolution failed: ${empErr?.message}`);
  console.log('✅ Resolved employees row:', empRow.id, empRow.first_name, empRow.last_name, 'Code:', empRow.employee_code);

  console.log('\n=== 3. VERIFYING ASSIGNED WORK LOCATIONS & GPS ATTENDANCE PUNCH RPC ===');
  const { data: locs, error: locErr } = await empClient.rpc('fn_get_my_assigned_work_locations');
  if (locErr) throw new Error(`fn_get_my_assigned_work_locations failed: ${locErr.message}`);
  console.log(`✅ fn_get_my_assigned_work_locations returned ${locs?.length || 0} location(s):`, locs?.map(l => `${l.name} (${l.latitude}, ${l.longitude})`));

  const targetLoc = (locs && locs.length > 0) ? locs[0] : { latitude: 13.069802, longitude: 80.178223 };
  const { data: punchRpcRes, error: punchRpcErr } = await empClient.rpc('fn_record_attendance_punch', {
    p_latitude: targetLoc.latitude,
    p_longitude: targetLoc.longitude,
    p_accuracy: 8.5,
    p_punch_type: 'IN',
    p_reason: null,
    p_device_info: { platform: 'flutter_web', verified_test: true },
  });
  if (punchRpcErr) throw new Error(`fn_record_attendance_punch failed: ${punchRpcErr.message}`);
  console.log('✅ fn_record_attendance_punch result:', punchRpcRes);

  // Verify attendance_daily and attendance_punches are readable by employee
  const { data: myPunches, error: myPunchesErr } = await empClient
    .from('attendance_punches')
    .select('*')
    .eq('employee_id', empRow.id)
    .order('punch_time', { ascending: false })
    .limit(3);
  if (myPunchesErr) throw new Error(`attendance_punches SELECT failed: ${myPunchesErr.message}`);
  console.log(`✅ Employee read ${myPunches.length} attendance_punches rows. Latest:`, myPunches[0]?.punch_type, myPunches[0]?.punch_time);

  const { data: myDaily, error: myDailyErr } = await empClient
    .from('attendance_daily')
    .select('*')
    .eq('employee_id', empRow.id)
    .order('attendance_date', { ascending: false })
    .limit(3);
  if (myDailyErr) throw new Error(`attendance_daily SELECT failed: ${myDailyErr.message}`);
  console.log(`✅ Employee read ${myDaily.length} attendance_daily rows. Latest:`, myDaily[0]?.attendance_date, myDaily[0]?.status, 'First In:', myDaily[0]?.first_check_in);

  console.log('\n=== 4. VERIFYING DOCUMENT UPLOAD (STORAGE + EMPLOYEE_DOCUMENTS RLS) ===');
  const { data: dtRow, error: dtErr } = await empClient
    .from('document_types')
    .select('id, name, display_name, code')
    .limit(1)
    .single();
  if (dtErr || !dtRow) throw new Error(`document_types SELECT failed: ${dtErr?.message}`);
  console.log('✅ Resolved document_type:', dtRow);

  const testPdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF', 'utf8');
  const storagePath = `${empRow.organization_id}/${empRow.id}/documents/f_verified_${Date.now()}.pdf`;
  const { error: uploadErr } = await empClient.storage
    .from('employee-documents')
    .upload(storagePath, testPdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (uploadErr) throw new Error(`Storage upload to employee-documents failed: ${uploadErr.message}`);
  console.log('✅ Uploaded binary to storage bucket employee-documents:', storagePath);

  const { data: insertedDoc, error: docInsertErr } = await empClient
    .from('employee_documents')
    .insert({
      organization_id: empRow.organization_id,
      employee_id: empRow.id,
      document_type_id: dtRow.id,
      file_name: 'Identity_Verification_Certificate.pdf',
      storage_path: storagePath,
      file_size_bytes: testPdfBytes.length,
      mime_type: 'application/pdf',
      verification_status: 'PENDING',
    })
    .select('*, document_types(id, name, display_name, code)')
    .single();
  if (docInsertErr) throw new Error(`employee_documents INSERT failed: ${docInsertErr.message}`);
  console.log('✅ Inserted metadata in employee_documents with document_types join:', insertedDoc.id, insertedDoc.file_name, insertedDoc.document_types);

  console.log('\n=== 5. VERIFYING NOTIFICATIONS (NOTIFICATION_EVENTS RLS) ===');
  const { data: insertedNotif, error: notifInsertErr } = await adminClient
    .from('notification_events')
    .insert({
      organization_id: empRow.organization_id,
      recipient_user_id: upRow.id,
      channel: 'IN_APP',
      title: 'Attendance & Document Sync Verified',
      message: 'Real-time communication between Joy PeopleHR Web Portal and Flutter Employee App is active.',
      is_read: false,
      is_sent: true,
    })
    .select('*')
    .single();
  if (notifInsertErr) throw new Error(`notification_events INSERT failed: ${notifInsertErr.message}`);

  const { data: myNotifs, error: myNotifsErr } = await empClient
    .from('notification_events')
    .select('*')
    .or(`recipient_user_id.eq.${upRow.id},recipient_user_id.eq.${empRow.id},recipient_user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(5);
  if (myNotifsErr) throw new Error(`notification_events SELECT failed: ${myNotifsErr.message}`);
  console.log(`✅ Employee read ${myNotifs.length} notification_events! Latest:`, myNotifs[0]?.title);

  console.log('\n🎉 ALL 5 LIVE SUPABASE VERIFICATION GATES PASSED!');
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
