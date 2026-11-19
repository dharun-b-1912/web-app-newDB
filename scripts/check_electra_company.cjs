require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCompanies() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('organization_id', orgId);

  console.log('Companies for Electra EV:', data, 'Error:', error);
}

checkCompanies();

