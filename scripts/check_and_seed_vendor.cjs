require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVendors() {
  const { data: vList, error } = await supabase.from('vendors').select('*');
  console.log('All vendors:', vList?.map(v => ({ id: v.id, name: v.name, org: v.organization_id })), error);

  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  // Check if Joy Manpower Services exists under Electra EV
  const matched = (vList || []).find(v => v.name?.toLowerCase().includes('joy manpower') && v.organization_id === orgId);
  if (!matched) {
    console.log('Seeding Joy Manpower Services vendor under Electra EV...');
    const { data: newV, error: vErr } = await supabase.from('vendors').insert({
      organization_id: orgId,
      name: 'Joy Manpower Services',
      contact_person: 'Shalini J',
      email: 'shalini@joycorporate.com',
      phone: '9842292434',
      status: 'ACTIVE',
      is_active: true
    }).select();
    console.log('Created vendor:', newV, vErr);
  } else {
    console.log('Found vendor:', matched);
  }
}

checkVendors();

