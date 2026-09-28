async function sendRealResend() {
  const apiKey = 're_48vKshK9_CujUhsn56MPkviPGPUXoacin';
  const target = 'thirumalairk27@gmail.com';

  console.log(`[TEST RESEND API] Sending email to ${target} with API key...`);

  // Try sending from onboarding@resend.dev (default free testing domain on Resend)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Joy PeopleHR <onboarding@resend.dev>',
      to: [target],
      subject: 'Welcome to Joy PeopleHR - Account Activation OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #07563D; margin-top: 0;">Welcome to Joy PeopleHR</h2>
          <p>Hello Thirumalai,</p>
          <p>Your enterprise workforce account has been initialized. Use the verification code below to activate your account:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #07563D; background: #e6f4ea; padding: 14px 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            849201
          </div>
          <p style="font-size: 12px; color: #64748b;">This code is valid for 10 minutes. Please do not share it with anyone.</p>
        </div>
      `,
    }),
  });

  const resJson = await response.json();
  console.log('[RESEND API STATUS]:', response.status);
  console.log('[RESEND API RESPONSE]:', resJson);
}

sendRealResend();
