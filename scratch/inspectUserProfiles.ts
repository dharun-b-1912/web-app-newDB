import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseAnonKey = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log('--- Testing user_profiles simple select ---');
  const res1 = await supabase.from('user_profiles').select('*').limit(1);
  console.log('Simple select *:', res1.data, 'Error:', res1.error);

  console.log('--- Testing individual columns on user_profiles ---');
  const cols = [
    'id', 'auth_user_id', 'organization_id', 'company_id', 'employee_id',
    'vendor_id', 'email', 'full_name', 'phone', 'avatar_url', 'status',
    'role', 'is_active', 'created_at', 'updated_at'
  ];
  for (const c of cols) {
    const r = await supabase.from('user_profiles').select(c).limit(1);
    if (!r.error) {
      console.log(`  ✓ Column exists in 'user_profiles': ${c}`);
    } else {
      console.log(`  ✗ Column DOES NOT exist in 'user_profiles': ${c} (${r.error.message})`);
    }
  }

  console.log('\n--- Testing user_roles and roles join ---');
  const res2 = await supabase.from('user_roles').select('*').limit(1);
  console.log('user_roles select *:', res2.data, 'Error:', res2.error);

  const res3 = await supabase.from('roles').select('*').limit(1);
  console.log('roles select *:', res3.data, 'Error:', res3.error);

  const resJoin = await supabase.from('user_profiles').select('id, user_roles(id, role_id, roles(id, code, name))').limit(1);
  console.log('Join select result:', resJoin.data, 'Error:', resJoin.error);
}

inspect().catch(console.error);
