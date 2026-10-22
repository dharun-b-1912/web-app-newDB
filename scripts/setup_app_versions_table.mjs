import pg from 'pg';

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
    console.log('Connected to database.');

    const sql = `
      CREATE TABLE IF NOT EXISTS public.app_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        platform text NOT NULL UNIQUE,
        latest_version text NOT NULL DEFAULT '1.1.0',
        latest_build_number int NOT NULL DEFAULT 17,
        min_supported_version text NOT NULL DEFAULT '1.0.0',
        min_supported_build_number int NOT NULL DEFAULT 1,
        release_notes text NOT NULL DEFAULT 'Unified payslips with accurate deductions, automated leave calculation fixes, resolved push notifications, and updated executive UI.',
        play_store_url text NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.joypeoplehr.app',
        is_force_update boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Allow public read access to app_versions" ON public.app_versions;
      CREATE POLICY "Allow public read access to app_versions" ON public.app_versions
        FOR SELECT USING (true);

      INSERT INTO public.app_versions (platform, latest_version, latest_build_number, min_supported_version, min_supported_build_number, release_notes, play_store_url, is_force_update, is_active)
      VALUES (
        'android',
        '1.1.0',
        17,
        '1.0.0',
        1,
        'Unified payslips with accurate deductions, automated leave calculation fixes, resolved push notifications, and updated executive UI.',
        'https://play.google.com/store/apps/details?id=com.joypeoplehr.app',
        false,
        true
      )
      ON CONFLICT (platform) DO UPDATE SET
        latest_version = EXCLUDED.latest_version,
        latest_build_number = EXCLUDED.latest_build_number,
        release_notes = EXCLUDED.release_notes,
        play_store_url = EXCLUDED.play_store_url,
        updated_at = now();
    `;

    await client.query(sql);
    console.log('✅ app_versions table configured successfully with RLS policy!');

    const res = await client.query('SELECT * FROM public.app_versions');
    console.log('Current app_versions rows:', res.rows);
  } catch (err) {
    console.error('Error setting up app_versions:', err);
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

main();
