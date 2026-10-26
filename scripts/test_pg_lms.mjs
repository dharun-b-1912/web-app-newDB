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
    connectionTimeoutMillis: 7000
  });

  try {
    await client.connect();
    console.log('🎉 Connected successfully to live Supabase PostgreSQL database!');
    const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%lms%';`);
    console.log('LMS tables:', res.rows);
  } catch (err) {
    console.error('Conn error:', err.message);
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

main();
