require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatutoryCols() {
  const { data, error } = await supabase.from('employee_statutory_details').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Columns in employee_statutory_details:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  } else {
    console.log('Error/Empty:', error);
  }
}

checkStatutoryCols();
