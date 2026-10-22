const fetch = globalThis.fetch || require('node-fetch');

async function test() {
  const token = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
  const phoneId = '1352826481241407';
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('WhatsApp Business Profile:', await res.json());
}

test();
