async function testSendFromVerifiedDomain() {
  const apiKey = 're_mock_dummy_resend_api_key_sanitized';
  const target = 'thirumalairk27@gmail.com';
  console.log(`[TEST] Sending email from verified domain noreply@joypeoplehr.com to ${target}...`);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Joy PeopleHR <noreply@joypeoplehr.com>',
        to: [target],
        subject: 'Welcome to Joy PeopleHR - Account Verification & Setup',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 540px; margin: 0 auto;">
            <div style="background: #07563D; color: white; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Joy PeopleHR</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">WorkforceOS Enterprise Portal</p>
            </div>
            
            <p style="font-size: 15px; color: #1e293b;">Hello <strong>Thirumalai</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Your employee account has been created on the Joy PeopleHR workforce platform. Use the verification code below to complete your activation:</p>
            
            <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #07563D; background: #e6f4ea; padding: 20px 24px; text-align: center; border-radius: 12px; margin: 24px 0; border: 2px solid #a3d9b8; font-family: monospace;">
              591824
            </div>
            
            <p style="font-size: 13px; color: #64748b; text-align: center;">This code is valid for 10 minutes. Do not share this code with anyone.</p>
            
            <div style="text-align: center; margin-top: 28px;">
              <a href="https://joypeoplehr.com/activate?email=${encodeURIComponent(target)}" style="display: inline-block; background: #07563D; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px;">
                Activate Account Directly &rarr;
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Joy Corporate Solutions &middot; joypeoplehr.com</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    console.log('[SEND STATUS]:', res.status);
    console.log('[SEND RESPONSE]:', data);
  } catch (e) {
    console.error('Send error:', e);
  }
}

testSendFromVerifiedDomain();
