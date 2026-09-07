const pg = require('pg');
const { Client } = pg;

async function getClient() {
  const host = 'aws-0-ap-south-1.pooler.supabase.com';
  const client = new Client({
    host,
    port: 6543,
    database: 'postgres',
    user: 'postgres.ysiajemrqakfngasehhi',
    password: 'Dh@run@1912',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });
  await client.connect();
  return client;
}

async function runInventory() {
  console.log('Connecting to Canonical Supabase (ysiajemrqakfngasehhi)...');
  const client = await getClient();
  console.log('Connected successfully.\n');

  // 1. Auth Users
  console.log('=== 1. AUTH USERS (auth.users) ===');
  const authUsers = await client.query(`
    SELECT id, email, role, created_at, last_sign_in_at, raw_user_meta_data 
    FROM auth.users 
    ORDER BY created_at ASC;
  `);
  console.log(`Total Auth Users: ${authUsers.rows.length}`);
  authUsers.rows.forEach((u, i) => {
    console.log(`  [${i+1}] ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at}`);
  });

  // 2. Platform Admin Identity Chain
  console.log('\n=== 2. PLATFORM ADMIN IDENTITY CHAIN ===');
  const superadminUid = '99722e27-88be-4b14-9575-8b21cc9e3f06';
  
  const userProfile = await client.query(`
    SELECT * FROM public.user_profiles WHERE auth_user_id = $1 OR id = $1;
  `, [superadminUid]);
  console.log('User Profile:', userProfile.rows);

  const userRoles = await client.query(`
    SELECT ur.*, r.name as role_name, r.is_system_role 
    FROM public.user_roles ur
    LEFT JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1 OR ur.user_id IN (SELECT id FROM public.user_profiles WHERE auth_user_id = $1);
  `, [superadminUid]);
  console.log('User Roles:', userRoles.rows);

  // 3. Storage Buckets and Objects
  console.log('\n=== 3. STORAGE BUCKETS & OBJECTS ===');
  const buckets = await client.query(`SELECT id, name, public, created_at FROM storage.buckets;`);
  console.log('Buckets:', buckets.rows);

  const objects = await client.query(`
    SELECT id, bucket_id, name, owner, created_at, metadata 
    FROM storage.objects;
  `);
  console.log(`Total Storage Objects: ${objects.rows.length}`);
  objects.rows.forEach((obj, i) => {
    console.log(`  [${i+1}] Bucket: ${obj.bucket_id} | Path: ${obj.name} | Owner: ${obj.owner}`);
  });

  // 4. All 64 Canonical Public Tables Count & Structure
  console.log('\n=== 4. CANONICAL PUBLIC TABLES INVENTORY ===');
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log(`Found ${tables.length} public tables.`);

  const tableStats = [];
  for (const t of tables) {
    const countRes = await client.query(`SELECT count(*)::int as count FROM public."${t}";`);
    const rlsRes = await client.query(`
      SELECT relrowsecurity, relforcerowsecurity 
      FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE n.nspname = 'public' AND c.relname = $1;
    `, [t]);
    tableStats.push({
      table: t,
      count: countRes.rows[0].count,
      rls: rlsRes.rows[0]?.relrowsecurity ? 'ENABLED' : 'DISABLED'
    });
  }

  console.log('\nTable Inventory Table:');
  console.log('--------------------------------------------------------------------------------');
  console.log('| #  | Table Name                                   | Count | RLS Status |');
  console.log('--------------------------------------------------------------------------------');
  tableStats.forEach((st, idx) => {
    console.log(`| ${(idx+1).toString().padEnd(2)} | ${st.table.padEnd(44)} | ${st.count.toString().padEnd(5)} | ${st.rls.padEnd(10)} |`);
  });
  console.log('--------------------------------------------------------------------------------');

  // 5. Foreign Key Dependencies between tables
  console.log('\n=== 5. FOREIGN KEY CONSTRAINTS ===');
  const fks = await client.query(`
    SELECT
      tc.table_name as child_table,
      kcu.column_name as child_column,
      ccu.table_name AS parent_table,
      ccu.column_name AS parent_column,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY ccu.table_name, tc.table_name;
  `);
  console.log(`Total Foreign Keys: ${fks.rows.length}`);

  // 6. Security Definer Functions
  console.log('\n=== 6. SECURITY DEFINER FUNCTIONS ===');
  const funcs = await client.query(`
    SELECT p.proname, p.prosecdef, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
    ORDER BY p.proname;
  `);
  funcs.rows.forEach(f => {
    console.log(`  Function: ${f.proname}(${f.args}) [SECURITY DEFINER: ${f.prosecdef}]`);
  });

  await client.end();
}

runInventory().catch(err => {
  console.error('Inventory Error:', err);
  process.exit(1);
});
