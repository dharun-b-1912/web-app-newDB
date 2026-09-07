import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';

async function testDirect() {
  const hosts = [
    { host: `db.${PROJECT_ID}.supabase.co`, port: 5432, user: 'postgres' },
    { host: `aws-0-ap-southeast-2.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
    { host: `aws-0-ap-southeast-2.pooler.supabase.com`, port: 5432, user: `postgres.${PROJECT_ID}` },
    { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
    { host: `aws-0-ap-south-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
  ];

  for (const h of hosts) {
    console.log(`Trying ${h.user}@${h.host}:${h.port}...`);
    const client = new Client({
      host: h.host,
      port: h.port,
      database: 'postgres',
      user: h.user,
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      console.log(`✅ CONNECTED TO ${h.host}:${h.port}!`);
      const res = await client.query('SELECT current_database(), current_user;');
      console.log('Result:', res.rows);
      await client.end();
      return h;
    } catch (e) {
      console.log(`❌ Failed: ${e.message}`);
      try { await client.end(); } catch (err) {}
    }
  }
}

testDirect();
