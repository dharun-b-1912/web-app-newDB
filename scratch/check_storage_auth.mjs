import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

const HR_EMAIL = 'marimuthu@joycorporatesolutions.com';
const HR_PASS = 'joypeoplehr';

async function checkStorage() {
  const hrAuth = await supabase.auth.signInWithPassword({
    email: HR_EMAIL,
    password: HR_PASS,
  });

  if (hrAuth.error) {
    console.error('HR auth error:', hrAuth.error);
    return;
  }

  const token = hrAuth.data.session.access_token;
  const user = hrAuth.data.user;
  console.log('Logged in user:', user.id, user.email);

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  // Check storage buckets
  const { data: buckets, error: bErr } = await authClient.storage.listBuckets();
  console.log('Buckets list:', buckets, bErr);

  // Try creating or uploading a tiny JPEG to employee-documents under user folder
  const testJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
    0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, 0xff,
    0xd9
  ]);

  const testPath = `0c621892-e938-4707-9957-13534ea32c19/test_profile_${Date.now()}.jpg`;
  const { data: up, error: upErr } = await authClient.storage
    .from('employee-documents')
    .upload(testPath, testJpeg, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  console.log('Upload to employee-documents as HR:', { up, upErr });

  // Test updating employees table with HR client
  const empId = '6815193e-2ad5-46ff-ae8e-b09353c565d7'; // Danya R
  const { data: updData, error: updErr } = await authClient
    .from('employees')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', empId);
  console.log('Update employees as HR:', { updData, updErr });
}

checkStorage();
