// scratch/audit_live_identity_matrix.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, KEY);

async function auditLive() {
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  console.log('========================================================================');
  console.log('LIVE DATABASE IDENTITY & AUTHORIZATION AUDIT MATRIX');
  console.log('========================================================================\n');

  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log('1. ORGANIZATIONS (' + (orgs?.length || 0) + '):');
  console.table(orgs?.map(o => ({ id: o.id, name: o.legal_name, slug: o.slug, status: o.status })));

  const { data: comps } = await supabase.from('companies').select('*');
  console.log('\n2. COMPANIES (' + (comps?.length || 0) + '):');
  console.table(comps?.map(c => ({ id: c.id, org_id: c.organization_id, name: c.legal_name, code: c.company_code })));

  const { data: roles } = await supabase.from('roles').select('*');
  console.log('\n3. ROLES (' + (roles?.length || 0) + '):');
  console.table(roles?.map(r => ({ id: r.id, org_id: r.organization_id, name: r.name, code: r.code })));

  const { data: profs } = await supabase.from('user_profiles').select('*, user_roles(*, roles(*))');
  console.log('\n4. USER PROFILES (' + (profs?.length || 0) + '):');
  console.log(JSON.stringify(profs, null, 2));

  const { data: emps } = await supabase.from('employees').select('*');
  console.log('\n5. EMPLOYEES (' + (emps?.length || 0) + '):');
  console.table(emps?.map(e => ({ id: e.id, email: e.email, org_id: e.organization_id, first_name: e.first_name, role: e.job_title })));
}

auditLive().catch(console.error);
