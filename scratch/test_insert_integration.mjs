import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testIntegrationTable() {
  const { data, error } = await supabase.from('whatsapp_integrations').select('*').limit(5);
  console.log('whatsapp_integrations query:', { data, error });
}

testIntegrationTable();
