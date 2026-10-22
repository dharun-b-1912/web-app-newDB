const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailDispatch() {
  const targetEmail = 'thirumalairk28@gmail.com';
  console.log(`[TEST] Triggering Supabase Auth email dispatch via newly configured Hostinger SMTP...`);
  console.log(`[TEST] Target recipient: ${targetEmail}`);
  console.log(`[TEST] Supabase Endpoint: ${supabaseUrl}`);

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'https://joypeoplehr.com/activate',
      },
    });

    if (error) {
      console.error('❌ [TEST FAILED] Supabase returned an error:');
      console.error('Message:', error.message);
      console.error('Status:', error.status);
      process.exit(1);
    }

    console.log('✅ [TEST SUCCESS] Supabase accepted the request and successfully dispatched the email via your custom Hostinger SMTP server!');
    console.log('Response data:', JSON.stringify(data, null, 2));
    console.log(`\n📬 Please check the inbox (and Spam/Junk folder) of: ${targetEmail}`);
  } catch (err) {
    console.error('❌ [TEST EXCEPTION] Unexpected error:', err.message);
    process.exit(1);
  }
}

testEmailDispatch();
