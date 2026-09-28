/**
 * Check template rejection reasons and fetch details
 */
const META_TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const WABA_ID = '1550382319749383';
const API_VERSION = 'v20.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

async function main() {
  const res = await fetch(
    `${BASE}/${WABA_ID}/message_templates?fields=name,status,category,rejected_reason,quality_score,components&limit=50`,
    { headers: { 'Authorization': `Bearer ${META_TOKEN}` } }
  );
  const json = await res.json();
  const templates = json.data || [];
  
  console.log('=== All Templates with Rejection Reasons ===\n');
  templates.forEach(t => {
    console.log(`[${t.status}] ${t.name}`);
    if (t.rejected_reason) {
      console.log(`  Rejection: ${t.rejected_reason}`);
    }
    if (t.quality_score) {
      console.log(`  Quality: ${JSON.stringify(t.quality_score)}`);
    }
  });

  // Also check WABA phone number status
  console.log('\n=== Checking WABA Phone Number Status ===');
  const phoneRes = await fetch(
    `${BASE}/1352826481241407?fields=verified_name,code_verification_status,quality_rating,throughput,messaging_limit_tier`,
    { headers: { 'Authorization': `Bearer ${META_TOKEN}` } }
  );
  const phoneJson = await phoneRes.json();
  console.log(JSON.stringify(phoneJson, null, 2));
}

main().catch(console.error);
