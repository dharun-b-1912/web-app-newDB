const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['\"]|['\"]$/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function heal() {
  console.log('--- RECONCILING AND HEALING WORKFORCE IDENTITIES ---');
  
  // 1. Fetch all employees
  const { data: emps, error: empErr } = await supabase.from('employees').select('*').order('employee_code');
  if (empErr) {
    console.error('Error fetching employees:', empErr);
    return;
  }

  // 2. Fetch all auth users
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) {
    console.error('Error fetching auth users:', authErr);
    return;
  }

  // 3. Fetch all user profiles
  const { data: profiles, error: profErr } = await supabase.from('user_profiles').select('*');
  if (profErr) {
    console.error('Error fetching user profiles:', profErr);
    return;
  }

  console.log(`Auditing ${emps.length} employees against ${users.length} auth accounts and ${profiles.length} user profiles...`);

  for (const emp of emps) {
    const cleanEmail = (emp.work_email || emp.personal_email || '').toLowerCase().trim();
    if (!cleanEmail) continue;

    const authUser = users.find(u => u.email?.toLowerCase().trim() === cleanEmail);
    const profile = profiles.find(p => p.email?.toLowerCase().trim() === cleanEmail || p.employee_id === emp.id);

    // Heal user_profiles mapping
    if (profile) {
      const profUpdate = {};
      if (profile.employee_id !== emp.id) profUpdate.employee_id = emp.id;
      if (emp.phone && (!profile.phone || profile.phone.replace(/\D/g, '').slice(-10) !== emp.phone.replace(/\D/g, '').slice(-10))) {
        profUpdate.phone = emp.phone;
      }
      if (emp.display_name && profile.full_name !== emp.display_name) {
        profUpdate.full_name = emp.display_name;
      }
      if (authUser && profile.auth_user_id !== authUser.id) {
        profUpdate.auth_user_id = authUser.id;
      }

      if (Object.keys(profUpdate).length > 0) {
        profUpdate.updated_at = new Date().toISOString();
        const { error: upErr } = await supabase.from('user_profiles').update(profUpdate).eq('id', profile.id);
        if (upErr) console.warn(`[Profile Heal Warning] ${emp.employee_code}:`, upErr);
        else console.log(`[Profile Healed] ${emp.employee_code} (${emp.display_name}):`, profUpdate);
      }
    } else if (authUser) {
      // Create missing user_profile
      const newProf = {
        auth_user_id: authUser.id,
        organization_id: emp.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
        employee_id: emp.id,
        email: cleanEmail,
        full_name: emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        phone: emp.phone || null,
        status: (emp.employment_status === 'ACTIVE' || emp.employment_status === 'PROBATION') ? 'ACTIVE' : 'INACTIVE',
        role: 'EMPLOYEE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const { error: insErr } = await supabase.from('user_profiles').insert(newProf);
      if (insErr) console.warn(`[Profile Insert Warning] ${emp.employee_code}:`, insErr);
      else console.log(`[Profile Created] ${emp.employee_code} (${emp.display_name})`);
    }

    // Heal auth.users metadata
    if (authUser) {
      const meta = authUser.user_metadata || {};
      const newMeta = { ...meta };
      let metaChanged = false;

      if (emp.display_name && newMeta.full_name !== emp.display_name) {
        newMeta.full_name = emp.display_name;
        metaChanged = true;
      }
      if (emp.employee_code && newMeta.employee_code !== emp.employee_code) {
        newMeta.employee_code = emp.employee_code;
        metaChanged = true;
      }
      if (emp.phone && (newMeta.phone !== emp.phone || newMeta.mobile !== emp.phone)) {
        newMeta.phone = emp.phone;
        newMeta.mobile = emp.phone;
        metaChanged = true;
      }

      if (metaChanged) {
        const { error: uErr } = await supabase.auth.admin.updateUserById(authUser.id, {
          user_metadata: newMeta
        });
        if (uErr) console.warn(`[Auth Meta Warning] ${emp.employee_code}:`, uErr);
        else console.log(`[Auth Meta Healed] ${emp.employee_code} (${cleanEmail}) -> phone: ${emp.phone}`);
      }
    }
  }

  console.log('--- RECONCILIATION COMPLETED ---');
}

heal();

