import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';
const HOST = 'aws-0-ap-southeast-2.pooler.supabase.com';

async function main() {
  console.log(`Connecting to Supabase PostgreSQL at ${HOST}:6543...`);
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
    console.log('Connected successfully!');

    // Check columns of public.vendors
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vendors'
      ORDER BY ordinal_position;
    `);
    console.log('\n--- COLUMNS IN public.vendors ---');
    console.table(colRes.rows);

    // Check RLS policies on public.vendors
    const rlsRes = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'vendors';
    `);
    console.log('\n--- RLS POLICIES ON public.vendors ---');
    console.table(rlsRes.rows);

  } catch (err) {
    console.error('Postgres Error:', err);
  } finally {
    await client.end();
  }
}

main();
