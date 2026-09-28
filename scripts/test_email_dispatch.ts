import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailDispatch() {
  const targetEmail = 'thirumalairk27@gmail.com';
  console.log(`[TEST] Triggering Supabase Auth email dispatch to: ${targetEmail}`);
  console.log(`[TEST] Using Supabase URL: ${supabaseUrl}`);

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'https://joypeoplehr.com/activate',
      },
    });

    if (error) {
      console.error('[TEST FAILED] Supabase returned an error:');
      console.error(error);
      process.exit(1);
    }

    console.log('[TEST SUCCESS] Supabase accepted the request and dispatched the email via SMTP!');
    console.log('Response data:', data);
    console.log(`\nPlease check the inbox (and spam/junk folder) of: ${targetEmail}`);
  } catch (err) {
    console.error('[TEST EXCEPTION] Unexpected error:');
    console.error(err);
    process.exit(1);
  }
}

testEmailDispatch();
