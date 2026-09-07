import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'eu-central-1',
  'eu-west-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2'
];

export async function getDbClient() {
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const host = `aws-0-${region}.pooler.supabase.com`;
      const client = new Client({
        host,
        port,
        database: 'postgres',
        user: `postgres.${PROJECT_ID}`,
        password: DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000
      });
      try {
        await client.connect();
        return client;
      } catch (err) {
        try { await client.end(); } catch (e) {}
      }
    }
  }
  throw new Error('Could not connect to project pooler.');
}

async function run() {
  const client = await getDbClient();
  try {
    console.log('--- 1. TABLE AUDIT ---');
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`Found ${tableRes.rows.length} public tables.`);
    console.log(tableRes.rows.map(r => r.table_name).join(', '));

    console.log('\n--- 2. RLS STATUS ---');
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' AND rowsecurity = false;
    `);
    if (rlsRes.rows.length === 0) {
      console.log('✅ ALL public tables have RLS enabled (rowsecurity = true)');
    } else {
      console.log('❌ Tables with RLS DISABLED:', rlsRes.rows.map(r => r.tablename));
    }

    console.log('\n--- 3. SECURITY DEFINER FUNCTIONS ---');
    const funcRes = await client.query(`
      SELECT 
        p.proname,
        n.nspname as schema_name,
        pg_get_userbyid(p.proowner) as owner,
        p.prosecdef as is_security_definer,
        p.provolatile as volatility,
        p.proconfig as config_search_path,
        p.proacl as acl
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.prosecdef = true
      ORDER BY p.proname;
    `);
    console.log(`Found ${funcRes.rows.length} SECURITY DEFINER functions in public:`);
    for (const row of funcRes.rows) {
      console.log(`- ${row.proname}: owner=${row.owner}, config=${JSON.stringify(row.config_search_path)}, acl=${row.acl}`);
    }

    console.log('\n--- 4. STORAGE BUCKETS ---');
    const bucketRes = await client.query(`
      SELECT id, name, public, created_at, updated_at
      FROM storage.buckets;
    `);
    console.log(`Found ${bucketRes.rows.length} storage buckets:`);
    console.table(bucketRes.rows);

    console.log('\n--- 5. STORAGE POLICIES ---');
    const storagePolRes = await client.query(`
      SELECT policyname, tablename, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'storage'
      ORDER BY tablename, policyname;
    `);
    console.log(`Found ${storagePolRes.rows.length} storage policies:`);
    console.table(storagePolRes.rows);

  } finally {
    await client.end();
  }
}

if (process.argv[1].endsWith('inspect_canonical_m1.mjs')) {
  run().catch(console.error);
}
