import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkHolidayCols() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  const candidates = [
    'id', 'organization_id', 'name', 'holiday_name', 'date', 'holiday_date',
    'is_optional', 'is_mandatory', 'type', 'calendar_year', 'year', 'created_at'
  ];

  for (const c of candidates) {
    const { error } = await supabase.from('holidays').select(c).limit(1);
    if (error) {
      console.log(`holidays.${c}: NO (${error.message})`);
    } else {
      console.log(`holidays.${c}: YES`);
    }
  }
}

checkHolidayCols();
