    -- ============================================================================
    -- WorkforceOS Enterprise HRMS — GPS & Mobile Attendance Production Engine
    -- Migration: 20260826_production_gps_mobile_attendance_channel.sql
    -- Features: Multi-Tenant Work Locations Master, Employee Location Assignments,
    --           Configurable Radius, High-Accuracy GPS Validation, Anti-Spoofing,
    --           Atomic Attendance Punch Ingestion, Shift Sync, Realtime Broadcast
    -- ============================================================================

    -- 1. WORK LOCATIONS MASTER
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

    -- 3. ATTENDANCE LOCATION POLICY
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

    -- 4. ATTENDANCE LOCATION EVENTS & AUDIT LOG
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

    -- 5. REALTIME PUBLICATION SETUP
    DO $$
    DECLARE
        t text;
        tables_to_add text[] := ARRAY[
            'work_locations',
            'employee_work_locations',
            'attendance_location_policy',
            'attendance_location_events',
            'attendance_punches',
            'attendance_daily'
        ];
    BEGIN
        FOREACH t IN ARRAY tables_to_add LOOP
            IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
                EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', t);
                BEGIN
                    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
                EXCEPTION WHEN duplicate_object THEN
                    NULL;
                WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
        END LOOP;
    END $$;

    -- 6. SEED CANONICAL WORK LOCATIONS
    INSERT INTO public.work_locations (
        id, tenant_id, organization_id, name, code, location_type, address, city, state, latitude, longitude, geofence_radius_meters, accuracy_requirement_meters, is_active
    ) VALUES 
    (
        'c0000001-0000-0000-0000-000000000001'::uuid,
        'org-joy-01',
        'org-joy-01',
        'Joy Corporate Solutions Private Limited (HQ)',
        'LOC-7EQ3',
        'OFFICE',
        'D.No: 2 31 A9, Annur Road, Thennampalayam, Sulur, Arasur, Coimbatore, Tamil Nadu 641407',
        'Coimbatore',
        'Tamil Nadu',
        11.0844000,
        77.1263000,
        100.00,
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
        geofence_radius_meters = EXCLUDED.geofence_radius_meters,
        is_active = EXCLUDED.is_active;

    -- Seed Default Policy
    INSERT INTO public.attendance_location_policy (
        tenant_id, organization_id, mobile_attendance_enabled, require_gps, require_face, max_accuracy_meters, location_max_age_seconds, outside_geofence_action
    ) VALUES (
        'org-joy-01', 'org-joy-01', TRUE, TRUE, FALSE, 50.00, 60, 'REJECT'
    )
    ON CONFLICT (tenant_id, organization_id) DO UPDATE SET
        mobile_attendance_enabled = EXCLUDED.mobile_attendance_enabled,
        require_gps = EXCLUDED.require_gps,
        max_accuracy_meters = EXCLUDED.max_accuracy_meters;

    -- 7. RPC: GET EMPLOYEE AUTHORIZED WORK LOCATIONS
    CREATE OR REPLACE FUNCTION public.fn_get_employee_authorized_locations(
        p_tenant_id VARCHAR(64) DEFAULT 'org-joy-01',
        p_employee_id VARCHAR(64) DEFAULT NULL
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
        AND (p_employee_id IS NULL OR ewl.employee_id = p_employee_id)
        AND ewl.tenant_id = p_tenant_id
        AND ewl.is_active = TRUE
        AND ewl.attendance_allowed = TRUE
        WHERE wl.tenant_id = p_tenant_id
        AND wl.is_active = TRUE
        AND (
            p_employee_id IS NULL
            OR EXISTS (SELECT 1 FROM public.employee_work_locations sub WHERE sub.employee_id = p_employee_id AND sub.tenant_id = p_tenant_id AND sub.is_active = TRUE) = FALSE
            OR ewl.id IS NOT NULL
        )
        ORDER BY COALESCE(ewl.is_primary, FALSE) DESC, wl.name ASC;
    END;
    $$;

    -- 8. RPC: AUTHORITATIVE GPS CHECK-IN & CHECK-OUT INGESTION WITH ATTENDANCE SYNC
    CREATE OR REPLACE FUNCTION public.fn_validate_and_record_gps_attendance(
        p_tenant_id VARCHAR(64) DEFAULT 'org-joy-01',
        p_org_id VARCHAR(64) DEFAULT 'org-joy-01',
        p_employee_id VARCHAR(64) DEFAULT NULL,
        p_work_location_id UUID DEFAULT NULL,
        p_punch_type VARCHAR(20) DEFAULT 'CHECK_IN', -- 'CHECK_IN' or 'CHECK_OUT'
        p_latitude NUMERIC(10, 7) DEFAULT NULL,
        p_longitude NUMERIC(10, 7) DEFAULT NULL,
        p_accuracy_meters NUMERIC(6, 2) DEFAULT 10.0,
        p_device_timestamp TIMESTAMPTZ DEFAULT NOW(),
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
        v_distance_meters   NUMERIC(10, 2);
        v_best_distance     NUMERIC(10, 2) := 99999999.0;
        v_best_loc          RECORD;
        v_geofence_status   VARCHAR(50);
        v_event_type        VARCHAR(50);
        v_today_date        DATE := CURRENT_DATE;
        v_now_time_str      VARCHAR(20);
        v_now_ts            TIMESTAMPTZ := NOW();
        v_lat1_rad          FLOAT8;
        v_lat2_rad          FLOAT8;
        v_delta_lat         FLOAT8;
        v_delta_lon         FLOAT8;
        v_a                 FLOAT8;
        v_c                 FLOAT8;
        v_punch_id          UUID := gen_random_uuid();
        v_emp_record        RECORD;
        v_emp_name          VARCHAR(150) := 'Employee';
        v_daily_rec         RECORD;
        v_first_in          TIMESTAMPTZ;
        v_last_out          TIMESTAMPTZ;
        v_net_minutes       INTEGER := 0;
    BEGIN
        v_now_time_str := TO_CHAR(v_now_ts AT TIME ZONE 'Asia/Kolkata', 'HH24:MI:SS');

        -- Resolve Employee Name
        SELECT * INTO v_emp_record FROM public.employees WHERE id = p_employee_id LIMIT 1;
        IF FOUND THEN
            v_emp_name := COALESCE(
                v_emp_record.full_name,
                v_emp_record.personal->>'full_name',
                v_emp_record.personal->>'name',
                p_employee_id
            );
        END IF;

        -- 1. Anti-Spoofing / Mock Location Validation
        IF p_mock_location_detected = TRUE THEN
            INSERT INTO public.attendance_location_events (
                tenant_id, organization_id, employee_id, work_location_id, event_type, geofence_status,
                latitude, longitude, accuracy_meters, distance_meters, device_timestamp, server_timestamp, source, metadata
            ) VALUES (
                p_tenant_id, p_org_id, p_employee_id, p_work_location_id, 'MOCK_LOCATION', 'MOCK_LOCATION',
                COALESCE(p_latitude, 0), COALESCE(p_longitude, 0), p_accuracy_meters, 0, p_device_timestamp, v_now_ts, 'MOBILE_GPS',
                jsonb_build_object('reason', 'Mock or simulated GPS provider detected on client device', 'attempt_id', p_attempt_id)
            );
            RAISE EXCEPTION 'Mock location / GPS spoofing detected. Attendance rejected.';
        END IF;

        -- 2. Resolve Target Work Location (if not provided or finding nearest authorized)
        IF p_work_location_id IS NOT NULL THEN
            SELECT * INTO v_loc FROM public.work_locations WHERE id = p_work_location_id AND tenant_id = p_tenant_id;
            IF v_loc IS NOT NULL THEN
                v_lat1_rad := RADIANS(p_latitude);
                v_lat2_rad := RADIANS(v_loc.latitude);
                v_delta_lat := RADIANS(v_loc.latitude - p_latitude);
                v_delta_lon := RADIANS(v_loc.longitude - p_longitude);

                v_a := (SIN(v_delta_lat / 2.0) * SIN(v_delta_lat / 2.0)) + 
                    (COS(v_lat1_rad) * COS(v_lat2_rad) * SIN(v_delta_lon / 2.0) * SIN(v_delta_lon / 2.0));
                v_c := 2.0 * ATAN2(SQRT(v_a), SQRT(1.0 - v_a));
                v_distance_meters := ROUND((6371000.0 * v_c)::NUMERIC, 2);
                v_best_loc := v_loc;
                v_best_distance := v_distance_meters;
            END IF;
        ELSE
            -- Evaluate against all authorized locations to find the nearest
            FOR v_loc IN 
                SELECT * FROM public.fn_get_employee_authorized_locations(p_tenant_id, p_employee_id)
            LOOP
                v_lat1_rad := RADIANS(p_latitude);
                v_lat2_rad := RADIANS(v_loc.latitude);
                v_delta_lat := RADIANS(v_loc.latitude - p_latitude);
                v_delta_lon := RADIANS(v_loc.longitude - p_longitude);

                v_a := (SIN(v_delta_lat / 2.0) * SIN(v_delta_lat / 2.0)) + 
                    (COS(v_lat1_rad) * COS(v_lat2_rad) * SIN(v_delta_lon / 2.0) * SIN(v_delta_lon / 2.0));
                v_c := 2.0 * ATAN2(SQRT(v_a), SQRT(1.0 - v_a));
                v_distance_meters := ROUND((6371000.0 * v_c)::NUMERIC, 2);

                IF v_distance_meters < v_best_distance THEN
                    v_best_distance := v_distance_meters;
                    v_best_loc := v_loc;
                END IF;
            END LOOP;
            v_distance_meters := v_best_distance;
        END IF;

        IF v_best_loc IS NULL THEN
            INSERT INTO public.attendance_location_events (
                tenant_id, organization_id, employee_id, event_type, geofence_status,
                latitude, longitude, accuracy_meters, distance_meters, device_timestamp, server_timestamp, source, metadata
            ) VALUES (
                p_tenant_id, p_org_id, p_employee_id, 'UNAUTHORIZED_WORK_LOCATION', 'UNAUTHORIZED',
                p_latitude, p_longitude, p_accuracy_meters, 0, p_device_timestamp, v_now_ts, 'MOBILE_GPS',
                jsonb_build_object('reason', 'No authorized active work locations found for employee')
            );
            RAISE EXCEPTION 'No authorized work location found for your profile. Contact HR.';
        END IF;

        -- 3. Validate GPS Accuracy Threshold
        IF p_accuracy_meters > v_best_loc.accuracy_requirement_meters THEN
            INSERT INTO public.attendance_location_events (
                tenant_id, organization_id, employee_id, work_location_id, event_type, geofence_status,
                latitude, longitude, accuracy_meters, distance_meters, device_timestamp, server_timestamp, source, metadata
            ) VALUES (
                p_tenant_id, p_org_id, p_employee_id, v_best_loc.location_id, 'LOW_ACCURACY', 'GPS_INACCURATE',
                p_latitude, p_longitude, p_accuracy_meters, v_distance_meters, p_device_timestamp, v_now_ts, 'MOBILE_GPS',
                jsonb_build_object('accuracy', p_accuracy_meters, 'threshold', v_best_loc.accuracy_requirement_meters, 'location_name', v_best_loc.location_name)
            );
            RAISE EXCEPTION 'GPS accuracy (±%m) is too low. Required accuracy is ≤%m. Move outdoors and try again.', 
                ROUND(p_accuracy_meters, 1), ROUND(v_best_loc.accuracy_requirement_meters, 1);
        END IF;

        -- 4. Validate Geofence Radius
        IF v_distance_meters > v_best_loc.geofence_radius_meters THEN
            v_geofence_status := 'OUTSIDE';
            v_event_type := 'OUTSIDE_GEOFENCE';

            INSERT INTO public.attendance_location_events (
                tenant_id, organization_id, employee_id, work_location_id, event_type, geofence_status,
                latitude, longitude, accuracy_meters, distance_meters, device_timestamp, server_timestamp, source, metadata
            ) VALUES (
                p_tenant_id, p_org_id, p_employee_id, v_best_loc.location_id, v_event_type, v_geofence_status,
                p_latitude, p_longitude, p_accuracy_meters, v_distance_meters, p_device_timestamp, v_now_ts, 'MOBILE_GPS',
                jsonb_build_object('distance', v_distance_meters, 'radius', v_best_loc.geofence_radius_meters, 'location_name', v_best_loc.location_name)
            );

            RAISE EXCEPTION 'You are outside the authorized attendance zone (%m away from %; allowed radius: %m).', 
                ROUND(v_distance_meters, 1), v_best_loc.location_name, ROUND(v_best_loc.geofence_radius_meters, 1);
        ELSE
            v_geofence_status := 'INSIDE';
        END IF;

        -- 5. Record Authoritative Punch in `attendance_punches`
        v_event_type := CASE WHEN p_punch_type = 'CHECK_OUT' THEN 'PUNCH_CHECK_OUT' ELSE 'PUNCH_CHECK_IN' END;

        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_punches') THEN
            INSERT INTO public.attendance_punches (
                id, organization_id, employee_id, employee_name, punch_time, punch_date,
                punch_type, source, device_id, location_name, latitude, longitude,
                accuracy_meters, distance_meters, is_valid, created_at
            ) VALUES (
                v_punch_id, p_org_id, p_employee_id, v_emp_name, v_now_ts, v_today_date,
                CASE WHEN p_punch_type = 'CHECK_OUT' THEN 'OUT' ELSE 'IN' END,
                'MOBILE_GPS', COALESCE(p_device_info->>'deviceId', 'MOBILE_APP'),
                v_best_loc.location_name, p_latitude, p_longitude,
                p_accuracy_meters, v_distance_meters, TRUE, v_now_ts
            );
        END IF;

        -- 6. Update `attendance_daily` / `attendance_daily_summary`
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_daily') THEN
            SELECT * INTO v_daily_rec FROM public.attendance_daily 
            WHERE employee_id = p_employee_id AND date = v_today_date;

            IF NOT FOUND THEN
                INSERT INTO public.attendance_daily (
                    employee_id, date, status, first_check_in, last_check_out,
                    total_working_minutes, net_working_minutes, is_approved_leave, notes, created_at, updated_at
                ) VALUES (
                    p_employee_id, v_today_date, 'Present', v_now_ts, 
                    CASE WHEN p_punch_type = 'CHECK_OUT' THEN v_now_ts ELSE NULL END,
                    0, 0, FALSE, 'Clocked via Mobile GPS (' || v_best_loc.location_name || ')', v_now_ts, v_now_ts
                );
            ELSE
                v_first_in := COALESCE(v_daily_rec.first_check_in, v_now_ts);
                v_last_out := CASE WHEN p_punch_type = 'CHECK_OUT' THEN v_now_ts ELSE v_daily_rec.last_check_out END;
                
                IF v_last_out IS NOT NULL AND v_first_in IS NOT NULL THEN
                    v_net_minutes := GREATEST(0, EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 60)::INTEGER;
                END IF;

                UPDATE public.attendance_daily
                SET status = 'Present',
                    first_check_in = v_first_in,
                    last_check_out = v_last_out,
                    net_working_minutes = v_net_minutes,
                    total_working_minutes = v_net_minutes,
                    notes = 'Updated via Mobile GPS (' || v_best_loc.location_name || ')',
                    updated_at = v_now_ts
                WHERE employee_id = p_employee_id AND date = v_today_date;
            END IF;
        END IF;

        -- 7. Record Location Event in Audit Log
        INSERT INTO public.attendance_location_events (
            tenant_id, organization_id, employee_id, work_location_id, event_type, geofence_status, face_status,
            latitude, longitude, accuracy_meters, distance_meters, device_timestamp, server_timestamp, source, device_info, metadata
        ) VALUES (
            p_tenant_id, p_org_id, p_employee_id, v_best_loc.location_id, v_event_type, v_geofence_status, p_face_verification_status,
            p_latitude, p_longitude, p_accuracy_meters, v_distance_meters, p_device_timestamp, v_now_ts, 'MOBILE_GPS',
            p_device_info, jsonb_build_object(
                'attempt_id', p_attempt_id,
                'punch_id', v_punch_id,
                'location_name', v_best_loc.location_name,
                'radius_meters', v_best_loc.geofence_radius_meters,
                'punch_type', p_punch_type
            )
        );

        -- 8. Return Authoritative Response Payload
        RETURN jsonb_build_object(
            'success', TRUE,
            'punch_id', v_punch_id,
            'punch_type', p_punch_type,
            'employee_id', p_employee_id,
            'employee_name', v_emp_name,
            'work_location_id', v_best_loc.location_id,
            'location_name', v_best_loc.location_name,
            'distance_meters', v_distance_meters,
            'geofence_radius_meters', v_best_loc.geofence_radius_meters,
            'accuracy_meters', p_accuracy_meters,
            'geofence_status', v_geofence_status,
            'punch_time', v_now_time_str,
            'punch_date', v_today_date,
            'server_timestamp', v_now_ts,
            'source', 'MOBILE_GPS',
            'attempt_id', p_attempt_id,
            'message', 'Attendance punch verified and recorded successfully.'
        );
    END;
    $$;

    -- Security Grants
    GRANT EXECUTE ON FUNCTION public.fn_get_employee_authorized_locations(VARCHAR, VARCHAR) TO anon, authenticated, service_role, public;
    GRANT EXECUTE ON FUNCTION public.fn_validate_and_record_gps_attendance(VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, BOOLEAN, VARCHAR, JSONB, UUID) TO anon, authenticated, service_role, public;
