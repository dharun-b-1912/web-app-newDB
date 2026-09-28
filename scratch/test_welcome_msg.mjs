// scratch/test_welcome_msg.mjs
const PHONE_NUMBER_ID = '1352826481241407';
const ACCESS_TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const MEDIA_ID = '2189577828652515';

const to = '919384125278'; // Thirumalai R K
const employeeName = 'Thirumalai R K';
const employeeCode = 'EMP-2026-0042';
const company = 'Joy Corporate Solutions Pvt. Ltd.';
const role = 'Senior Specialist';
const portal = 'https://app.joypeoplehr.com';

const caption =
  `*Joy PeopleHR • HR Assistant*\n` +
  `*WhatsApp Employee Self-Service*\n\n` +
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
  `*How would you like to continue?* 👇\n` +
  `1️⃣ Payslip  2️⃣ Leave  3️⃣ Attendance  4️⃣ News  5️⃣ Portal\n\n` +
  `💬 Reply with a number or type *PAYSLIP*, *LEAVE*, or *ATTENDANCE*.\n` +
  `🔗 Portal: ${portal}\n\n` +
  `📱 Save this number as *Joy PeopleHR HR Assistant*\n` +
  `_People First. Work Simplified._`;

async function run() {
  console.log('Sending message to', to, 'caption length:', caption.length);
  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        id: MEDIA_ID,
        caption,
      },
    }),
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

run();
