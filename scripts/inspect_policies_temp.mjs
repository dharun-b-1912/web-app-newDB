import pg from 'pg';
const { Client } = pg;

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'sa-east-1',
  'ca-central-1',
  'me-central-1',
  'af-south-1'
];

async function tryConnect() {
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const host = `aws-0-${region}.pooler.supabase.com`;
      const client = new Client({
        host,
        port,
        database: 'postgres',
        user: 'postgres.ysiajemrqakfngasehhi',
        password: 'Dh@run@1912',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 4000
      });
      try {
        await client.connect();
        console.log(`Connected to Pooler at ${host}:${port}!`);
        return client;
      } catch (err) {
        if (!err.message.includes('tenant/user') && !err.message.includes('timeout')) {
          console.log(`${host}:${port} -> ${err.message}`);
        }
        try { await client.end(); } catch (e) {}
      }
    }
  }
  throw new Error('Could not connect to project pooler.');
}

async function inspect() {
  const client = await tryConnect();
  const res = await client.query(`
    SELECT tablename, policyname, cmd, roles, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('employees', 'departments', 'designations', 'attendance_punches', 'attendance_daily', 'leave_requests', 'approval_workflows', 'employee_bank_details')
    ORDER BY tablename, cmd;
  `);
  for (const r of res.rows) {
    console.log(`[${r.tablename}] [${r.cmd}] ${r.policyname} | ROLES: ${r.roles}\n  QUAL: ${r.qual}\n  CHECK: ${r.with_check}\n`);
  }
  await client.end();
}

inspect().catch(console.error);
