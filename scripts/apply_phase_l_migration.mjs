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
        try { await client.end(); } catch (e) {}
      }
    }
  }
  throw new Error('Could not connect to project pooler.');
}

async function main() {
  const client = await tryConnect();
  try {
    const sqlPath = path.resolve(__dirname, '../supabase/migrations/20260904_206_phase_l_product_certification_remediation.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying migration 20260904_206_phase_l_product_certification_remediation.sql...');
    await client.query(sqlContent);
    console.log('✅ Migration applied successfully!');

    // Query active policies on attendance_punches
    const punchRes = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'attendance_punches'
    `);
    console.log('\nActive policies on attendance_punches:');
    console.table(punchRes.rows);

    // Verify HR Head employee row
    const hrEmpRes = await client.query(`
      SELECT id, employee_code, first_name, last_name, work_email
      FROM public.employees
      WHERE work_email = 'e2e.hrhead.1788509683332@joypeoplehr.com'
    `);
    console.log('\nHR Head employee row:');
    console.table(hrEmpRes.rows);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
