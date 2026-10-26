import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';
const HOST = 'aws-0-ap-southeast-2.pooler.supabase.com';

async function test() {
  console.log(`Connecting to ${HOST}...`);
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
    console.log('SUCCESSFULLY CONNECTED TO POSTGRES!');
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lms_courses'
    `);
    console.log('lms_courses columns:');
    console.table(res.rows);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

test();
