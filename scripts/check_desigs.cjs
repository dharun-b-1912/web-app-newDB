const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDesigs() {
  const { data, error } = await supabase
    .from('designations')
    .select('id, title, code')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');
  console.log('Electra EV designations:', data, error);
}

checkDesigs();
