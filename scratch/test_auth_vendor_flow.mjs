import { createClient } from '@supabase/supabase-js';

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const sb = createClient(URL, KEY);

async function testAuthVendor() {
  console.log('Logging in as rameshrajajcs@gmail.com...');
  const { data: authData, error: authError } = await sb.auth.signInWithPassword({
    email: 'rameshrajajcs@gmail.com',
    password: 'joypeoplehr'
  });

  if (authError) {
    console.error('Login error:', authError);
    return;
  }
  console.log('Logged in! UID:', authData.user.id);

  // Check org
  const { data: orgs } = await sb.from('organizations').select('id, legal_name').limit(1);
  console.log('Org:', orgs[0]);

  // Insert vendor
  const vendorPayload = {
    organization_id: orgs[0].id,
    vendor_code: `VND_AUTH_${Date.now().toString(36).toUpperCase()}`,
    legal_name: 'Auth Test Facilities Ltd',
    display_name: 'Auth Test Vendor',
    vendor_type: 'FACILITY_SERVICE_PROVIDER',
    category: 'Facility Management',
    status: 'ACTIVE',
    email: 'facilities@authtest.in',
    phone: '+91 98401 23456',
    metadata: {
      trade_name: 'Auth Test Facility Services',
      city: 'Coimbatore',
      state: 'Tamil Nadu'
    }
  };

  const { data: vData, error: vErr } = await sb.from('vendors').insert([vendorPayload]).select().single();
  console.log('Insert vendor result:', { vData, error: vErr });

  if (vData) {
    // Test update vendor
    const { data: uData, error: uErr } = await sb.from('vendors')
      .update({ display_name: 'Updated Facility Services Ltd' })
      .eq('id', vData.id)
      .select()
      .single();
    console.log('Update vendor result:', { uData, error: uErr });

    // Clean up
    const { error: delErr } = await sb.from('vendors').delete().eq('id', vData.id);
    console.log('Delete vendor result:', { delErr });
  }
}

testAuthVendor();
