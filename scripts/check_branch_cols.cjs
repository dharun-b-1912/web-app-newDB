require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBranchCols() {
  const { data, error } = await supabase.from('branches').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Branch columns:', Object.keys(data[0]));
  } else {
    console.log('Error/No data:', error);
  }
}

checkBranchCols();

