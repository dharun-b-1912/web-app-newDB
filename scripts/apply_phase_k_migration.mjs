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

async function tryConnect() {
  console.log(`Connecting to Supabase project ${PROJECT_ID}...`);

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
        console.log(`Connected to Pooler at ${host}:${port}!`);
        return client;
      } catch (err) {
        console.log(`  ${host}:${port} -> ${err.message}`);
        try { await client.end(); } catch (e) {}
      }
    }
  }
  throw new Error('Could not connect to project pooler.');
}

async function main() {
  const client = await tryConnect();
  try {
    const sqlPath = path.resolve(__dirname, '../supabase/migrations/20260904_205_phase_k_security_remediation.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying migration 20260904_205_phase_k_security_remediation.sql...');
    await client.query(sqlContent);
    console.log('✅ Migration applied successfully!');

    // Query active policies on organizations
    const orgRes = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'organizations' AND schemaname = 'public';
    `);
    console.log('\nActive policies on public.organizations:');
    console.table(orgRes.rows.map(r => ({
      policyname: r.policyname,
      cmd: r.cmd,
      qual: (r.qual || '').substring(0, 50) + '...',
      with_check: (r.with_check || '').substring(0, 50) + '...'
    })));

    // Query active policies on approval_instances
    const aiRes = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'approval_instances' AND schemaname = 'public';
    `);
    console.log('\nActive policies on public.approval_instances:');
    console.table(aiRes.rows.map(r => ({
      policyname: r.policyname,
      cmd: r.cmd,
      qual: (r.qual || '').substring(0, 50) + '...',
      with_check: (r.with_check || '').substring(0, 50) + '...'
    })));

    // Query employee_shift_assignments columns
    const colsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employee_shift_assignments' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('\nColumns on public.employee_shift_assignments:');
    console.table(colsRes.rows);

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
