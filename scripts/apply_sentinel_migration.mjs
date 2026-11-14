import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';
const HOST = 'aws-0-ap-southeast-2.pooler.supabase.com';

async function main() {
  console.log(`Connecting to Supabase at ${HOST}:6543...`);
  const client = new Client({
    host: HOST,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_ID}`,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Connected successfully to live Supabase PostgreSQL!');

    const sqlPath = path.resolve(__dirname, '../supabase/migrations/20261114_joy_sentinel_core.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing Sentinel Core Migration...');
    await client.query(sqlContent);
    console.log('Sentinel Core Migration applied successfully!');

    // Verify created tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('sentinel_events', 'sentinel_incidents', 'sentinel_oncall_schedules');
    `);
    console.log('Verified Sentinel Tables:', tableRes.rows.map(r => r.table_name));

    // Verify oncall seeds
    const oncallRes = await client.query(`SELECT developer_name, phone, role_tier FROM public.sentinel_oncall_schedules;`);
    console.log('On-Call Schedules Seeded:', oncallRes.rows);
  } catch (err) {
    console.error('Error applying migration:', err.message);
  } finally {
    await client.end();
  }
}

main();
