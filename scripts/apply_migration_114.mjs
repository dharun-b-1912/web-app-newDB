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
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('🎉 Connected successfully to live Supabase PostgreSQL database!');

    const sqlPath = path.resolve(__dirname, '../supabase/migrations/20260915_114_enterprise_identity_and_role_hierarchy.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('\nExecuting Migration 20260915_114_enterprise_identity_and_role_hierarchy.sql directly against Supabase...');
    await client.query(sqlContent);
    console.log('✅ Migration 114 executed and applied successfully!');

    // Verify created tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'user_profiles',
          'organization_memberships',
          'roles',
          'permissions',
          'role_permissions',
          'organization_invitations',
          'audit_logs'
        );
    `);
    console.log('\nVerified Created / Active Enterprise Tables:');
    console.table(tableRes.rows);

    // Verify permissions count
    const permRes = await client.query(`SELECT COUNT(*) as total_permissions FROM public.permissions;`);
    console.log(`\nTotal Permissions in public.permissions: ${permRes.rows[0].total_permissions}`);

  } catch (err) {
    console.error('❌ Error executing migration:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
