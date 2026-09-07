import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';

const hosts = [
  { host: `db.${PROJECT_ID}.supabase.co`, port: 5432, user: 'postgres' },
  { host: `aws-0-ap-south-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-ap-south-1.pooler.supabase.com`, port: 5432, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 5432, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-eu-central-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-us-east-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-us-west-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` }
];

async function tryConnect() {
  console.log(`Connecting to Supabase project ${PROJECT_ID}...`);

  for (const item of hosts) {
    console.log(`Attempting ${item.host}:${item.port} as ${item.user}...`);
    const client = new Client({
      host: item.host,
      port: item.port,
      database: 'postgres',
      user: item.user,
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 2500
    });

    try {
      await client.connect();
      console.log(`\n🎉 Connected to ${item.host}:${item.port}!`);
      return client;
    } catch (err) {
      console.log(`  -> Failed: ${err.message}`);
      try { await client.end(); } catch (e) {}
    }
  }
  throw new Error('Could not connect to project pooler.');
}

async function main() {
  const client = await tryConnect();
  try {
    const sqlPath = path.resolve(__dirname, '../supabase/migrations/20260907_300_phase_storage_architecture_canonicalization.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('\nApplying migration 20260907_300_phase_storage_architecture_canonicalization.sql...');
    await client.query(sqlContent);
    console.log('✅ Migration applied successfully!');

    // Query storage.buckets
    const bucketRes = await client.query(`
      SELECT id, name, public, file_size_limit, allowed_mime_types
      FROM storage.buckets;
    `);
    console.log('\nActive storage.buckets:');
    console.table(bucketRes.rows);

    // Query storage.objects policies
    const polRes = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE tablename = 'objects' AND schemaname = 'storage';
    `);
    console.log('\nActive policies on storage.objects:');
    console.table(polRes.rows.map(r => ({
      policyname: r.policyname,
      cmd: r.cmd,
      qual: (r.qual || '').substring(0, 45) + '...',
      with_check: (r.with_check || '').substring(0, 45) + '...'
    })));

    // Query document_types count
    const dtRes = await client.query(`
      SELECT count(*) as count, organization_id
      FROM public.document_types
      GROUP BY organization_id;
    `);
    console.log('\nDocument types summary:');
    console.table(dtRes.rows);

  } catch (err) {
    console.error('Migration execution failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
