require('dotenv').config();

async function testSendWelcome() {
  const metaToken = process.env.META_WA_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID || '1352826481241407';

  // Let's test the payload
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '919842292434', // test recipient
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
            { type: 'text', text: 'Joy Corporate Solutions' },
            { type: 'text', text: 'Thirumalai R K' },
            { type: 'text', text: 'JCS-004' },
            { type: 'text', text: 'thirumalai@joyglobalcorp.com' }
          ]
        }
      ]
    }
  };

  console.log('Sending request to Meta...');
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${metaToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const resData = await res.json();
  console.log('Response status:', res.status);
  console.log('Response body:', JSON.stringify(resData, null, 2));
}

testSendWelcome();

