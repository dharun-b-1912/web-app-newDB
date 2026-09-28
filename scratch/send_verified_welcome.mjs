/// scratch/send_verified_welcome.mjs
const PHONE_NUMBER_ID = '1352826481241407';
const ACCESS_TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const MEDIA_ID = '2189577828652515';
const to = '919384125278'; // Thirumalai R K

const employeeName = 'Thirumalai R K';
const employeeCode = 'WF-1001';
const role = 'Senior Software Engineer';
const company = 'Joy Corporate Solutions Pvt. Ltd.';
const portal = 'https://app.joypeoplehr.com';

const bodyText =
  `*Joy PeopleHR • HR Assistant*\n` +
  `_WhatsApp Employee Self-Service_\n\n` +
  `🎉 *Welcome to ${company}!*\n` +
  `Hi *${employeeName}*, welcome to the Joy PeopleHR family! 👋\n` +
  `Your employee onboarding is complete. We're happy to have you with us.\n\n` +
  `👤 *Your Employee Profile*\n` +
  `🆔 *Employee Code:* ${employeeCode}\n` +
  `💼 *Role:* ${role}\n\n` +
  `🌟 *Your HR Assistant is Ready!*\n` +
  `You can use this chat to access your HR services quickly:\n` +
  `📄 *1. Payslip* – View or download monthly salary statement\n` +
  `🌴 *2. Leave* – Check leave balance and apply for leave\n` +
  `🕘 *3. Attendance* – View attendance and clock-in status\n` +
  `📢 *4. Company News* – Stay updated with announcements\n` +
  `🌐 *5. HR Portal* – Access your complete employee dashboard\n\n` +
  `How would you like to continue? 👇\n` +
  `1️⃣ Payslip  2️⃣ Leave  3️⃣ Attendance  4️⃣ News  5️⃣ Portal\n\n` +
  `💬 Tap a button below or reply with a number (1-5)\n` +
  `🔗 Portal: ${portal}\n\n` +
  `📱 Save this number as Joy PeopleHR HR Assistant`;

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
            title: '⏰ Attendance',
          },
        },
      ],
    },
  },
};

async function send() {
  console.log(`Sending verified welcome message to +${to}...`);
  console.log(`Employee: ${employeeName} | Code: ${employeeCode} | Role: ${role}`);

  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (res.ok) {
    console.log('✅ WhatsApp message dispatched successfully!');
    console.log('Message ID:', data.messages?.[0]?.id);
  } else {
    console.error('❌ Meta WhatsApp API error:', JSON.stringify(data, null, 2));
  }
}

send().catch(console.error);
