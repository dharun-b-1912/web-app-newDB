require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createPlantBranch() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const compId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';

  const { data, error } = await supabase.from('branches').insert({
    organization_id: orgId,
    company_id: compId,
    name: 'Electra EV Plant',
    branch_code: 'EEV-PLANT',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    country: 'India',
    is_active: true
  }).select();

  console.log('Created branch:', data, error);
}

createPlantBranch();

