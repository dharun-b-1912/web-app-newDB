const fetch = globalThis.fetch || require('node-fetch');

const token = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const phoneId = '1352826481241407';

async function testSend() {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '919944399088',
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
              image: { id: '1833658240976922' }
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Joy Corporate Solutions' },
            { type: 'text', text: 'DHARUN B' },
            { type: 'text', text: 'JCS-017' },
            { type: 'text', text: 'dharun@joyglobalcorp.com' }
          ]
        }
      ]
    }
  };

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log('Test send result:', JSON.stringify(data, null, 2));
}

testSend();
