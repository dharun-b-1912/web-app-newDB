require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkElectraOrg() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e')
    .single();

  console.log('Electra EV Org Data:', data, 'Error:', error);
}

checkElectraOrg();

