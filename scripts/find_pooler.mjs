import net from 'net';
import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';

const regions = [
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'sa-east-1', 'ca-central-1', 'me-central-1', 'af-south-1'
];

async function scan() {
  console.log('Testing pooler regions...');
  for (const r of regions) {
    for (const port of [6543, 5432]) {
      const host = `aws-0-${r}.pooler.supabase.com`;
      const client = new Client({
        host,
        port,
        database: 'postgres',
        user: `postgres.${PROJECT_ID}`,
        password: DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000
      });
      try {
        await client.connect();
        console.log(`\n🎉 FOUND POOLER: ${host}:${port}`);
        await client.end();
        return { host, port };
      } catch (err) {
        if (!err.message.includes('timeout') && !err.message.includes('Tenant or user not found')) {
          console.log(`Notice: ${host}:${port} -> ${err.message}`);
        }
        try { await client.end(); } catch (e) {}
      }
    }
  }
  console.log('Finished scan without match.');
}

scan();
