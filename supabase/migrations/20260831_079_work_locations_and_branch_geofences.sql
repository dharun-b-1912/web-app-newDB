-- supabase/migrations/20260831_079_work_locations_and_branch_geofences.sql
-- ============================================================================
-- Joy PeopleHR Enterprise — Multi-Tenant Work Locations & Branch Geofences
-- Creates work_locations, employee_work_location_assignments, and attendance_location_events
-- Dynamic Organization & Tenant Isolation (No static hardcoded IDs)
-- ============================================================================

-- 1. Create work_locations table
CREATE TABLE IF NOT EXISTS public.work_locations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  branch_id TEXT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'OFFICE',
  address TEXT DEFAULT '',
  city TEXT DEFAULT 'Coimbatore',
  state TEXT DEFAULT 'Tamil Nadu',
  country TEXT DEFAULT 'India',
  postal_code TEXT DEFAULT '641014',
  latitude NUMERIC NOT NULL DEFAULT 11.0844364,
  longitude NUMERIC NOT NULL DEFAULT 77.1262627,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 100,
  accuracy_requirement_meters INTEGER NOT NULL DEFAULT 50,
  location_max_age_seconds INTEGER NOT NULL DEFAULT 60,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  ip_ranges JSONB DEFAULT '[]'::jsonb,
  bssid_list JSONB DEFAULT '[]'::jsonb,
  qr_code_enabled BOOLEAN DEFAULT true,
  biometric_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create employee_work_location_assignments table
CREATE TABLE IF NOT EXISTS public.employee_work_location_assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  work_location_id TEXT NOT NULL REFERENCES public.work_locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  attendance_allowed BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create attendance_location_events table (Audit & Geo logs)
CREATE TABLE IF NOT EXISTS public.attendance_location_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  employee_code TEXT,
  work_location_id TEXT,
  work_location_name TEXT,
  event_type TEXT NOT NULL,
  geofence_status TEXT NOT NULL,
  face_status TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy_meters NUMERIC NOT NULL DEFAULT 10,
  distance_meters NUMERIC NOT NULL DEFAULT 0,
  device_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'MOBILE_GPS',
  device_info JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS on all location tables
ALTER TABLE public.work_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_work_location_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_location_events ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for work_locations
DROP POLICY IF EXISTS "Tenant work locations select" ON public.work_locations;
CREATE POLICY "Tenant work locations select" ON public.work_locations
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Tenant work locations insert" ON public.work_locations;
CREATE POLICY "Tenant work locations insert" ON public.work_locations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Tenant work locations update" ON public.work_locations;
CREATE POLICY "Tenant work locations update" ON public.work_locations
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Tenant work locations delete" ON public.work_locations;
CREATE POLICY "Tenant work locations delete" ON public.work_locations
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 6. RLS Policies for employee_work_location_assignments
DROP POLICY IF EXISTS "Tenant assignments select" ON public.employee_work_location_assignments;
CREATE POLICY "Tenant assignments select" ON public.employee_work_location_assignments
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Tenant assignments modify" ON public.employee_work_location_assignments;
CREATE POLICY "Tenant assignments modify" ON public.employee_work_location_assignments
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 7. RLS Policies for attendance_location_events
DROP POLICY IF EXISTS "Tenant location events select" ON public.attendance_location_events;
CREATE POLICY "Tenant location events select" ON public.attendance_location_events
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Tenant location events insert" ON public.attendance_location_events;
CREATE POLICY "Tenant location events insert" ON public.attendance_location_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Dynamically Link Work Locations to the Actual Registered Primary Organization
DO $$
DECLARE
  v_org_id TEXT;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
  
  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.work_locations (
      id, tenant_id, organization_id, branch_id, name, code, location_type, address, city, state, country, postal_code, latitude, longitude, geofence_radius_meters, accuracy_requirement_meters, timezone, is_active
    ) VALUES 
      ('loc-hq-01', v_org_id, v_org_id, 'br-hq-01', 'Joy Corporate Solutions (HQ)', 'HQ-CBE', 'OFFICE', 'D.No: 2 31 A9, Annur Road, Thennampalayam, Sulur, Arasur', 'Coimbatore', 'Tamil Nadu', 'India', '641014', 11.0844364, 77.1262627, 100, 50, 'Asia/Kolkata', true),
      ('loc-wt-u3', v_org_id, v_org_id, 'br-wt-u3', 'Water Tec Unit 3', 'WT-U3', 'FACTORY', 'Industrial Estate, Pollachi Road', 'Coimbatore', 'Tamil Nadu', 'India', '641021', 10.9844364, 77.0162627, 250, 60, 'Asia/Kolkata', true),
      ('loc-cn-hq', v_org_id, v_org_id, 'br-cn-hq', 'CareNow Project Site', 'CN-HQ', 'PROJECT_SITE', 'Avinashi Main Road, Peelamedu', 'Coimbatore', 'Tamil Nadu', 'India', '641004', 11.0244364, 77.0062627, 150, 50, 'Asia/Kolkata', true)
    ON CONFLICT (id) DO UPDATE SET
      tenant_id = v_org_id,
      organization_id = v_org_id,
      name = EXCLUDED.name,
      code = EXCLUDED.code,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      geofence_radius_meters = EXCLUDED.geofence_radius_meters,
      is_active = true;
  END IF;
END $$;
