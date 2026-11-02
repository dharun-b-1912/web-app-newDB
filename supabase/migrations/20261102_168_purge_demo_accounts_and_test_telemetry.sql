-- =========================================================================================
-- JOY PEOPLEHR — PURGE DEMO EMPLOYEE TELEMETRY & GHOST ACCOUNTS
-- Migration: 20261102_168_purge_demo_accounts_and_test_telemetry.sql
-- =========================================================================================

-- 1. Remove demo employee pings from Live Fleet Radar table
DELETE FROM public.employee_live_locations 
WHERE employee_code = 'JCS-099' 
   OR employee_name ILIKE '%Arjun Kumar%'
   OR employee_name ILIKE '%Demo%'
   OR employee_id = 'e0000000-0000-4000-8000-fcad91430e98';

-- 2. Remove demo employee breadcrumb trails
DELETE FROM public.employee_location_trails 
WHERE employee_id = 'e0000000-0000-4000-8000-fcad91430e98'
   OR (latitude BETWEEN 37.41 AND 37.43 AND longitude BETWEEN -122.09 AND -122.07);

-- 3. Deactivate the demo employee account in employees table
UPDATE public.employees 
SET employment_status = 'RESIGNED',
    deleted_at = NOW(),
    work_email = 'inactive.demo@joypeoplehr.com'
WHERE employee_code = 'JCS-099' 
   OR id = 'e0000000-0000-4000-8000-fcad91430e98';

-- 4. Clean up any stale emulator/test coordinates
DELETE FROM public.employee_live_locations
WHERE (latitude BETWEEN 37.41 AND 37.43 AND longitude BETWEEN -122.09 AND -122.07);
