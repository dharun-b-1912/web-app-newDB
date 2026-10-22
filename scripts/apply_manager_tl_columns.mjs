import pg from 'pg';

const { Client } = pg;
const PROJECT_ID = 'ysiajemrqakfngasehhi';
const DB_PASSWORD = 'Dh@run@1912';
const HOST = 'aws-0-ap-southeast-2.pooler.supabase.com';

async function main() {
  const client = new Client({
    host: HOST,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_ID}`,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL!');

  // 1. Add manager & TL columns and employment jsonb to employees table if not exists
  await client.query(`
    ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS reporting_manager_name TEXT,
    ADD COLUMN IF NOT EXISTS team_lead_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS team_lead_name TEXT,
    ADD COLUMN IF NOT EXISTS manager_name TEXT,
    ADD COLUMN IF NOT EXISTS reports_to_name TEXT,
    ADD COLUMN IF NOT EXISTS employment JSONB DEFAULT '{}'::jsonb;
  `);
  console.log('Added manager & TL columns to employees table successfully!');

  // 2. Query Praveen B
  const praveenRes = await client.query(`
    SELECT id, employee_code, first_name, last_name, display_name
    FROM public.employees
    WHERE id = '55f486f8-e3aa-4133-9e85-dfc519ed2825'
  `);
  console.log('Praveen B:', praveenRes.rows[0]);

  // 3. Update Thirumalai JCS-20 record
  const updateRes = await client.query(`
    UPDATE public.employees
    SET
      reporting_manager_id = '55f486f8-e3aa-4133-9e85-dfc519ed2825',
      reporting_manager_name = 'Praveen B',
      manager_name = 'Praveen B',
      reports_to_name = 'Praveen B',
      employment = jsonb_build_object(
        'reporting_manager_id', '55f486f8-e3aa-4133-9e85-dfc519ed2825',
        'reporting_manager_name', 'Praveen B',
        'reports_to_name', 'Praveen B',
        'manager_name', 'Praveen B'
      ),
      updated_at = NOW()
    WHERE employee_code = 'JCS-20'
    RETURNING id, employee_code, display_name, reporting_manager_id, reporting_manager_name, reports_to_name, employment;
  `);
  console.log('Updated Thirumalai record in DB:', updateRes.rows[0]);

  // 4. Also backfill any other employees that have reporting_manager_id
  await client.query(`
    UPDATE public.employees e
    SET
      reporting_manager_name = m.display_name,
      manager_name = m.display_name,
      reports_to_name = CASE
        WHEN e.team_lead_name IS NOT NULL AND e.team_lead_name != '' THEN m.display_name || ' (Manager) / ' || e.team_lead_name || ' (TL)'
        ELSE m.display_name
      END,
      employment = COALESCE(e.employment, '{}'::jsonb) || jsonb_build_object(
        'reporting_manager_id', m.id,
        'reporting_manager_name', m.display_name,
        'reports_to_name', CASE
          WHEN e.team_lead_name IS NOT NULL AND e.team_lead_name != '' THEN m.display_name || ' (Manager) / ' || e.team_lead_name || ' (TL)'
          ELSE m.display_name
        END,
        'manager_name', m.display_name
      )
    FROM public.employees m
    WHERE e.reporting_manager_id = m.id
      AND (e.reporting_manager_name IS NULL OR e.reports_to_name IS NULL);
  `);
  console.log('Backfilled reporting manager names across all employees in DB!');

  await client.end();
}

main().catch(console.error);
