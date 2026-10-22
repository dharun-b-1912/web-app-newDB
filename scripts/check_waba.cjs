const fetch = globalThis.fetch || require('node-fetch');

async function checkWaba() {
  const token = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
  const wabaId = '1550382319749383';
  const phoneId = '1352826481241407';

  try {
    const res1 = await fetch(`https://graph.facebook.com/v20.0/${phoneId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Phone status:', await res1.json());

    const res2 = await fetch(`https://graph.facebook.com/v20.0/${wabaId}?fields=id,name,currency,account_review_status,primary_funding_id,purchase_order_number`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('WABA details:', await res2.json());
  } catch (e) {
    console.error(e);
  }
}

checkWaba();
