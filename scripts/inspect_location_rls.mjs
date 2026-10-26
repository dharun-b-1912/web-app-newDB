import pg from 'pg';

const { Client } = pg;
const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';
const HOST = 'aws-0-ap-southeast-2.pooler.supabase.com';

async function main() {
  console.log(`Connecting to Supabase at ${HOST}:6543...`);
  const client = new Client({
    host: HOST,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_ID}`,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL.');

    // 1. Inspect policies on employee_live_locations and employee_location_trails
    const policiesRes = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename IN ('employee_live_locations', 'employee_location_trails');
    `);
    console.log('\n--- Existing Policies ---');
    console.table(policiesRes.rows.map(r => ({
      table: r.tablename,
      policy: r.policyname,
      cmd: r.cmd,
      roles: r.roles,
      qual: r.qual?.substring(0, 50),
      with_check: r.with_check?.substring(0, 50)
    })));

    for (const r of policiesRes.rows) {
      console.log(`\nTable: ${r.tablename} | Policy: ${r.policyname} | CMD: ${r.cmd} | Roles: ${r.roles}`);
      console.log(`QUAL: ${r.qual}`);
      console.log(`WITH CHECK: ${r.with_check}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

main();
