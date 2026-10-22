async function sendDirectResendTest() {
  const apiKey = 're_mock_dummy_resend_api_key_sanitized';
  const target = 'thirumalairk28@gmail.com';
  console.log(`[TEST] Sending email via Resend to ${target}...`);

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
        subject: 'Joy PeopleHR - Email Delivery Test',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 540px; margin: 0 auto;">
            <div style="background: #07563D; color: white; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Joy PeopleHR</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">WorkforceOS Enterprise Portal</p>
            </div>
            
            <p style="font-size: 15px; color: #1e293b;">Hello,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">This is a test email confirming that outbound emails for <strong>Joy PeopleHR</strong> (joypeoplehr.com) are active and delivering properly to your inbox.</p>
            
            <div style="background: #e6f4ea; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #a3d9b8;">
              <p style="margin: 0; font-size: 14px; color: #07563D; font-weight: 600;">Status: Outbound Email Delivery Operational</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #065f46;">Delivered to: ${target}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Joy Corporate Solutions &middot; joypeoplehr.com</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    console.log('[RESEND STATUS]:', res.status);
    console.log('[RESEND RESPONSE]:', data);
  } catch (e) {
    console.error('Send error:', e);
  }
}

sendDirectResendTest();
