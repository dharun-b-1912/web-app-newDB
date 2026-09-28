const token = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const businessId = '1570557284705178';
const appId = '1477770540837429';
const appSecret = 'b8b0290687a9f7dd78f6eaa4dba960a0';

async function queryBusiness() {
  console.log(`Checking Business ID ${businessId}...`);
  
  // 1. Check client_whatsapp_business_accounts / owned_whatsapp_business_accounts
  const resWaba = await fetch(`https://graph.facebook.com/v20.0/${businessId}/owned_whatsapp_business_accounts?access_token=${token}`);
  const dataWaba = await resWaba.json();
  console.log('Owned WABA Accounts:', JSON.stringify(dataWaba, null, 2));

  const resClientWaba = await fetch(`https://graph.facebook.com/v20.0/${businessId}/client_whatsapp_business_accounts?access_token=${token}`);
  const dataClientWaba = await resClientWaba.json();
  console.log('Client WABA Accounts:', JSON.stringify(dataClientWaba, null, 2));

  // If WABA is found, get phone numbers
  const wabaAccounts = [...(dataWaba.data || []), ...(dataClientWaba.data || [])];
  for (const waba of wabaAccounts) {
    console.log(`Querying phone numbers for WABA: ${waba.id} (${waba.name})...`);
    const resPhones = await fetch(`https://graph.facebook.com/v20.0/${waba.id}/phone_numbers?access_token=${token}`);
    const dataPhones = await resPhones.json();
    console.log(`Phone numbers for ${waba.id}:`, JSON.stringify(dataPhones, null, 2));
  }
}

queryBusiness();
