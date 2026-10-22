import pg from 'pg';

const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';
const HOST = 'aws-0-ap-southeast-2.pooler.supabase.com';

async function main() {
  const client = new Client({
    host: HOST,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_ID}`,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  await client.connect();
  console.log('Connected to PostgreSQL!');

  const polRes = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename IN ('designations', 'departments', 'employees', 'attendance_daily', 'attendance_punches', 'employee_bank_details', 'employee_statutory_details')
    ORDER BY tablename, policyname;
  `);
  console.table(polRes.rows);

  await client.end();
}

main().catch(console.error);
