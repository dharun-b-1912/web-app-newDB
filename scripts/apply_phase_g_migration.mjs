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
  'us-east-1'
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
        connectionTimeoutMillis: 5000
      });

      try {
        await client.connect();
        console.log(`Connected to Pooler at ${host}:${port}!`);
        return client;
      } catch (err) {
        try { await client.end(); } catch (e) {}
      }
    }
  }
  throw new Error('Could not connect to project pooler.');
}

async function main() {
  const client = await tryConnect();
  try {
    const sqlPath = path.resolve(__dirname, '../supabase/migrations/20260904_100_employee_row_level_authorization.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying migration 20260904_100_employee_row_level_authorization.sql...');
    await client.query(sqlContent);
    console.log('✅ Migration applied successfully!');

    // Query active policies on public.employees
    const res = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'employees' AND schemaname = 'public';
    `);

    console.log('\nActive policies on public.employees:');
    console.table(res.rows.map(r => ({
      policyname: r.policyname,
      cmd: r.cmd,
      qual: (r.qual || '').substring(0, 50) + '...',
      with_check: (r.with_check || '').substring(0, 50) + '...'
    })));

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
