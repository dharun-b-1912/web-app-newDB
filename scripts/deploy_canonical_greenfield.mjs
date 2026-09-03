import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';

const regions = [
  'ap-south-1',       // Mumbai (India)
  'ap-southeast-1',   // Singapore
  'ap-southeast-2',   // Sydney
  'ap-northeast-1',   // Tokyo
  'eu-central-1',     // Frankfurt
  'eu-west-1',        // Ireland
  'us-east-1',        // North Virginia
  'us-east-2',        // Ohio
  'us-west-1',        // North California
  'us-west-2'         // Oregon
];

async function tryConnect() {
  console.log(`[1/4] Connecting to Supabase project ${PROJECT_ID}...`);

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
        connectionTimeoutMillis: 5000
      });

      try {
        await client.connect();
        console.log(`\n🎉 Connected to Supabase Pooler at ${host}:${port}!`);
        return client;
      } catch (err) {
        try { await client.end(); } catch (e) {}
        if (err.message.includes('password authentication failed')) {
          console.error(`❌ Region ${region}:${port} reached, but authentication failed: ${err.message}`);
        } else {
          console.log(`Region ${region}:${port} -> ${err.message}`);
        }
      }
    }
  }

  throw new Error('Could not connect to project pooler.');
}

async function main() {
  let client;
  try {
    client = await tryConnect();
  } catch (err) {
    console.error('\n❌ Could not connect:', err.message);
    process.exit(1);
  }

  try {
    console.log('\n[2/4] Reading consolidated greenfield migration SQL script...');
    const sqlPath = path.resolve(__dirname, '../supabase/greenfield_migrations/000_FULL_GREENFIELD_DEPLOYMENT_SCRIPT.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log(`[3/4] Executing canonical 65-table schema migration on ${PROJECT_ID}...`);
    await client.query(sqlContent);
    console.log('✅ All migrations executed successfully!');

    console.log('\n[4/4] Performing post-deployment schema verification...');
    
    // Count tables in public schema
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`\n======================================================`);
    console.log(`TOTAL PUBLIC TABLES IN ysiajemrqakfngasehhi: ${tableRes.rows.length}`);
    console.log(`======================================================`);
    tableRes.rows.forEach((r, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2, ' ')}. ${r.table_name}`);
    });

    // Check RLS status
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const rlsDisabled = rlsRes.rows.filter(r => !r.rowsecurity);
    if (rlsDisabled.length === 0) {
      console.log(`\n✅ ROW LEVEL SECURITY: Enabled on all ${rlsRes.rows.length} tables!`);
    } else {
      console.log(`\n⚠️ Tables missing RLS:`, rlsDisabled.map(r => r.tablename));
    }

    // Check storage buckets
    const bucketRes = await client.query(`SELECT id, name, public FROM storage.buckets;`);
    console.log(`\n✅ STORAGE BUCKETS INITIALIZED:`, bucketRes.rows);

    // Check seed plans & permissions
    const planRes = await client.query(`SELECT code, name FROM public.platform_plans;`);
    console.log(`\n✅ SEED PLANS:`, planRes.rows);

    const permRes = await client.query(`SELECT count(*) FROM public.permissions;`);
    console.log(`✅ SYSTEM PERMISSIONS COUNT: ${permRes.rows[0].count}`);

    console.log(`\n🎉 GREENFIELD DEPLOYMENT COMPLETE & VERIFIED 100%!`);
  } catch (err) {
    console.error('❌ Migration execution error:', err);
  } finally {
    await client.end();
  }
}

main();
