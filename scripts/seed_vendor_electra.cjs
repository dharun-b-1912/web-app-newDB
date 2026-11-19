require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedVendorForElectra() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const { data: existing } = await supabase
    .from('vendors')
    .select('id, legal_name, display_name')
    .eq('organization_id', orgId);

  if (existing && existing.length > 0) {
    console.log('Vendor already exists for Electra EV:', existing);
    return;
  }

  const { data: newV, error: vErr } = await supabase.from('vendors').insert({
    organization_id: orgId,
    legal_name: 'Joy Manpower Services Private Limited',
    display_name: 'Joy Manpower Services',
    trade_name: 'Joy Manpower Services',
    vendor_code: 'VND-JMS-EEV',
    contact_person: 'Shalini J',
    contact_email: 'shalini@joycorporate.com',
    contact_phone: '+91 98422 92434',
    status: 'ACTIVE',
    vendor_type: 'MANPOWER_PROVIDER',
    category: 'Manpower Supply & Operations'
  }).select();

  console.log('Created vendor for Electra EV:', newV, vErr);
}

seedVendorForElectra();

