require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVendorCols() {
  const { data, error } = await supabase.from('vendors').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Vendor columns:', Object.keys(data[0]));
    console.log('Vendor row 0:', data[0]);
  } else {
    console.log('Error / Empty:', error);
  }
}

checkVendorCols();

