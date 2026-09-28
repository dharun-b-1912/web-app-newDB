const token = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const testPhoneId = '1320562981133693';
const prodPhoneId = '1352826481241407';
const wabaId = '1550382319749383';
const testWabaId = '2272946616892615';

async function executeUseCaseTests() {
  console.log('--- 1. Testing Phone Number API Calls ---');
  const resPhone1 = await fetch(`https://graph.facebook.com/v20.0/${prodPhoneId}?access_token=${token}`);
  console.log('Prod Phone Meta Details:', await resPhone1.json());

  const resPhone2 = await fetch(`https://graph.facebook.com/v20.0/${testPhoneId}?access_token=${token}`);
  console.log('Test Phone Meta Details:', await resPhone2.json());

  console.log('\n--- 2. Testing WABA API Calls ---');
  const resWaba1 = await fetch(`https://graph.facebook.com/v20.0/${wabaId}?fields=id,name,currency,timezone_id,message_template_namespace&access_token=${token}`);
  console.log('WABA Meta Details:', await resWaba1.json());

  console.log('\n--- 3. Testing Message Template Query ---');
  const resTemplates = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/message_templates?access_token=${token}`);
  console.log('WABA Templates List:', await resTemplates.json());

  console.log('\n--- 4. Testing Business Profile API ---');
  const resProfile = await fetch(`https://graph.facebook.com/v20.0/${prodPhoneId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical&access_token=${token}`);
  console.log('Business Profile:', await resProfile.json());
}

executeUseCaseTests();
