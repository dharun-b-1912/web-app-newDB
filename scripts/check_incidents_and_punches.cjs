const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function checkIncidentsAndRedis() {
  const { data: inc, error: incErr } = await sb.from('sentinel_incidents').select('*').limit(10);
  console.log('Incidents:', { inc, incErr });

  const { data: punches, error: punchErr } = await sb.from('attendance_punches')
    .select('*')
    .order('punch_time', { ascending: false })
    .limit(10);
  console.log('Latest punches in DB:', { count: punches?.length, punchErr });
  if (punches) console.table(punches.map(p => ({
    id: p.id,
    emp_code: p.employee_code,
    org: p.organization_id,
    device: p.device_id,
    time: p.punch_time,
    type: p.punch_type
  })));
}

checkIncidentsAndRedis();

