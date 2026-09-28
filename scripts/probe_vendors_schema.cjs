const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) {
    let val = v.join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[k.trim()] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function probeVendorsCols() {
  const candidateCols = [
    'id', 'organization_id', 'vendor_code', 'legal_name', 'display_name', 'name',
    'vendor_type', 'category', 'status', 'onboarding_status', 'tax_id', 'gst_number',
    'pan_number', 'registration_number', 'email', 'phone', 'address', 'website',
    'rating', 'created_at', 'updated_at', 'metadata'
  ];

  const validCols = [];
  for (const col of candidateCols) {
    const { error } = await supabase.from('vendors').select(col).limit(1);
    if (!error) validCols.push(col);
  }
  console.log('Valid columns in vendors table:', validCols);

  // Also probe vendor_workers
  const workerCols = [
    'id', 'vendor_id', 'organization_id', 'worker_code', 'first_name', 'last_name',
    'name', 'email', 'phone', 'designation', 'status', 'compliance_status',
    'created_at', 'updated_at'
  ];
  const validWorkerCols = [];
  for (const col of workerCols) {
    const { error } = await supabase.from('vendor_workers').select(col).limit(1);
    if (!error) validWorkerCols.push(col);
  }
  console.log('Valid columns in vendor_workers table:', validWorkerCols);
}

probeVendorsCols();
