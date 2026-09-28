import { createClient } from '@supabase/supabase-js';

// Check template rejection via WABA details
const TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const WABA  = '1550382319749383';
const G     = 'https://graph.facebook.com/v20.0';
const H     = { Authorization: 'Bearer ' + TOKEN };

async function get(url) {
  const r = await fetch(url, { headers: H });
  return r.json();
}

// Check template ID details
const tplId = '38642146765400526';
const detail = await get(G + '/' + tplId + '?fields=name,status,rejected_reason,quality_score,message_send_ttl_seconds');
console.log('Template detail:', JSON.stringify(detail, null, 2));

// Check WABA account level info
const wabaDetail = await get(G + '/' + WABA + '?fields=id,name,account_review_status,ban_state,message_templates_namespace,on_behalf_of_business_info,primary_funding_id');
console.log('\nWABA detail:', JSON.stringify(wabaDetail, null, 2));
