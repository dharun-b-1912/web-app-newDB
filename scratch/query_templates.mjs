const token = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const wabaId = '1550382319749383';

async function listTemplates() {
  console.log(`Fetching templates for WABA ${wabaId}...`);
  const res = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/message_templates?access_token=${token}`);
  const data = await res.json();
  console.log('Templates:', JSON.stringify(data, null, 2));
}

listTemplates();
