import { createClient } from '@supabase/supabase-js';

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const sb = createClient(URL, KEY);

async function testLogin() {
  console.log('Testing sign-in with rameshrajajcs@gmail.com...');
  const { data, error } = await sb.auth.signInWithPassword({
    email: 'rameshrajajcs@gmail.com',
    password: 'PermanentSecurePass@2026'
  });

  if (error) {
    console.error('Login error:', error.message);
    return;
  }

  console.log('Logged in successfully! User ID:', data.user.id);
  console.log('Access token acquired!');

  // Now test inserting vendor as authenticated user!
  const { data: orgs } = await sb.from('organizations').select('id, legal_name').limit(1);
  console.log('Active org:', orgs[0]);

  const testVendor = {
    organization_id: orgs[0].id,
    vendor_code: `VND_AUTH_${Date.now().toString(36).toUpperCase()}`,
    legal_name: 'Auth Test Facilities Ltd',
    display_name: 'Auth Test Vendor',
    vendor_type: 'FACILITY_SERVICE_PROVIDER',
    category: 'Facility Management',
    status: 'ACTIVE',
    email: 'facilities@authtest.in',
    phone: '+91 98401 23456',
  };

  const { data: vData, error: vErr } = await sb.from('vendors').insert([testVendor]).select().single();
  console.log('Insert vendor as AUTHENTICATED user:', { vData, error: vErr });

  if (vData) {
    // Test update
    const { data: uData, error: uErr } = await sb.from('vendors').update({ display_name: 'Updated Auth Test Vendor' }).eq('id', vData.id).select().single();
    console.log('Update vendor as AUTHENTICATED user:', { uData, error: uErr });

    // Clean up
    await sb.from('vendors').delete().eq('id', vData.id);
    console.log('Cleaned up test vendor.');
  }
}

testLogin();
