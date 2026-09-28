import 'dotenv/config';

const TOKEN = process.env.META_WA_ACCESS_TOKEN || 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const PHONE_NUMBER_ID = process.env.META_WA_PHONE_NUMBER_ID || '1352826481241407';
const RECIPIENT = '919840209900';

console.log('================================================================');
console.log('       JOY PEOPLEHR — WHATSAPP BUSINESS PLATFORM TEST RUNNER   ');
console.log('================================================================');
console.log(`[Config] Sender Phone ID:   ${PHONE_NUMBER_ID} (+91 90430 22330)`);
console.log(`[Config] Recipient Phone:   ${RECIPIENT} (+91 98402 09900)`);
console.log(`[Config] Meta API Version:  v20.0`);
console.log(`[Config] Timestamp:         ${new Date().toISOString()}`);
console.log('----------------------------------------------------------------');

async function sendTestMessage() {
  // 1. Try sending the default Meta pre-approved hello_world template
  console.log('\n[1/2] Dispatched Meta HSM Template ("hello_world")...');
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: RECIPIENT,
    type: 'template',
    template: {
      name: 'hello_world',
      language: {
        code: 'en_US'
      }
    }
  };

  console.log('[Request Body]:\n', JSON.stringify(payload, null, 2));

  try {
    const startTime = Date.now();
    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;
    const data = await res.json();

    console.log(`\n[Meta API HTTP Response]: Status ${res.status} (${duration}ms)`);
    console.log('[Response Body]:\n', JSON.stringify(data, null, 2));

    if (res.ok && data.messages && data.messages.length > 0) {
      const msgId = data.messages[0].id;
      console.log('\n================================================================');
      console.log(`✅ SUCCESS! WhatsApp Message Dispatched.`);
      console.log(`   Message WAMID: ${msgId}`);
      console.log(`   Delivery Status: SENT -> Check WhatsApp on +91 98402 09900`);
      console.log('================================================================');
    } else {
      console.log('\n================================================================');
      console.log(`⚠️ Meta API Error Response:`);
      if (data.error) {
        console.log(`   Code:    ${data.error.code} (Subcode: ${data.error.error_subcode || 'N/A'})`);
        console.log(`   Message: ${data.error.message}`);
        console.log(`   Details: ${data.error.error_user_msg || data.error.error_data?.details || 'N/A'}`);
      }
      console.log('================================================================');
    }
  } catch (err) {
    console.error('\n❌ Network or Execution Exception:', err);
  }
}

sendTestMessage();
