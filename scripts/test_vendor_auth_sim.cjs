const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const sb = createClient(url, key);

async function testEdgeFunction() {
  console.log('Invoking vendor-auth-provisioner edge function...');
  const res = await sb.functions.invoke('vendor-auth-provisioner', {
    body: { action: 'PING' }
  });
  console.log('Response status:', res.status, 'data:', res.data, 'error:', res.error);
}

testEdgeFunction();
