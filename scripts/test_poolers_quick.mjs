import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';

// Let's test standard Supabase direct and pooler combinations
const candidates = [
  { host: `aws-0-ap-south-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-ap-south-1.pooler.supabase.com`, port: 5432, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-eu-central-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-us-east-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-us-west-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` },
  { host: `aws-0-ap-northeast-1.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_ID}` }
];

async function testAll() {
  for (const c of candidates) {
    console.log(`Connecting to ${c.host}:${c.port}...`);
    const client = new Client({
      host: c.host,
      port: c.port,
      database: 'postgres',
      user: c.user,
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 2000
    });

    try {
      await client.connect();
      console.log(`✅ SUCCESS on ${c.host}:${c.port}!`);
      await client.end();
      return;
    } catch (err) {
      console.log(`❌ ${c.host}:${c.port} -> ${err.message}`);
      try { await client.end(); } catch (e) {}
    }
  }
}

testAll();
