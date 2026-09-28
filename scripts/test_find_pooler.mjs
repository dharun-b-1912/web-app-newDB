import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'us-east-1',
  'us-west-1',
  'eu-central-1',
  'eu-west-1'
];

async function findWorkingPooler() {
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
        connectionTimeoutMillis: 3500
      });

      try {
        await client.connect();
        console.log(`🎉 SUCCESS! Connected to ${host}:${port}`);
        const res = await client.query('SELECT current_database(), current_user;');
        console.log('Query result:', res.rows[0]);
        await client.end();
        return { host, port };
      } catch (err) {
        // failed
      } finally {
        try { await client.end(); } catch (e) {}
      }
    }
  }
  console.log('❌ Could not connect to any pooler region with this password.');
}

findWorkingPooler();
