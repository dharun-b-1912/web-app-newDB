// scratch/reconcile_ramesh_company_admin.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function reconcileRamesh() {
  console.log('--- RECONCILING rameshrajajcs@gmail.com ---');
  
  // 1. Log in as Super Admin
  const { data: superData, error: superErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  if (superErr || !superData.session) {
    console.error('Superadmin login failed:', superErr);
    process.exit(1);
  }

  const superToken = superData.session.access_token;
  console.log('Superadmin authenticated. UID:', superData.user.id);

  // 2. Find Organization for Joy Corporate Solutions
  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('Organizations:', orgs);
  const targetOrg = orgs?.[0];
  if (!targetOrg) {
    console.error('No organization found!');
    process.exit(1);
  }

  // 3. Ensure canonical roles exist
  const roles = [
    { code: 'COMPANY_ADMIN', name: 'Company Administrator', description: 'Full administrative access' },
    { code: 'HR_HEAD', name: 'HR Head', description: 'Full HR administration and employee management access' },
    { code: 'EMPLOYEE', name: 'Employee', description: 'Standard employee access' },
  ];

  for (const r of roles) {
    const { data: exRole } = await supabase
      .from('roles')
      .select('id')
      .eq('organization_id', targetOrg.id)
      .eq('code', r.code)
      .maybeSingle();

    if (!exRole) {
      console.log(`Creating role ${r.code} for org ${targetOrg.id}...`);
      await supabase.from('roles').insert([{
        organization_id: targetOrg.id,
        code: r.code,
        name: r.name,
        description: r.description,
      }]);
    }
  }

  // 4. Provision / Reconcile rameshrajajcs@gmail.com with joypeoplehr
  const email = 'rameshrajajcs@gmail.com';
  console.log(`Invoking employee-auth-provisioner for ${email}...`);

  const { data: provData, error: provErr } = await supabase.functions.invoke('employee-auth-provisioner', {
    headers: {
      Authorization: `Bearer ${superToken}`,
    },
    body: {
      organization_id: targetOrg.id,
      email: email,
      password: 'joypeoplehr',
      full_name: 'Ramesh Raja',
      role_code: 'COMPANY_ADMIN',
    },
  });

  console.log('Provision result:', provData, provErr);

  // 5. Test sign in as rameshrajajcs@gmail.com with joypeoplehr
  await supabase.auth.signOut();
  
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'joypeoplehr',
  });

  if (loginErr || !loginData.session) {
    console.error('Login test for rameshrajajcs@gmail.com FAILED:', loginErr);
  } else {
    console.log('Login test for rameshrajajcs@gmail.com SUCCESS! UID:', loginData.user.id);
    console.log('Email:', loginData.user.email);
    console.log('Session Access Token exists:', Boolean(loginData.session.access_token));
  }
}

reconcileRamesh().catch(console.error);
