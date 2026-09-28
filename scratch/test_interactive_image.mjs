const PHONE_NUMBER_ID = '1352826481241407';
const ACCESS_TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const MEDIA_ID = '2189577828652515';
const to = '919384125278';

async function testInteractiveWithImage() {
  const bodyText = 
    `🎉 *Welcome to Joy Corporate Solutions Pvt. Ltd.!*\n` +
    `Hi *Thirumalai R K*, welcome to Joy PeopleHR! 👋\n\n` +
    `👤 *Employee Profile*\n` +
    `🆔 *Employee Code:* WF-1001\n` +
    `💼 *Role:* Senior Software Engineer\n\n` +
    `🌟 *Your HR Assistant is Ready!*\n` +
    `Tap a quick action below to get started:`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'image',
        image: {
          id: MEDIA_ID,
        },
      },
      body: {
        text: bodyText,
      },
      footer: {
        text: 'People First. Work Simplified.',
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'MENU_PAYSLIP',
              title: '📄 Payslip',
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'MENU_LEAVE',
              title: '🌴 Leave',
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'MENU_ATTENDANCE',
              title: '🕘 Attendance',
            },
          },
        ],
      },
    },
  };

  console.log('Sending interactive message with image header...');
  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

testInteractiveWithImage();
