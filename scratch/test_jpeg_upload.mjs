import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseKey = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testJpeg() {
  // A tiny 1x1 valid JPEG
  const jpeg1x1 = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
    0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, 0xff,
    0xd9
  ]);

  const testPath = `profile_test/test_${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from('employee-documents')
    .upload(testPath, jpeg1x1, {
      contentType: 'image/jpeg',
      upsert: true
    });

  console.log('Upload JPEG result:', { data, error });

  const { data: pubUrl } = supabase.storage.from('employee-documents').getPublicUrl(testPath);
  console.log('Public URL:', pubUrl);

  // Test downloading or fetching it via fetch
  try {
    const res = await fetch(pubUrl.publicUrl);
    console.log('Fetch public URL status:', res.status, res.headers.get('content-type'));
  } catch (err) {
    console.log('Fetch error:', err.message);
  }
}

testJpeg();
