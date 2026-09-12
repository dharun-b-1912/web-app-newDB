import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseAnonKey = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  const { data: orgs } = await supabase.from('organizations').select('*').limit(1);
  if (!orgs || orgs.length === 0) {
    console.error('No organization found!');
    return;
  }
  const orgId = orgs[0].id;
  console.log('Testing mapped company insertion with orgId:', orgId);

  const dbCompanyPayload = {
    organization_id: orgId,
    legal_name: 'Test Legal Entity ' + Date.now(),
    trade_name: 'Test Trade Name',
    company_code: 'CMP-' + Math.floor(1000 + Math.random() * 9000),
    cin_number: 'U72900TZ2026PTC' + Math.floor(100000 + Math.random() * 900000),
    pan_number: 'AAACJ' + Math.floor(1000 + Math.random() * 9000) + 'A',
    gstin: '33AAACJ1234A1Z5',
    registered_address: '100 Crosscut Road, Gandhipuram',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    postal_code: '641012',
    country: 'India',
    is_headquarters: false,
    is_active: true,
  };

  const { data: compData, error: compErr } = await supabase
    .from('companies')
    .insert([dbCompanyPayload])
    .select()
    .single();

  console.log('Company insert result:', compData, 'Error:', compErr);

  if (compData) {
    console.log('\nTesting mapped branch insertion with compId:', compData.id);
    const dbBranchPayload = {
      organization_id: orgId,
      company_id: compData.id,
      name: 'Coimbatore Main Branch',
      branch_code: 'BR-CBE-01',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      phone: '+91 9876543210',
      email: 'branch.cbe@joycorp.com',
      is_active: true,
    };

    const { data: branchData, error: branchErr } = await supabase
      .from('branches')
      .insert([dbBranchPayload])
      .select()
      .single();

    console.log('Branch insert result:', branchData, 'Error:', branchErr);

    // Clean up
    if (branchData) {
      await supabase.from('branches').delete().eq('id', branchData.id);
    }
    await supabase.from('companies').delete().eq('id', compData.id);
    console.log('\nCleaned up test records successfully!');
  }
}

inspect().catch(console.error);
