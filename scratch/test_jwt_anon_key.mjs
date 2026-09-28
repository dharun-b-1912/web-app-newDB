import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const JWT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const sb = createClient(SUPABASE_URL, JWT_ANON_KEY);

async function test() {
  console.log('Testing with JWT anon key...');
  const { data: orgs } = await sb.from('organizations').select('id, legal_name').limit(1);
  console.log('Org:', orgs);

  const testPayload = {
    organization_id: orgs[0].id,
    vendor_code: `VND_${Date.now().toString(36).toUpperCase()}`,
    legal_name: 'JWT Key Test Vendor Ltd',
    display_name: 'JWT Vendor',
    vendor_type: 'FACILITY_SERVICE_PROVIDER',
    category: 'Facility Management',
    status: 'ACTIVE',
    email: 'jwt@vendor.com',
    phone: '+919999999999',
  };

  const { data, error } = await sb.from('vendors').insert([testPayload]).select();
  console.log('Insert result with JWT key:', { data, error });
}

test();
