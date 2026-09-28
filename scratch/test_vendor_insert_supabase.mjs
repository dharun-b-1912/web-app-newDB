import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing Supabase connection to vendors...');
  
  // 1. Select
  const { data: list, error: selErr } = await supabase.from('vendors').select('*').limit(3);
  console.log('Select vendors:', { count: list?.length, error: selErr });

  // 2. Select with specific fields
  const { data: orgs } = await supabase.from('organizations').select('id, legal_name').limit(1);
  const orgId = orgs?.[0]?.id;
  console.log('Org ID:', orgId);

  // 3. Try to insert minimal vendor with valid UUID and matching columns
  const testPayload = {
    organization_id: orgId,
    vendor_code: `VND_TEST_${Date.now().toString(36).toUpperCase()}`,
    legal_name: 'Test Vendor Connectivity Inc',
    display_name: 'Test Vendor',
    vendor_type: 'FACILITY_SERVICE_PROVIDER',
    category: 'Facility Management',
    status: 'ACTIVE',
    email: 'test@vendor.com',
    phone: '+919999999999',
  };

  const { data: insData, error: insErr } = await supabase.from('vendors').insert([testPayload]).select();
  console.log('Insert minimal vendor:', { insData, error: insErr });
}

test();
