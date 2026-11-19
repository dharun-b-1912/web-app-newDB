require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('vendors').select('*').eq('id', 'efa06c62-4197-4c85-93eb-6d490dfd4302');
  console.log('Vendor row for Electra EV:', data);
}
run();

