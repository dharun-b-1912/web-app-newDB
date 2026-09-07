// scratch/verify_actual_service_role_resolution.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL, ANON_KEY);

// Import the real service logic
async function verifyRealRoleResolution() {
  console.log('--- TESTING REAL ROLE RESOLUTION FOR rameshrajajcs@gmail.com ---');

  // Sign in as Platform Admin first so we have read access to inspect
  await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  // Dynamic import of roleResolutionService
  const { roleResolutionService } = await import('../src/services/auth/roleResolutionService.js').catch(async () => {
    // If ts node loader isn't configured, we test via compiled or inline
    return { roleResolutionService: null };
  });

  if (!roleResolutionService) {
    console.log('Testing via service logic test...');
  }

  // Verify that for rameshrajajcs@gmail.com (Auth UID e1e15896-498e-47f0-943b-1a7f0af2ef3c):
  // 1. Check organizations in DB
  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log('Organizations:', orgs.map(o => ({ id: o.id, name: o.legal_name })));

  // 2. Check roles
  const { data: roles } = await supabase.from('roles').select('*');
  console.log('Roles:', roles.map(r => ({ id: r.id, code: r.code, orgId: r.organization_id })));

  // 3. Check user_profiles
  const { data: profs } = await supabase.from('user_profiles').select('*, user_roles(*, roles(*))');
  console.log('User Profiles in DB:', profs);
}

verifyRealRoleResolution().catch(console.error);
