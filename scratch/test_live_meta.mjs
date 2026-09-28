// scratch/test_live_meta.mjs
const PHONE_NUMBER_ID = '1352826481241407';
const ACCESS_TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const MEDIA_ID = '2189577828652515';
const to = '919384125278';

// Exact authoritative profile data
const employeeName = 'Thirumalai R K';
const employeeCode = 'WF-1001';
const role = 'Senior Software Engineer';
const company = 'Joy Corporate Solutions Pvt. Ltd.';
const portal = 'https://app.joypeoplehr.com';

const bodyText =
  `🎉 *Welcome to ${company}!* 👋\n` +
  `Hi *${employeeName}*, welcome to the Joy PeopleHR family!\n` +
  `Your employee onboarding is complete. We're happy to have you with us.\n\n` +
  `👤 *Your Employee Profile*\n` +
  `🆔 *Employee Code:* ${employeeCode}\n` +
  `💼 *Role:* ${role}\n\n` +
  `🌟 *Your HR Assistant is Ready!*\n` +
  `Tap a quick action button below to get started instantly:\n` +
  `📄 1. Payslip – View or download salary statement\n` +
  `🌴 2. Leave – Check balance & apply for leave\n` +
  `🕘 3. Attendance – Clock-in & shift status\n` +
  `📢 4. Company News & Circulars\n` +
  `🌐 5. HR Portal: ${portal}`;

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

async function send() {
  console.log('Sending message to', to);
  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log('Meta API Response:', JSON.stringify(data, null, 2));
}

send();
