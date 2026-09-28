import { createClient } from '@supabase/supabase-js';

const client = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj');

async function check() {
  const { data: v, error: vErr } = await client.from('vendors').select('id, vendor_code, legal_name, pan_number, status');
  console.log('Vendors in DB count:', v ? v.length : 0, vErr ? vErr.message : '');
  console.log('Vendors:', JSON.stringify(v, null, 2));

  const { data: w, error: wErr } = await client.from('vendor_workers').select('id, worker_code, full_name, status');
  console.log('Vendor workers in DB count:', w ? w.length : 0, wErr ? wErr.message : '');
  console.log('Workers:', JSON.stringify(w, null, 2));

  const { data: c, error: cErr } = await client.from('vendor_contracts').select('*');
  console.log('Vendor contracts in DB count:', c ? c.length : 0, cErr ? cErr.message : '');

  const { data: d, error: dErr } = await client.from('vendor_documents').select('*');
  console.log('Vendor documents in DB count:', d ? d.length : 0, dErr ? dErr.message : '');
}
check();
