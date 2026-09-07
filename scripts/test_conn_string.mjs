import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const RAW_PASSWORD = 'Dh@run@1912';
const ENCODED_PWD = encodeURIComponent(RAW_PASSWORD);

async function testConnection() {
  console.log('Testing connection strings...');

  // Test 1: object with raw password
  console.log('1. Testing Client object config on ap-southeast-2:6543...');
  const c1 = new Client({
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_ID}`,
    password: RAW_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await c1.connect();
    console.log('🎉 CONNECTED VIA OBJECT CONFIG!');
    const res = await c1.query('SELECT current_database(), current_user;');
    console.log('Query result:', res.rows);
    await c1.end();
    return;
  } catch (err) {
    console.log('❌ c1 failed:', err.message);
    try { await c1.end(); } catch (e) {}
  }

  // Test 2: URL connection string
  console.log('2. Testing connectionString on ap-southeast-2:6543...');
  const connStr = `postgresql://postgres.${PROJECT_ID}:${ENCODED_PWD}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`;
  const c2 = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await c2.connect();
    console.log('🎉 CONNECTED VIA CONNECTION STRING!');
    const res = await c2.query('SELECT current_database(), current_user;');
    console.log('Query result:', res.rows);
    await c2.end();
    return;
  } catch (err) {
    console.log('❌ c2 failed:', err.message);
    try { await c2.end(); } catch (e) {}
  }
}

testConnection();
