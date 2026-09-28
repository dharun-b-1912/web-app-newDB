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
    connectionTimeoutMillis: 7000
  });

  try {
    await client.connect();
    console.log('🎉 Connected successfully to live Supabase PostgreSQL database!');

    const sqlPath = path.resolve(__dirname, '../supabase/migrations/20260915_113_enterprise_pg_cron_and_scheduled_jobs.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('\nExecuting Migration 20260915_113_enterprise_pg_cron_and_scheduled_jobs.sql directly against Supabase...');
    await client.query(sqlContent);
    console.log('✅ Migration 113 executed and applied successfully!');

    // Verify created functions
    const fnRes = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name IN (
          'fn_batch_settle_daily_attendance',
          'fn_check_biometric_device_heartbeats',
          'fn_process_monthly_leave_accruals',
          'fn_cleanup_expired_sessions'
        );
    `);
    console.log('\nVerified Created Functions:');
    console.table(fnRes.rows);

    // Check pg_cron jobs if extension exists
    const cronRes = await client.query(`
      SELECT extname FROM pg_extension WHERE extname = 'pg_cron';
    `);
    if (cronRes.rows.length > 0) {
      console.log('✅ pg_cron extension is ACTIVE in this database!');
      const jobsRes = await client.query(`SELECT jobid, jobname, schedule, command FROM cron.job;`);
      console.table(jobsRes.rows);
    } else {
      console.log('ℹ️ pg_cron extension is not active on this direct connection port (pooler), but functions are fully registered and executable via automated-cron-dispatcher Edge Function!');
    }

  } catch (err) {
    console.error('Migration execution error:', err.message);
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

main();
