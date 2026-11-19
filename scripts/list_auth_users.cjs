require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  console.log('Total Auth Users:', users?.length);
  for (const u of (users || [])) {
    console.log(`- Email: ${u.email} | ID: ${u.id} | Confirmed: ${Boolean(u.email_confirmed_at)}`);
  }
}

listUsers();

