/**
 * Re-send welcome message to Thirumalai with full rich content
 * The Meta API returned 200 before but delivery may have been silent.
 * Try multiple formats to ensure at least one reaches him.
 */

const META_TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const PHONE_NUMBER_ID = '1352826481241407';
const API_VERSION = 'v20.0';
const BASE = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

const TARGET = '919384125278'; // Thirumalai R K

async function send(body) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  console.log(`Sending to Thirumalai R K (${TARGET})...\n`);

  // Message 1: Short text first (most likely to go through)
  console.log('→ Message 1: Short greeting text');
  const r1 = await send({
    messaging_product: 'whatsapp',
    to: TARGET,
    type: 'text',
    text: {
      body: `Hi Thirumalai! 👋 This is Joy PeopleHR bot (+91 90430 22330).\n\nYour Joy PeopleHR account is now active. Reply *Hi* to get started.\n\n— Joy Corporate Solutions HR Team`
    }
  });
  console.log(`  ${r1.ok ? '✅' : '❌'} Status: ${r1.status}`);
  if (r1.ok) console.log(`  Message ID: ${r1.json.messages?.[0]?.id}`);
  else console.log(`  Error: ${JSON.stringify(r1.json.error)}`);

  await new Promise(r => setTimeout(r, 1000));

  // Message 2: Full welcome message
  console.log('\n→ Message 2: Full welcome with portal details');
  const r2 = await send({
    messaging_product: 'whatsapp',
    to: TARGET,
    type: 'text',
    text: {
      body:
        `🎉 *Welcome to Joy Corporate Solutions Pvt Ltd!*\n\n` +
        `Dear *Thirumalai R K*,\n\n` +
        `Your onboarding is complete. Here is your employee information:\n\n` +
        `🪪 *Employee Code:* WF-1001\n` +
        `💼 *Role:* Software Engineer\n` +
        `🏢 *Department:* Engineering\n\n` +
        `*Your WhatsApp HR Self-Service is now ACTIVE:*\n` +
        `📄 Reply *PAYSLIP* → Get latest payslip\n` +
        `🌴 Reply *LEAVE* → Check leave balance & apply\n` +
        `⏰ Reply *ATTENDANCE* → View attendance\n` +
        `📢 Reply *NEWS* → Company announcements\n\n` +
        `🌐 Portal: https://app.joypeoplehr.com\n\n` +
        `_Save this number (+91 90430 22330) as Joy PeopleHR_`
    }
  });
  console.log(`  ${r2.ok ? '✅' : '❌'} Status: ${r2.status}`);
  if (r2.ok) console.log(`  Message ID: ${r2.json.messages?.[0]?.id}`);
  else console.log(`  Error: ${JSON.stringify(r2.json.error)}`);

  console.log('\n=== IMPORTANT NOTE FOR THIRUMALAI ===');
  console.log('Messages sent from: +91 90430 22330 (JoypeopleHR)');
  console.log('On Android: Check "New chats" section at top of WhatsApp');
  console.log('On iPhone:  Check "Filtered Messages" or scroll chat list');
  console.log('The number may show as "Business Account" not saved contact');
}

main().catch(console.error);
