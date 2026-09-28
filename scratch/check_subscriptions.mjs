const token = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const appId = '1477770540837429';

async function main() {
  const wabaId = '1550382319749383';
  console.log('Subscribing app to WABA...');
  const subRes = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Subscribe result:', await subRes.json());

  const r2 = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/subscribed_apps?access_token=${token}`);
  console.log('WABA Subscribed Apps now:', await r2.json());
}

main().catch(console.error);
