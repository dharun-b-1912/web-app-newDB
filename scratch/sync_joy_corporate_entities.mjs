// scratch/sync_joy_corporate_entities.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function syncEntities() {
  console.log('--- SYNCING JOY CORPORATE ENTITIES & LOCATIONS ---');

  // Sign in as Super Admin
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  const jcsOrgId = '0c621892-e938-4707-9957-13534ea32c19';
  const jcsCompId = '2030277f-a6a1-427f-beaf-4fc677a3bae2';

  // 1. Ensure canonical roles for jcsOrgId
  const roles = [
    { code: 'COMPANY_ADMIN', name: 'Company Administrator', description: 'Full administrative access' },
    { code: 'HR_HEAD', name: 'HR Head', description: 'Full HR administration and employee management access' },
    { code: 'EMPLOYEE', name: 'Employee', description: 'Standard employee access' },
  ];

  for (const r of roles) {
    const { data: exRole } = await supabase
      .from('roles')
      .select('id')
      .eq('organization_id', jcsOrgId)
      .eq('code', r.code)
      .maybeSingle();

    if (!exRole) {
      console.log(`Creating role ${r.code} for org ${jcsOrgId}...`);
      await supabase.from('roles').insert([{
        organization_id: jcsOrgId,
        code: r.code,
        name: r.name,
        description: r.description,
      }]);
    }
  }

  // 2. Align user_profiles and user_roles for rameshrajajcs and marimuthu to jcsOrgId
  const emails = ['rameshrajajcs@gmail.com', 'marimuthu@joycorporatesolutions.com'];

  for (const email of emails) {
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('id, auth_user_id')
      .eq('email', email)
      .maybeSingle();

    if (prof) {
      console.log(`Updating organization_id for ${email} to ${jcsOrgId}...`);
      await supabase
        .from('user_profiles')
        .update({ organization_id: jcsOrgId })
        .eq('id', prof.id);

      // Link role in user_roles
      const roleCode = email.includes('admin') ? 'COMPANY_ADMIN' : 'HR_HEAD';
      const { data: targetRole } = await supabase
        .from('roles')
        .select('id')
        .eq('organization_id', jcsOrgId)
        .eq('code', roleCode)
        .single();

      if (targetRole) {
        await supabase
          .from('user_roles')
          .upsert({
            organization_id: jcsOrgId,
            user_profile_id: prof.id,
            role_id: targetRole.id,
          }, { onConflict: 'user_profile_id,role_id' });
      }
    }
  }

  // 3. Align branches to jcsOrgId and jcsCompId
  const { data: branches } = await supabase.from('branches').select('*');
  console.log('Branches:', branches);

  for (const b of branches || []) {
    if (b.organization_id !== jcsOrgId || b.company_id !== jcsCompId) {
      console.log(`Updating branch ${b.name} to org ${jcsOrgId} and company ${jcsCompId}...`);
      await supabase
        .from('branches')
        .update({
          organization_id: jcsOrgId,
          company_id: jcsCompId,
        })
        .eq('id', b.id);
    }
  }

  console.log('--- SYNC COMPLETED! ---');
}

syncEntities().catch(console.error);
