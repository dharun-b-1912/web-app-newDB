import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzU0NjcsImV4cCI6MjEwMjI1MTQ2N30.mRHhiRs7r7q9J3mphaRVyavL4_THkCAzdhD2dqgvnKA';
const RESEND_API_KEY = 're_48vKshK9_CujUhsn56MPkviPGPUXoacin';

const TARGET_EMAIL = 'thirumalairk27@gmail.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDispatch() {
  console.log(`\n======================================================`);
  console.log(`  SENDING TEST EMAILS TO: ${TARGET_EMAIL}`);
  console.log(`======================================================\n`);

  // 1. Send via Resend Email Gateway with Custom Joy PeopleHR HTML Template
  console.log(`[1/2] Sending branded Joy PeopleHR Welcome Email via Resend API...`);
  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Joy PeopleHR <onboarding@resend.dev>',
        to: [TARGET_EMAIL],
        subject: `Welcome to Joy PeopleHR — You're invited to activate your account`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Joy PeopleHR</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    <tr>
      <td align="center" style="background-color: #ffffff; padding: 26px 24px 22px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td valign="middle" style="padding-right: 14px;">
              <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                <circle cx="50" cy="18" r="12" fill="#00A86B" />
                <circle cx="20" cy="35" r="10" fill="#00C47E" />
                <circle cx="80" cy="35" r="10" fill="#00E091" />
                <path d="M26 48C26 38 36 32 44 32C52 32 58 38 58 46V62C58 74 48 84 36 84C24 84 14 74 14 62V50C14 44 20 40 26 48Z" fill="#07563D" />
                <path d="M74 48C74 38 64 32 56 32C48 32 42 38 42 46V62C42 74 52 84 64 84C76 84 86 74 86 62V50C86 44 80 40 74 48Z" fill="#00A86B" opacity="0.9" />
                <path d="M34 50V62C34 71 41 78 50 78C59 78 66 71 66 62V50" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />
              </svg>
            </td>
            <td valign="middle" align="left">
              <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #07563D; line-height: 1.1;">
                JOY <span style="font-weight: 500; color: #1e293b;">People</span>
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #00A86B; letter-spacing: 0.3px; margin-top: 3px;">
                People First. Work Simplified.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: linear-gradient(135deg, #07563D 0%, #0a694b 100%); padding: 30px 32px; text-align: center; color: #ffffff;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 10px auto;">
          <tr>
            <td style="background-color: rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 4px 14px; text-align: center;">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #ffffff;">Employee App Access</span>
            </td>
          </tr>
        </table>
        <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Welcome to Your Workspace</h1>
        <p style="margin: 0; font-size: 13px; color: #d1fae5; font-weight: 500;">Official Test Dispatch</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 36px 32px;">
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #334155;">Hello Thirumalai,</p>
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #334155;">
          This is a live test confirmation from <strong>Joy PeopleHR</strong>. Your employee management system email pipeline and design template are active and operational!
        </p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 0 24px 0;">
          <tr>
            <td style="padding: 18px 20px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #07563D; letter-spacing: 0.5px; margin-bottom: 8px;">Target Test Account</div>
              <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">Registered Email:</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${TARGET_EMAIL}</div>
            </td>
          </tr>
        </table>
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 32px auto 24px auto;">
          <tr>
            <td align="center" style="border-radius: 10px; background-color: #07563D; box-shadow: 0 4px 10px rgba(7, 86, 61, 0.25);">
              <a href="https://joypeoplehr.com" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; background-color: #07563D; border: 1px solid #07563D;">
                Open Joy PeopleHR Dashboard →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8fafc; padding: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">JOY People — People First. Work Simplified.</p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">Live Test Dispatch Verification</p>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      }),
    });

    const resendData = await resendResponse.json();
    if (resendResponse.ok) {
      console.log(`✅ [Resend] Email sent successfully! Message ID:`, resendData.id);
    } else {
      console.error(`❌ [Resend] Failed to send:`, resendData);
    }
  } catch (err) {
    console.error(`❌ [Resend] Error:`, err);
  }

  // 2. Trigger via Supabase Auth (Sign-in OTP / Magic Link)
  console.log(`\n[2/2] Triggering Supabase Auth Sign-In OTP for ${TARGET_EMAIL}...`);
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: TARGET_EMAIL,
    });
    if (error) {
      console.error(`❌ [Supabase Auth] Error:`, error.message);
    } else {
      console.log(`✅ [Supabase Auth] Magic Link / OTP email dispatched via Supabase Auth templates!`);
    }
  } catch (authErr) {
    console.error(`❌ [Supabase Auth] Error:`, authErr);
  }

  console.log(`\n======================================================`);
  console.log(`  TEST COMPLETED. Please check ${TARGET_EMAIL} inbox & spam.`);
  console.log(`======================================================\n`);
}

testDispatch();
