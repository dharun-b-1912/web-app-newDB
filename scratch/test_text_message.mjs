import 'dotenv/config';

const TOKEN = process.env.META_WA_ACCESS_TOKEN || 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const PHONE_NUMBER_ID = process.env.META_WA_PHONE_NUMBER_ID || '1352826481241407';
const RECIPIENT = '919840209900';

async function sendTextMessage() {
  console.log(`Sending text message from ${PHONE_NUMBER_ID} to ${RECIPIENT}...`);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: RECIPIENT,
    type: 'text',
    text: {
      preview_url: false,
      body: 'Welcome to Joy PeopleHR WhatsApp Self-Service! Your enterprise workforce notifications and employee services are now active.'
    }
  };

  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Result:', JSON.stringify(data, null, 2));
}

sendTextMessage();
