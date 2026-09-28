/**
 * Direct WhatsApp delivery diagnostic for 919384125278 (Thirumalai R K)
 */

const META_TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const PHONE_NUMBER_ID = '1352826481241407';
const API_VERSION = 'v20.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

const TARGET_PHONE = '919384125278'; // Thirumalai R K

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  console.log(`=== WhatsApp Delivery Diagnostic for ${TARGET_PHONE} ===\n`);

  // Test 1: Plain text message
  console.log('Test 1: Sending plain text message...');
  const t1 = await post(`${BASE}/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: TARGET_PHONE,
    type: 'text',
    text: {
      preview_url: false,
      body: `Hi Thirumalai! This is a test message from Joy PeopleHR. Time: ${new Date().toISOString()}`
    }
  });
  console.log(`  Status: ${t1.status} ${t1.ok ? '✅' : '❌'}`);
  console.log(`  Response:`, JSON.stringify(t1.json, null, 2));

  if (!t1.ok) {
    const errCode = t1.json?.error?.code;
    const errMsg = t1.json?.error?.message;
    const errData = t1.json?.error?.error_data;

    console.log('\n=== Diagnosis ===');
    if (errCode === 131026) {
      console.log('❌ Error 131026: Message undeliverable — WhatsApp number may not exist or is not reachable.');
      console.log('   → Possible cause: The number has not opted in or is not a WhatsApp account.');
    } else if (errCode === 131047) {
      console.log('❌ Error 131047: 24-hour session window expired.');
      console.log('   → The number must first send a message to 9043022330 to open a session window.');
      console.log('   → Once a template is approved, this restriction is bypassed.');
    } else if (errCode === 130429) {
      console.log('❌ Error 130429: Rate limit hit — too many messages sent recently.');
    } else if (errCode === 131021) {
      console.log('❌ Error 131021: Recipient phone number not in allowed list (sandbox restriction).');
      console.log('   → Need to add 9384125278 to the WABA test recipients in Meta Business settings.');
    } else {
      console.log(`❌ Unknown error ${errCode}: ${errMsg}`);
      if (errData) console.log('   Error data:', JSON.stringify(errData));
    }

    // Test 2: Check if number is registered on WhatsApp
    console.log('\nTest 2: Checking if number is registered on WhatsApp...');
    const t2 = await post(`${BASE}/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      to: TARGET_PHONE,
      type: 'text',
      text: { body: 'test' }
    });
    console.log(`  Status: ${t2.status}`);
    console.log(`  Response:`, JSON.stringify(t2.json, null, 2));
  }

  // Check recent message logs from Meta
  console.log('\nTest 3: Checking WABA messaging limit status...');
  const limitRes = await fetch(
    `${BASE}/${PHONE_NUMBER_ID}?fields=messaging_limit_tier,quality_rating,throughput,code_verification_status`,
    { headers: { 'Authorization': `Bearer ${META_TOKEN}` } }
  );
  const limitJson = await limitRes.json();
  console.log('  WABA Status:', JSON.stringify(limitJson, null, 2));

  console.log('\n=== Actions to fix ===');
  console.log('1. Ask Thirumalai to send any message to: +91 90430 22330');
  console.log('2. This opens the 24-hr window so we can send free-text messages');
  console.log('3. OR wait for Meta template approval (~24hrs) for unrestricted sending');
  console.log('4. Once template approved: onboarding auto-sends without any restriction');
}

main().catch(console.error);
