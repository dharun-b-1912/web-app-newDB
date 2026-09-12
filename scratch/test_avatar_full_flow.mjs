import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

const HR_EMAIL = 'marimuthu@joycorporatesolutions.com';
const HR_PASS = 'joypeoplehr';

async function testAvatarFlow() {
  const hrAuth = await supabase.auth.signInWithPassword({
    email: HR_EMAIL,
    password: HR_PASS,
  });

  if (hrAuth.error) {
    console.error('HR sign in failed:', hrAuth.error);
    return;
  }

  const token = hrAuth.data.session.access_token;
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const empId = '6815193e-2ad5-46ff-ae8e-b09353c565d7'; // Danya R
  const orgId = '0c621892-e938-4707-9957-13534ea32c19';
  const fileUuid = `avt_${Date.now()}`;
  const canonicalPath = `${orgId}/${empId}/profile/${fileUuid}.jpg`;

  const testJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
    0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, 0xff,
    0xd9
  ]);

  console.log('1. Uploading to employee-documents...');
  const { data: up, error: upErr } = await authClient.storage
    .from('employee-documents')
    .upload(canonicalPath, testJpeg, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (upErr) {
    console.error('Upload failed:', upErr);
    return;
  }
  console.log('Uploaded successfully:', up);

  console.log('2. Generating signed URL (1 year)...');
  const { data: signData, error: signErr } = await authClient.storage
    .from('employee-documents')
    .createSignedUrl(canonicalPath, 31536000);

  if (signErr) {
    console.error('Signed URL failed:', signErr);
    return;
  }
  console.log('Signed URL generated:', signData.signedUrl);

  console.log('3. Updating Danya R avatar_url in employees table...');
  const { data: upd, error: updErr } = await authClient
    .from('employees')
    .update({
      avatar_url: signData.signedUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', empId);

  if (updErr) {
    console.error('DB update failed:', updErr);
    return;
  }
  console.log('Database updated successfully!');

  // Verify fetch
  const fetchRes = await fetch(signData.signedUrl);
  console.log('Fetch test status:', fetchRes.status, fetchRes.headers.get('content-type'));
}

testAvatarFlow();
