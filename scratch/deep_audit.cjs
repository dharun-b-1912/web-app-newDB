const { createClient } = require('@supabase/supabase-js');
const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function auditDetails() {
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData } = await client.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  });
  console.log('Logged in as Platform Admin:', authData.user.id);

  // 1. Inspect all user_profiles
  const { data: profs } = await client.from('user_profiles').select('*');
  console.log('\n=== ALL USER PROFILES ===');
  console.log(JSON.stringify(profs, null, 2));

  // 2. Inspect all user_roles
  const { data: uroles } = await client.from('user_roles').select('*, roles(*)');
  console.log('\n=== ALL USER ROLES ===');
  console.log(JSON.stringify(uroles, null, 2));

  // 3. Inspect all employees
  const { data: emps } = await client.from('employees').select('*');
  console.log('\n=== ALL EMPLOYEES ===');
  console.log(JSON.stringify(emps, null, 2));

  // 4. Inspect storage objects
  const { data: files } = await client.storage.from('employee_documents').list('', { limit: 100 });
  console.log('\n=== STORAGE OBJECTS IN employee_documents ===');
  console.log(files);

  // List recursive folders if any
  if (files) {
    for (const f of files) {
      if (f.id === null) { // Folder
        const { data: subFiles } = await client.storage.from('employee_documents').list(f.name, { limit: 100 });
        console.log(`Folder [${f.name}]:`, subFiles);
        if (subFiles) {
          for (const sf of subFiles) {
            if (sf.id === null) {
              const { data: subSub } = await client.storage.from('employee_documents').list(`${f.name}/${sf.name}`, { limit: 100 });
              console.log(`  SubFolder [${f.name}/${sf.name}]:`, subSub);
            }
          }
        }
      }
    }
  }

  // 5. Inspect roles and permissions
  const { data: roles } = await client.from('roles').select('*');
  console.log('\n=== ROLES ===');
  console.log(roles);

  const { data: plans } = await client.from('platform_plans').select('*');
  console.log('\n=== PLATFORM PLANS ===');
  console.log(plans);
}

auditDetails().catch(console.error);
