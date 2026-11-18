require('dotenv').config();

async function testFullWelcomeFlow() {
  const metaToken = process.env.META_WA_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID || '1352826481241407';
  const targetPhone = '919842292434'; // Test phone

  const employeeName = 'Thirumalai R K';
  const employeeCode = 'JCS-004';
  const companyName = 'Joy Corporate Solutions';
  const workEmail = 'thirumalai@joyglobalcorp.com';

  console.log('1. Sending joy_hr_welcome_v2 template with Image Header...');
  const tplRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${metaToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: targetPhone,
      type: 'template',
      template: {
        name: 'joy_hr_welcome_v2',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: { link: 'https://app.joypeoplehr.com/welcome-to-joy-people-hr.png' }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: companyName },
              { type: 'text', text: employeeName },
              { type: 'text', text: employeeCode },
              { type: 'text', text: workEmail }
            ]
          }
        ]
      }
    })
  });
  const tplData = await tplRes.json();
  console.log('Template dispatch result:', tplData);

  console.log('2. Sending Companion Device Access Guide...');
  const guideText =
    `📱 *JOY PeopleHR — Mobile & Web App Access*\n\n` +
    `👋 Welcome, *${employeeName}*! Access your HR Self-Service portal on your mobile device:\n\n` +
    `🤖 *For Android Users (Google Play Store):*\n` +
    `Download the official app to mark attendance, apply for leave, and view payslips:\n` +
    `👉 https://play.google.com/store/apps/details?id=com.joypeoplehr.app\n\n` +
    `🍏 *For iOS / Apple Device Users (iPhone & iPad):*\n` +
    `Open the Mobile Web App directly in Safari:\n` +
    `👉 https://mobile.joypeoplehr.com\n` +
    `💡 *Install on iPhone:* Open in Safari ➔ tap the *Share* button (square with arrow ↑) ➔ select *"Add to Home Screen"*. It will install and run just like a native full-screen app!\n\n` +
    `🔐 *Login Credentials:*\n` +
    `• Employee ID: *${employeeCode}*\n` +
    `• Official Email: *${workEmail}*\n` +
    `• Default Password: *joypeoplehr*\n\n` +
    `💬 *Quick HR Help:* You can reply to this chat anytime with *Payslip*, *Leave*, or *Attendance*!`;

  const textRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${metaToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: targetPhone,
      type: 'text',
      text: {
        preview_url: true,
        body: guideText
      }
    })
  });
  const textData = await textRes.json();
  console.log('Companion Guide dispatch result:', textData);
}

testFullWelcomeFlow();
