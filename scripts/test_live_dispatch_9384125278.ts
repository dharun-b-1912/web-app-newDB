import dotenv from 'dotenv';
dotenv.config();

import { OFFICIAL_TEMPLATES, renderTemplate } from '../src/services/communications/templateRegistry';

async function testLiveSmsToThirumalai(): Promise<void> {
  const username = process.env.AIRTEL_IQ_USERNAME || process.env.VITE_AIRTEL_IQ_USERNAME;
  const password = process.env.AIRTEL_IQ_PASSWORD || process.env.VITE_AIRTEL_IQ_PASSWORD;
  const customerId = process.env.AIRTEL_CUSTOMER_ID || process.env.VITE_AIRTEL_CUSTOMER_ID;
  const entityId = process.env.AIRTEL_DLT_PE_ID || process.env.VITE_AIRTEL_DLT_PE_ID;
  const baseUrl = process.env.AIRTEL_IQ_SMS_BASE_URL || 'https://iqsms.airtel.in/api/v1/send-prepaid-sms';
  const defaultSenderId = process.env.AIRTEL_DEFAULT_SENDER_ID || process.env.VITE_AIRTEL_DEFAULT_SENDER_ID || 'JCSPRL';

  if (!username || !password || !customerId || !entityId) {
    console.error('❌ Missing required Airtel IQ environment variables in .env');
    console.error({
      hasUsername: Boolean(username),
      hasPassword: Boolean(password),
      hasCustomerId: Boolean(customerId),
      hasEntityId: Boolean(entityId),
    });
    process.exit(1);
  }

  const rawPhone = process.argv[2] || '9384125278';
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const destinationPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

  console.log(`\n======================================================`);
  console.log(`📡 AIRTEL IQ LIVE GATEWAY TRANSMISSION TEST`);
  console.log(`Recipient: +${destinationPhone}`);
  console.log(`======================================================\n`);

  // Use the approved official template definition
  const template = OFFICIAL_TEMPLATES['JOYHR_LOGIN_OTP'];
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const validityMinutes = '10';
  const messageBody = renderTemplate(template.bodyPattern, [otpCode, validityMinutes]);

  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

  const payload = {
    customerId,
    destinationAddress: [destinationPhone],
    message: messageBody,
    sourceAddress: template.senderId || defaultSenderId,
    dltTemplateId: template.dltTemplateId,
    entityId,
    messageType: 'TRANSACTIONAL',
  };

  console.log('Sending payload to Airtel IQ:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    const resp = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`\nHTTP Response Code: ${resp.status} ${resp.statusText}`);
    const body: unknown = await resp.json().catch(async () => await resp.text());
    console.log('Airtel IQ Gateway Raw Response:');
    console.log(JSON.stringify(body, null, 2));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Transmission error:', errorMessage);
  }
}

testLiveSmsToThirumalai();
