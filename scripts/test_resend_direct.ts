import { resendEmailService } from '../src/services/email/resendEmailService';

async function testResend() {
  const target = 'thirumalairk27@gmail.com';
  console.log(`[TEST] Dispatching email via Resend to: ${target}`);
  try {
    const res = await resendEmailService.sendAccountCreationOtpEmail({
      to: target,
      recipientName: 'Thirumalai',
      otpCode: '849201',
      purpose: 'ACCOUNT_ACTIVATION',
      organizationName: 'Joy PeopleHR',
      loginIdentifier: target,
      activationUrl: 'https://joypeoplehr.com/activate?token=test-token',
    });

    console.log('[RESEND RESULT]:', res);
  } catch (err) {
    console.error('[RESEND ERROR]:', err);
  }
}

testResend();
