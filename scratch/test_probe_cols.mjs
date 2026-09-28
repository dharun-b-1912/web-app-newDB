import { createClient } from '@supabase/supabase-js';

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const sb = createClient(URL, KEY);

async function testInsert() {
  await sb.auth.signInWithPassword({
    email: 'rameshrajajcs@gmail.com',
    password: 'joypeoplehr'
  });

  const { data: orgs } = await sb.from('organizations').select('id').limit(1);

  const testPayload = {
    organization_id: orgs[0].id,
    vendor_code: `VND_TEST_${Date.now().toString(36).toUpperCase()}`,
    legal_name: 'Test Vendor Connectivity Inc',
    contact_email: 'test@vendor.com',
  };

  const { data, error } = await sb.from('vendors').insert([testPayload]).select();
  console.log('Insert with contact_email:', { data, error });
}

testInsert();
