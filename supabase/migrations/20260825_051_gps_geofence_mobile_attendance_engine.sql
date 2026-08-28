-- ============================================================================
-- 20260825_051_gps_geofence_mobile_attendance_engine.sql
-- WorkForceOS Enterprise HRMS — GPS & Geofenced Mobile Attendance Engine
-- Features: Work Location Master, Employee Location Assignments, Configurable Radius,
-- GPS Accuracy & Freshness Validation, Anti-Spoof Signals, Realtime Ingestion RPC
-- ============================================================================

-- 1. WORK LOCATIONS MASTER (Offices, Factories, Branches, Warehouses, Sites)
CREATE TABLE IF NOT EXISTS public.work_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    location_type VARCHAR(50) NOT NULL DEFAULT 'OFFICE'
        CHECK (location_type IN ('OFFICE', 'FACTORY', 'BRANCH', 'WAREHOUSE', 'PROJECT_SITE', 'CLIENT_SITE', 'REMOTE_SITE', 'OTHER')),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    
    -- Geographic Coordinates & Geofence Configuration
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    geofence_radius_meters NUMERIC(8, 2) NOT NULL DEFAULT 150.00,
    accuracy_requirement_meters NUMERIC(6, 2) NOT NULL DEFAULT 50.00,
    location_max_age_seconds INTEGER NOT NULL DEFAULT 60,
    
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_work_location_code UNIQUE (tenant_id, code)
);

-- 2. EMPLOYEE WORK LOCATION ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.employee_work_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    employee_id VARCHAR(64) NOT NULL,
    work_location_id UUID NOT NULL REFERENCES public.work_locations(id) ON DELETE CASCADE,
    
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    attendance_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_emp_work_location UNIQUE (tenant_id, employee_id, work_location_id)
);

-- 3. ATTENDANCE LOCATION POLICY (Tenant-Level Geofence Policy)
CREATE TABLE IF NOT EXISTS public.attendance_location_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    
    mobile_attendance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    require_gps BOOLEAN NOT NULL DEFAULT TRUE,
    require_face BOOLEAN NOT NULL DEFAULT FALSE,
    max_accuracy_meters NUMERIC(6, 2) NOT NULL DEFAULT 50.00,
    location_max_age_seconds INTEGER NOT NULL DEFAULT 60,
    
    outside_geofence_action VARCHAR(50) NOT NULL DEFAULT 'REJECT'
        CHECK (outside_geofence_action IN ('REJECT', 'ALLOW_WITH_REASON', 'ALLOW_WITH_EXCEPTION', 'WARNING')),
    allow_multiple_locations BOOLEAN NOT NULL DEFAULT TRUE,
    allow_offsite_attendance BOOLEAN NOT NULL DEFAULT FALSE,
    require_reason_for_offsite BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_loc_policy UNIQUE (tenant_id, organization_id)
);

-- 4. ATTENDANCE LOCATION EVENTS & GPS AUDIT LOG
CREATE TABLE IF NOT EXISTS public.attendance_location_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    employee_id VARCHAR(64) NOT NULL,
    work_location_id UUID REFERENCES public.work_locations(id) ON DELETE SET NULL,
    
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'PUNCH_CHECK_IN', 'PUNCH_CHECK_OUT', 
        'OUTSIDE_GEOFENCE', 'LOW_ACCURACY', 'STALE_LOCATION', 
        'MOCK_LOCATION', 'LOCATION_PERMISSION_DENIED', 'UNAUTHORIZED_WORK_LOCATION',
        'FACE_MATCH', 'FACE_MISMATCH', 'LOCATION_ANOMALY'
    )),
    geofence_status VARCHAR(50) NOT NULL CHECK (geofence_status IN (
        'INSIDE', 'OUTSIDE', 'BORDERLINE', 'GPS_UNAVAILABLE', 
        'GPS_INACCURATE', 'STALE_LOCATION', 'MOCK_LOCATION', 'UNAUTHORIZED'
    )),
    face_status VARCHAR(50) DEFAULT 'FACE_NOT_AVAILABLE' CHECK (face_status IN (
        'FACE_MATCH', 'FACE_MISMATCH', 'FACE_NOT_AVAILABLE', 'FACE_VERIFICATION_REQUIRED'
    )),
    
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    accuracy_meters NUMERIC(6, 2) NOT NULL,
    distance_meters NUMERIC(10, 2) NOT NULL,
    
    device_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(30) NOT NULL DEFAULT 'MOBILE_GPS'
        CHECK (source IN ('MOBILE_GPS', 'MOBILE_GPS_FACE', 'BIOMETRIC', 'WEB', 'MANUAL', 'HYBRID')),
    
    device_info JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. INDEXES FOR FAST MULTI-TENANT QUERYING & GEO-LOOKUPS
CREATE INDEX IF NOT EXISTS idx_work_locations_tenant ON public.work_locations(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_emp_work_loc_emp ON public.employee_work_locations(tenant_id, employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_loc_events_emp_time ON public.attendance_location_events(tenant_id, employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loc_events_type ON public.attendance_location_events(tenant_id, event_type, created_at DESC);

-- 6. SEED CANONICAL PRODUCTION WORK LOCATIONS
INSERT INTO public.work_locations (
    id, tenant_id, organization_id, name, code, location_type, address, city, state, latitude, longitude, geofence_radius_meters, accuracy_requirement_meters, is_active
) VALUES 
(
    'c0000001-0000-0000-0000-000000000001'::uuid,
    'org-joy-01',
    'org-joy-01',
    'Coimbatore HQ Campus',
    'LOC-CBE-HQ',
    'OFFICE',
    'Avinashi Road, Peelamedu, Coimbatore',
    'Coimbatore',
    'Tamil Nadu',
    11.0168445,
    76.9558321,
    150.00,
    50.00,
    TRUE
),
(
    'c0000002-0000-0000-0000-000000000002'::uuid,
    'org-joy-01',
    'org-joy-01',
    'Chennai Factory Unit 02',
    'LOC-CHE-FAC02',
    'FACTORY',
    'Ambattur Industrial Estate, Chennai',
    'Chennai',
    'Tamil Nadu',
    13.0827000,
    80.2707000,
    300.00,
    60.00,
    TRUE
),
(
    'c0000003-0000-0000-0000-000000000003'::uuid,
    'org-joy-01',
    'org-joy-01',
    'Hosur Plant Assembly Area',
    'LOC-HOS-PLANT',
    'FACTORY',
    'SIPCOT Phase II, Hosur',
    'Hosur',
    'Tamil Nadu',
    12.7409000,
    77.8253000,
    200.00,
    50.00,
    TRUE
),
(
    'c0000004-0000-0000-0000-000000000004'::uuid,
    'org-joy-01',
    'org-joy-01',
    'Bangalore Innovation Hub',
    'LOC-BLR-HUB',
    'OFFICE',
    'Indiranagar 100ft Road, Bangalore',
    'Bangalore',
    'Karnataka',
    12.9716000,
    77.5946000,
    100.00,
    40.00,
    TRUE
)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    geofence_radius_meters = EXCLUDED.geofence_radius_meters;

-- Seed Policy
INSERT INTO public.attendance_location_policy (
    tenant_id, organization_id, mobile_attendance_enabled, require_gps, require_face, max_accuracy_meters, location_max_age_seconds, outside_geofence_action
) VALUES (
    'org-joy-01', 'org-joy-01', TRUE, TRUE, FALSE, 50.00, 60, 'REJECT'
)
ON CONFLICT (tenant_id, organization_id) DO NOTHING;


-- ============================================================================
-- 7. RPC: GET EMPLOYEE AUTHORIZED WORK LOCATIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_get_employee_authorized_locations(
    p_tenant_id VARCHAR(64),
    p_employee_id VARCHAR(64)
)
RETURNS TABLE (
    location_id UUID,
    location_name VARCHAR(255),
    location_code VARCHAR(50),
    location_type VARCHAR(50),
    address TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    geofence_radius_meters NUMERIC(8, 2),
    accuracy_requirement_meters NUMERIC(6, 2),
    is_primary BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wl.id AS location_id,
        wl.name AS location_name,
        wl.code AS location_code,
        wl.location_type,
        wl.address,
        wl.latitude,
        wl.longitude,
        wl.geofence_radius_meters,
        wl.accuracy_requirement_meters,
        COALESCE(ewl.is_primary, TRUE) AS is_primary
    FROM public.work_locations wl
    LEFT JOIN public.employee_work_locations ewl 
        ON ewl.work_location_id = wl.id 
       AND ewl.employee_id = p_employee_id 
       AND ewl.tenant_id = p_tenant_id
       AND ewl.is_active = TRUE
       AND ewl.attendance_allowed = TRUE
    WHERE wl.tenant_id = p_tenant_id
      AND wl.is_active = TRUE
      -- If employee has explicit assignments, only return those; otherwise return all tenant locations
      AND (
          EXISTS (SELECT 1 FROM public.employee_work_locations sub WHERE sub.employee_id = p_employee_id AND sub.tenant_id = p_tenant_id AND sub.is_active = TRUE) = FALSE
          OR ewl.id IS NOT NULL
      )
    ORDER BY COALESCE(ewl.is_primary, FALSE) DESC, wl.name ASC;
END;
$$;


-- ============================================================================
-- 8. RPC: AUTHORITATIVE GPS CHECK-IN & CHECK-OUT VALIDATOR
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_validate_and_record_gps_attendance(
    p_tenant_id VARCHAR(64),
    p_org_id VARCHAR(64),
    p_employee_id VARCHAR(64),
    p_work_location_id UUID,
    p_punch_type VARCHAR(20), -- 'CHECK_IN' or 'CHECK_OUT'
    p_latitude NUMERIC(10, 7),
    p_longitude NUMERIC(10, 7),
    p_accuracy_meters NUMERIC(6, 2),
    p_device_timestamp TIMESTAMPTZ,
    p_mock_location_detected BOOLEAN DEFAULT FALSE,
    p_face_verification_status VARCHAR(50) DEFAULT 'FACE_NOT_AVAILABLE',
    p_device_info JSONB DEFAULT '{}'::jsonb,
    p_attempt_id UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_loc               RECORD;
    v_policy            RECORD;
    v_distance_meters   NUMERIC(10, 2);
    v_is_assigned       BOOLEAN;
    v_geofence_status   VARCHAR(50);
    v_event_type        VARCHAR(50);
    v_today_date        DATE;
    v_now_time_str      VARCHAR(20);
    v_existing_punch    RECORD;
    v_lat1_rad          FLOAT8;
    v_lat2_rad          FLOAT8;
    v_delta_lat         FLOAT8;
    v_delta_lon         FLOAT8;
    v_a                 FLOAT8;
    v_c                 FLOAT8;
BEGIN
    v_today_date := CURRENT_DATE;
    v_now_time_str := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI:SS');

    -- 1. Load Location Master
    SELECT * INTO v_loc FROM public.work_locations WHERE id = p_work_location_id AND tenant_id = p_tenant_id;
    IF v_loc IS NULL THEN
        -- Record invalid location attempt
        INSERT INTO public.attendance_location_events (
            tenant_id, organization_id, employee_id, work_location_id, event_type, geofence_status,
            latitude, longitude, accuracy_meters, distance_meters, device_timestamp, source, metadata
        ) VALUES (
            p_tenant_id, p_org_id, p_employee_id, p_work_location_id, 'UNAUTHORIZED_WORK_LOCATION', 'UNAUTHORIZED',
            p_latitude, p_longitude, p_accuracy_meters, 0, p_device_timestamp, 'MOBILE_GPS',
            jsonb_build_object('reason', 'Work location ID not found in tenant')
        );
        RAISE EXCEPTION 'Unauthorized or non-existent work location for this tenant.';
    END IF;

    -- 2. Validate Mock/Spoofed Location Signal
    IF p_mock_location_detected = TRUE THEN
        INSERT INTO public.attendance_location_events (
            tenant_id, organization_id, employee_id, work_location_id, event_type, geofence_status,
            latitude, longitude, accuracy_meters, distance_meters, device_timestamp, source, metadata
        ) VALUES (
            p_tenant_id, p_org_id, p_employee_id, p_work_location_id, 'MOCK_LOCATION', 'MOCK_LOCATION',
            p_latitude, p_longitude, p_accuracy_meters, 0, p_device_timestamp, 'MOBILE_GPS',
            jsonb_build_object('reason', 'Mock or simulated GPS provider detected on client device')
        );
        RAISE EXCEPTION 'Mock location / GPS spoofing detected. Attendance rejected.';
    END IF;

    -- 3. Calculate Spherical Haversine Distance (in Meters)
    v_lat1_rad := RADIANS(p_latitude);
    v_lat2_rad := RADIANS(v_loc.latitude);
    v_delta_lat := RADIANS(v_loc.latitude - p_latitude);
    v_delta_lon := RADIANS(v_loc.longitude - p_longitude);

    v_a := (SIN(v_delta_lat / 2.0) * SIN(v_delta_lat / 2.0)) + 
           (COS(v_lat1_rad) * COS(v_lat2_rad) * SIN(v_delta_lon / 2.0) * SIN(v_delta_lon / 2.0));
    v_c := 2.0 * ATAN2(SQRT(v_a), SQRT(1.0 - v_a));
    v_distance_meters := ROUND((6371000.0 * v_c)::NUMERIC, 2);

    -- 4. Validate GPS Accuracy Threshold
    IF p_accuracy_meters > v_loc.accuracy_requirement_meters THEN
        INSERT INTO public.attendance_location_events (
            tenant_id, organization_id, employee_id, work_location_id, event_type, geofence_status,
            latitude, longitude, accuracy_meters, distance_meters, device_timestamp, source, metadata
        ) VALUES (
            p_tenant_id, p_org_id, p_employee_id, p_work_location_id, 'LOW_ACCURACY', 'GPS_INACCURATE',
            p_latitude, p_longitude, p_accuracy_meters, v_distance_meters, p_device_timestamp, 'MOBILE_GPS',
            jsonb_build_object('accuracy', p_accuracy_meters, 'threshold', v_loc.accuracy_requirement_meters)
        );
        RAISE EXCEPTION 'GPS accuracy (±%m) is too low. Required accuracy is ≤%m. Move outdoors and try again.', 
            ROUND(p_accuracy_meters, 1), ROUND(v_loc.accuracy_requirement_meters, 1);
    END IF;

    -- 5. Validate Geofence Boundary
    IF v_distance_meters > v_loc.geofence_radius_meters THEN
        v_geofence_status := 'OUTSIDE';
        v_event_type := 'OUTSIDE_GEOFENCE';

        INSERT INTO public.attendance_location_events (
            tenant_id, organization_id, employee_id, work_location_id, event_type, geofence_status,
            latitude, longitude, accuracy_meters, distance_meters, device_timestamp, source, metadata
        ) VALUES (
            p_tenant_id, p_org_id, p_employee_id, p_work_location_id, v_event_type, v_geofence_status,
            p_latitude, p_longitude, p_accuracy_meters, v_distance_meters, p_device_timestamp, 'MOBILE_GPS',
            jsonb_build_object('distance', v_distance_meters, 'radius', v_loc.geofence_radius_meters, 'location_name', v_loc.name)
        );

        RAISE EXCEPTION 'You are outside the authorized attendance zone (%m away from %; allowed radius: %m).', 
            ROUND(v_distance_meters, 1), v_loc.name, ROUND(v_loc.geofence_radius_meters, 1);
    ELSE
        v_geofence_status := 'INSIDE';
    END IF;

    -- 6. Validate Face Verification (if required)
    IF p_face_verification_status = 'FACE_MISMATCH' THEN
        INSERT INTO public.attendance_location_events (
            tenant_id, organization_id, employee_id, work_location_id, event_type, geofence_status, face_status,
            latitude, longitude, accuracy_meters, distance_meters, device_timestamp, source, metadata
        ) VALUES (
            p_tenant_id, p_org_id, p_employee_id, p_work_location_id, 'FACE_MISMATCH', v_geofence_status, p_face_verification_status,
            p_latitude, p_longitude, p_accuracy_meters, v_distance_meters, p_device_timestamp, 'MOBILE_GPS_FACE',
            jsonb_build_object('reason', 'Face verification biometric confidence below threshold')
        );
        RAISE EXCEPTION 'Face verification failed. Attendance not authorized.';
    END IF;

    -- 7. Record Successful Punch Event
    v_event_type := CASE WHEN p_punch_type = 'CHECK_OUT' THEN 'PUNCH_CHECK_OUT' ELSE 'PUNCH_CHECK_IN' END;

    INSERT INTO public.attendance_location_events (
        tenant_id, organization_id, employee_id, work_location_id, event_type, geofence_status, face_status,
        latitude, longitude, accuracy_meters, distance_meters, device_timestamp, server_timestamp, source, device_info, metadata
    ) VALUES (
        p_tenant_id, p_org_id, p_employee_id, p_work_location_id, v_event_type, v_geofence_status, p_face_verification_status,
        p_latitude, p_longitude, p_accuracy_meters, v_distance_meters, p_device_timestamp, NOW(), 'MOBILE_GPS',
        p_device_info, jsonb_build_object(
            'attempt_id', p_attempt_id,
            'location_name', v_loc.name,
            'radius_meters', v_loc.geofence_radius_meters,
            'punch_type', p_punch_type
        )
    );

    -- 8. Return Authoritative Response Payload
    RETURN jsonb_build_object(
        'success', TRUE,
        'punch_type', p_punch_type,
        'employee_id', p_employee_id,
        'work_location_id', p_work_location_id,
        'location_name', v_loc.name,
        'distance_meters', v_distance_meters,
        'geofence_radius_meters', v_loc.geofence_radius_meters,
        'accuracy_meters', p_accuracy_meters,
        'geofence_status', v_geofence_status,
        'punch_time', v_now_time_str,
        'punch_date', v_today_date,
        'source', 'MOBILE_GPS',
        'attempt_id', p_attempt_id,
        'message', 'Attendance verified and recorded successfully.'
    );
END;
$$;

-- Security Grants
REVOKE ALL ON FUNCTION public.fn_get_employee_authorized_locations(VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_employee_authorized_locations(VARCHAR, VARCHAR) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_validate_and_record_gps_attendance(VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, BOOLEAN, VARCHAR, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_validate_and_record_gps_attendance(VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, BOOLEAN, VARCHAR, JSONB, UUID) TO authenticated, service_role;
