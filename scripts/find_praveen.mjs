import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function checkPraveen() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .ilike('first_name', '%Praveen%');
  
  if (error) console.error(error);
  else console.log('Found Praveen:', JSON.stringify(data, null, 2));

  const { data: orgs } = await supabase.from('organizations').select('id, name');
  console.log('Organizations:', JSON.stringify(orgs, null, 2));
}

checkPraveen();
