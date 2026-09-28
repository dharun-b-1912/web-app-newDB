async function testResendApiKey() {
  const apiKey = 're_mock_dummy_resend_api_key_sanitized';
  console.log('[TEST] Validating Resend API key...');

  // 1. Check domains / account
  try {
    const domainRes = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    console.log('Domains check status:', domainRes.status);
    const domainData = await domainRes.json();
    console.log('Domains registered on Resend:', domainData);
  } catch (e) {
    console.error('Domain check failed:', e);
  }

  // 2. Try sending an email to thirumalairk27@gmail.com
  try {
    console.log('\n[TEST] Attempting to send test email to thirumalairk27@gmail.com...');
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Joy PeopleHR <onboarding@resend.dev>',
        to: ['thirumalairk27@gmail.com'],
        subject: 'Joy PeopleHR - Account Verification & Setup Test',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 520px; margin: 0 auto;">
            <h2 style="color: #07563D; margin-top: 0;">Joy PeopleHR - Enterprise Verification</h2>
            <p>Hello Thirumalai,</p>
            <p>Your Resend API configuration is verified and fully operational.</p>
            <p>Your one-time account activation verification code is:</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #07563D; background: #e6f4ea; padding: 16px 24px; text-align: center; border-radius: 10px; margin: 20px 0; border: 1px solid #b7e1cd;">
              739105
            </div>
            <p style="font-size: 13px; color: #475569;">You can also access the portal directly at: <a href="https://joypeoplehr.com" style="color: #07563D; font-weight: bold;">https://joypeoplehr.com</a></p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8;">Sent via Joy PeopleHR Corporate Cloud Delivery Engine.</p>
          </div>
        `,
      }),
    });

    console.log('Send email status:', sendRes.status);
    const sendData = await sendRes.json();
    console.log('Send email response:', sendData);
  } catch (e) {
    console.error('Send email failed:', e);
  }
}

testResendApiKey();
