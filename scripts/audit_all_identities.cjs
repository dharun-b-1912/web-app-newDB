const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['\"]|['\"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectAll() {
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .order('employee_code');

  if (empErr) {
    console.error('empErr:', empErr);
    return;
  }

  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const { data: profiles, error: profErr } = await supabase.from('user_profiles').select('*');

  console.log(`Found ${emps.length} employees in public.employees`);
  console.log(`Found ${users.length} users in auth.users`);
  console.log(`Found ${profiles.length} profiles in public.user_profiles`);

  for (const emp of emps) {
    const matchingUser = users.find(u => u.email?.toLowerCase() === emp.work_email?.toLowerCase());
    const matchingProfile = profiles.find(p => p.email?.toLowerCase() === emp.work_email?.toLowerCase() || p.employee_id === emp.id);

    const issues = [];
    if (!matchingProfile) issues.push('MISSING user_profile');
    if (!matchingUser) issues.push('MISSING auth.users');

    if (matchingUser) {
      if (matchingUser.user_metadata?.mobile && matchingUser.user_metadata.mobile !== emp.phone) {
        issues.push(`Auth mobile mismatch: meta=${matchingUser.user_metadata.mobile} vs emp=${emp.phone}`);
      }
    }
    if (matchingProfile) {
      if (matchingProfile.phone && emp.phone && matchingProfile.phone.replace(/\D/g, '').slice(-10) !== emp.phone.replace(/\D/g, '').slice(-10)) {
        issues.push(`Profile phone mismatch: prof=${matchingProfile.phone} vs emp=${emp.phone}`);
      }
      if (matchingProfile.employee_id !== emp.id) {
        issues.push(`Profile employee_id mismatch: prof=${matchingProfile.employee_id} vs emp=${emp.id}`);
      }
    }

    console.log(`[${emp.employee_code}] ${emp.display_name || emp.first_name + ' ' + (emp.last_name||'')} | email: ${emp.work_email} | phone: ${emp.phone} | status: ${emp.employment_status || emp.status} ${issues.length ? '⚠️ ' + issues.join('; ') : '✅'}`);
  }
}

inspectAll();
