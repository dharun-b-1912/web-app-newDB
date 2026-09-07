import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';

const regions = [
  'ap-southeast-2', 'ap-south-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-northeast-2',
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'
];

export async function executeSql(sql) {
  let connectedClient = null;

  for (const r of ['ap-southeast-2', 'ap-south-1', 'ap-southeast-1']) {
    for (const port of [6543, 5432]) {
      const host = `aws-0-${r}.pooler.supabase.com`;
      const client = new Client({
        host,
        port,
        database: 'postgres',
        user: `postgres.ysiajemrqakfngasehhi`,
        password: DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      try {
        await client.connect();
        console.log(`Connected to ${host}:${port}!`);
        connectedClient = client;
        break;
      } catch (err) {
        console.log(`Connection failed on ${host}:${port}: ${err.message}`);
        try { await client.end(); } catch (e) {}
      }
    }
    if (connectedClient) break;
  }

  if (!connectedClient) {
    throw new Error('Failed to connect to Supabase database pooler');
  }

  try {
    const res = await connectedClient.query(sql);
    return res;
  } finally {
    await connectedClient.end();
  }
}

// If invoked with a file argument
const sqlFile = process.argv[2];
if (sqlFile) {
  const content = fs.readFileSync(sqlFile, 'utf8');
  console.log(`Executing ${sqlFile}...`);
  executeSql(content)
    .then((res) => {
      console.log('✅ Executed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ SQL Execution error:', err);
      process.exit(1);
    });
}
