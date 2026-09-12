import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

const HR_EMAIL = 'marimuthu@joycorporatesolutions.com';
const HR_PASS = 'joypeoplehr';

async function testSignedUrl() {
  const hrAuth = await supabase.auth.signInWithPassword({
    email: HR_EMAIL,
    password: HR_PASS,
  });
  const token = hrAuth.data.session.access_token;
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const path = '0c621892-e938-4707-9957-13534ea32c19/test_profile_1789024055163.jpg';

  // Test Signed URL
  const { data: signedData, error: sErr } = await authClient.storage
    .from('employee-documents')
    .createSignedUrl(path, 3600);
  console.log('Signed URL:', signedData?.signedUrl, sErr);

  if (signedData?.signedUrl) {
    const res = await fetch(signedData.signedUrl);
    console.log('Signed URL fetch status:', res.status, res.headers.get('content-type'));
  }

  // Test Public URL
  const { data: pubData } = authClient.storage
    .from('employee-documents')
    .getPublicUrl(path);
  console.log('Public URL:', pubData?.publicUrl);
  if (pubData?.publicUrl) {
    const res2 = await fetch(pubData.publicUrl);
    console.log('Public URL fetch status:', res2.status, res2.headers.get('content-type'));
  }
}

testSignedUrl();
