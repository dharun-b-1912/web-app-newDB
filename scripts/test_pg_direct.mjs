import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';

async function testConn() {
  const targets = [
    { host: `db.${PROJECT_ID}.supabase.co`, port: 5432, user: 'postgres' },
    { host: 'aws-0-ap-south-1.pooler.supabase.com', port: 6543, user: `postgres.${PROJECT_ID}` },
    { host: 'aws-0-ap-southeast-1.pooler.supabase.com', port: 6543, user: `postgres.${PROJECT_ID}` },
    { host: 'aws-0-ap-southeast-2.pooler.supabase.com', port: 6543, user: `postgres.${PROJECT_ID}` },
    { host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543, user: `postgres.${PROJECT_ID}` },
    { host: 'aws-0-eu-central-1.pooler.supabase.com', port: 6543, user: `postgres.${PROJECT_ID}` },
  ];

  for (const t of targets) {
    const client = new Client({
      host: t.host,
      port: t.port,
      database: 'postgres',
      user: t.user,
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000
    });
    try {
      await client.connect();
      console.log(`SUCCESS CONNECTED TO ${t.host}:${t.port}!`);
      const res = await client.query('SELECT 1 as test');
      console.log('Query result:', res.rows);
      await client.end();
      return t;
    } catch (e) {
      console.log(`Failed ${t.host}:${t.port} - ${e.message}`);
    }
  }
}

testConn();
