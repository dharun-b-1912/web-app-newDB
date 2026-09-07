// scratch/verify_phase_hr_id_01.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL, ANON_KEY);

async function testSuite() {
  console.log('========================================================');
  console.log('PHASE HR-ID-01: CANONICAL ROLE & RUNTIME CERTIFICATION');
  console.log('========================================================\n');

  // 1. HR Head Login & Role Verification
  console.log('[TEST 1] HR Head Live Authentication & DB Role Check');
  const { data: hrAuth, error: hrErr } = await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  if (hrErr) {
    console.error('❌ HR Head login failed:', hrErr.message);
  } else {
    console.log('✅ HR Head Logged in. Auth UID:', hrAuth.user.id);
    
    // Query user_profiles and roles for HR Head
    const { data: profile, error: profErr } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*, roles(*))')
      .eq('auth_user_id', hrAuth.user.id)
      .single();

    if (profErr) {
      console.error('❌ Failed to fetch HR profile:', profErr.message);
    } else {
      console.log('✅ User Profile Found:', profile.email, 'Org ID:', profile.organization_id);
      const roleCodes = profile.user_roles.map((ur) => ur.roles?.code);
      console.log('✅ Canonical Role Codes in DB:', roleCodes);
      const hasHrHead = roleCodes.includes('HR_HEAD');
      console.log(hasHrHead ? '✅ DB Role is strictly HR_HEAD' : '❌ DB Role is NOT HR_HEAD');
    }
  }

  // 2. Company Admin DB Role Check
  console.log('\n[TEST 2] Company Admin Live Authentication & DB Role Check');
  const { data: caAuth, error: caErr } = await supabase.auth.signInWithPassword({
    email: 'rameshrajajcs@gmail.com',
    password: 'joypeoplehr',
  });

  if (caErr) {
    console.error('❌ Company Admin login failed:', caErr.message);
  } else {
    console.log('✅ Company Admin Logged in. Auth UID:', caAuth.user.id);
    const { data: caProf } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*, roles(*))')
      .eq('auth_user_id', caAuth.user.id)
      .single();
    const caRoles = caProf?.user_roles?.map((ur) => ur.roles?.code);
    console.log('✅ Company Admin Canonical Role Codes in DB:', caRoles);
  }

  // 3. Platform Super Admin Check
  console.log('\n[TEST 3] Platform Super Admin Live Authentication Check');
  const { data: saAuth, error: saErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });
  if (saErr) {
    console.error('❌ Super Admin login failed:', saErr.message);
  } else {
    console.log('✅ Super Admin Logged in. Auth UID:', saAuth.user.id);
  }

  // 4. Shifts & Employee Shift Assignments Query Check
  console.log('\n[TEST 4] Attendance Shifts & Assignments Schema Verification');
  const { data: shifts, error: shiftsErr } = await supabase.from('shifts').select('*').limit(5);
  console.log('Shifts query result:', shiftsErr ? `❌ ${shiftsErr.message}` : `✅ Found ${shifts?.length} shifts`);

  const { data: assignments, error: assignErr } = await supabase.from('employee_shift_assignments').select('*').limit(5);
  console.log('Shift assignments query result:', assignErr ? `❌ ${assignErr.message}` : `✅ Found ${assignments?.length} assignments`);

  console.log('\n========================================================');
  console.log('ALL LIVE SUPABASE DATABASE CHECKS COMPLETE');
  console.log('========================================================');
}

testSuite();
