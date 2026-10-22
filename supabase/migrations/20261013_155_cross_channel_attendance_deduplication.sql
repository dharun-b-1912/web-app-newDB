-- ============================================================================
-- JOY PeopleHR — Migration 155
-- Centralized Cross-Channel Attendance Deduplication & Concurrency Protection
-- "First Valid Check-In Wins Across Biometric, Mobile and Web"
-- ============================================================================

-- 1. Create Diagnostic Ingestion Audit Logs Table
CREATE TABLE IF NOT EXISTS public.attendance_ingestion_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    source VARCHAR(32) NOT NULL, -- 'BIOMETRIC', 'MOBILE', 'WEB', 'MANUAL'
    punch_type VARCHAR(32) NOT NULL DEFAULT 'CHECK_IN', -- 'CHECK_IN', 'CHECK_OUT', 'AUTO'
    verification_mode VARCHAR(32) DEFAULT 'MANUAL', -- 'BIOMETRIC', 'FACE', 'FINGERPRINT', 'GPS', 'MANUAL'
    idempotency_key TEXT,
    device_id TEXT,
    event_timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted BOOLEAN NOT NULL,
    outcome VARCHAR(64) NOT NULL, -- 'ACCEPTED', 'DUPLICATE_CHECK_IN', 'IDEMPOTENT_REPLAY', 'TENANT_MISMATCH', etc.
    reason TEXT,
    existing_source VARCHAR(32),
    existing_punch_time TIMESTAMPTZ,
    raw_payload JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.attendance_ingestion_audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for fast diagnostic queries and tenant filtering
CREATE INDEX IF NOT EXISTS idx_att_audit_org_created 
    ON public.attendance_ingestion_audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_att_audit_emp_date 
    ON public.attendance_ingestion_audit_logs(employee_id, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_att_audit_idempotency 
    ON public.attendance_ingestion_audit_logs(organization_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_att_audit_outcome 
    ON public.attendance_ingestion_audit_logs(organization_id, outcome);

-- RLS Policies for audit logs
DROP POLICY IF EXISTS "attendance_audit_select_tenant" ON public.attendance_ingestion_audit_logs;
CREATE POLICY "attendance_audit_select_tenant" ON public.attendance_ingestion_audit_logs
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "attendance_audit_service_role" ON public.attendance_ingestion_audit_logs;
CREATE POLICY "attendance_audit_service_role" ON public.attendance_ingestion_audit_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Enhance attendance_punches schema with idempotency and session dates
ALTER TABLE public.attendance_punches ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.attendance_punches ADD COLUMN IF NOT EXISTS attendance_date DATE;
ALTER TABLE public.attendance_punches ADD COLUMN IF NOT EXISTS punch_source TEXT NOT NULL DEFAULT 'WEB';

-- Backfill attendance_date for existing punches if null
UPDATE public.attendance_punches
SET attendance_date = (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE
WHERE attendance_date IS NULL;

-- 3. Unique Idempotency Constraint on attendance_punches
CREATE UNIQUE INDEX IF NOT EXISTS uq_punches_idempotency_key
    ON public.attendance_punches (organization_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- 4. Database-Enforced Session Uniqueness Constraint:
-- Strictly ONE accepted CHECK_IN punch per employee per attendance session date!
CREATE UNIQUE INDEX IF NOT EXISTS uq_punches_single_checkin
    ON public.attendance_punches (employee_id, attendance_date)
    WHERE (punch_type = 'CHECK_IN');

-- 5. Helper Function: Determine Attendance Session Date (Aware of Timezone & Overnight Shifts)
CREATE OR REPLACE FUNCTION public.fn_determine_attendance_session_date(
    p_employee_id UUID,
    p_punch_time TIMESTAMPTZ
)
RETURNS DATE
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ist_timestamp TIMESTAMP;
    v_punch_date DATE;
    v_punch_time_only TIME;
    v_shift RECORD;
BEGIN
    -- Convert punch to Asia/Kolkata timezone
    v_ist_timestamp := p_punch_time AT TIME ZONE 'Asia/Kolkata';
    v_punch_date := v_ist_timestamp::DATE;
    v_punch_time_only := v_ist_timestamp::TIME;

    -- Look up shift assignment for this employee
    SELECT s.is_overnight, s.start_time, s.end_time
    INTO v_shift
    FROM public.employee_shift_assignments esa
    JOIN public.shifts s ON s.id = esa.shift_id
    WHERE esa.employee_id = p_employee_id
      AND esa.valid_from <= v_punch_date
      AND (esa.valid_to IS NULL OR esa.valid_to >= v_punch_date)
    ORDER BY esa.valid_from DESC
    LIMIT 1;

    -- If shift is overnight (or end_time < start_time), and punch occurred in the early morning before 06:00
    IF v_shift.is_overnight = true OR (v_shift.start_time IS NOT NULL AND v_shift.end_time < v_shift.start_time) THEN
        IF v_punch_time_only < TIME '06:00:00' THEN
            RETURN v_punch_date - INTERVAL '1 day';
        END IF;
    END IF;

    RETURN v_punch_date;
END;
$$;

-- 6. Trigger to ensure attendance_date is always assigned before insert on attendance_punches
CREATE OR REPLACE FUNCTION public.trg_fn_set_punch_attendance_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.attendance_date IS NULL THEN
        NEW.attendance_date := public.fn_determine_attendance_session_date(NEW.employee_id, NEW.punch_time);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_punch_attendance_date ON public.attendance_punches;
CREATE TRIGGER trg_set_punch_attendance_date
BEFORE INSERT ON public.attendance_punches
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_set_punch_attendance_date();

-- 7. Authoritative Shared Ingestion RPC: ingest_attendance_event
-- Enforces:
--  - Source authentication & employee-tenant boundary verification
--  - Advisory transaction lock on (employee_id, session_date) for absolute concurrency safety
--  - Source-event idempotency detection
--  - Cross-channel first-check-in-wins business rule
--  - Authoritative persistence into attendance_punches (which auto-triggers attendance_daily)
--  - Diagnostic audit logging for all accepted and rejected punches
CREATE OR REPLACE FUNCTION public.ingest_attendance_event(
    p_organization_id UUID,
    p_employee_id UUID,
    p_source VARCHAR(32),                         -- 'BIOMETRIC', 'MOBILE', 'WEB', 'MANUAL'
    p_punch_type VARCHAR(20) DEFAULT 'CHECK_IN',  -- 'CHECK_IN', 'CHECK_OUT', 'AUTO'
    p_verification_mode VARCHAR(32) DEFAULT 'MANUAL', -- 'BIOMETRIC', 'FACE', 'FINGERPRINT', 'GPS', 'MANUAL'
    p_punch_time TIMESTAMPTZ DEFAULT now(),
    p_device_id TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL,
    p_raw_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_emp RECORD;
    v_session_date DATE;
    v_session_id TEXT;
    v_device_uuid UUID := NULL;
    v_existing_punch_id UUID := NULL;
    v_existing_source TEXT := NULL;
    v_existing_mode TEXT := NULL;
    v_existing_punch_time TIMESTAMPTZ := NULL;
    v_existing_audit RECORD;
    v_punch_id UUID := NULL;
    v_norm_source VARCHAR(32);
    v_norm_punch_type VARCHAR(20);
    v_norm_mode VARCHAR(32);
BEGIN
    -- Normalize inputs
    v_norm_source := UPPER(COALESCE(p_source, 'WEB'));
    v_norm_punch_type := UPPER(COALESCE(p_punch_type, 'CHECK_IN'));
    v_norm_mode := UPPER(COALESCE(p_verification_mode, 'MANUAL'));

    -- 1. Validate employee and tenant boundary
    SELECT id, organization_id, employment_status, employee_code, first_name, last_name
    INTO v_emp
    FROM public.employees
    WHERE id = p_employee_id;

    IF v_emp.id IS NULL THEN
        -- Log diagnostic failure
        INSERT INTO public.attendance_ingestion_audit_logs (
            organization_id, employee_id, source, punch_type,
            verification_mode, idempotency_key, device_id,
            event_timestamp, received_at, accepted,
            outcome, reason, raw_payload
        ) VALUES (
            p_organization_id, p_employee_id, v_norm_source, v_norm_punch_type,
            v_norm_mode, p_idempotency_key, p_device_id,
            p_punch_time, now(), false,
            'UNKNOWN_EMPLOYEE', 'Employee not found in directory', p_raw_payload
        );

        RETURN jsonb_build_object(
            'accepted', false,
            'outcome', 'UNKNOWN_EMPLOYEE',
            'reason', 'EMPLOYEE_NOT_FOUND',
            'source', v_norm_source
        );
    END IF;

    IF v_emp.organization_id != p_organization_id THEN
        INSERT INTO public.attendance_ingestion_audit_logs (
            organization_id, employee_id, source, punch_type,
            verification_mode, idempotency_key, device_id,
            event_timestamp, received_at, accepted,
            outcome, reason, raw_payload
        ) VALUES (
            p_organization_id, p_employee_id, v_norm_source, v_norm_punch_type,
            v_norm_mode, p_idempotency_key, p_device_id,
            p_punch_time, now(), false,
            'TENANT_MISMATCH', 'Tenant boundary violation: employee does not belong to specified organization', p_raw_payload
        );

        RETURN jsonb_build_object(
            'accepted', false,
            'outcome', 'TENANT_MISMATCH',
            'reason', 'CROSS_TENANT_REJECTED',
            'source', v_norm_source
        );
    END IF;

    -- Validate employment status
    IF v_emp.employment_status IS NOT NULL AND v_emp.employment_status::text IN ('TERMINATED', 'EXITED', 'INACTIVE', 'Terminated', 'Exited', 'Inactive') THEN
        INSERT INTO public.attendance_ingestion_audit_logs (
            organization_id, employee_id, source, punch_type,
            verification_mode, idempotency_key, device_id,
            event_timestamp, received_at, accepted,
            outcome, reason, raw_payload
        ) VALUES (
            p_organization_id, p_employee_id, v_norm_source, v_norm_punch_type,
            v_norm_mode, p_idempotency_key, p_device_id,
            p_punch_time, now(), false,
            'EMPLOYEE_INACTIVE', 'Employee is inactive or exited', p_raw_payload
        );

        RETURN jsonb_build_object(
            'accepted', false,
            'outcome', 'EMPLOYEE_INACTIVE',
            'reason', 'EMPLOYEE_NOT_ACTIVE',
            'source', v_norm_source
        );
    END IF;

    -- 2. Determine Attendance Session Date (Shift & Overnight aware)
    v_session_date := public.fn_determine_attendance_session_date(p_employee_id, p_punch_time);
    v_session_id := 'sess-' || v_session_date::text || '-' || p_employee_id::text;

    -- 3. Concurrency Protection: Transaction Advisory Lock
    -- Blocks simultaneous check-ins for the same employee & session date, guaranteeing strict serialization
    PERFORM pg_advisory_xact_lock(hashtext('attendance_session:' || p_organization_id::text || ':' || p_employee_id::text || ':' || v_session_date::text));

    -- 4. Idempotency Check: Same Source Transaction Retried
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
        SELECT accepted, outcome, reason, existing_source, existing_punch_time
        INTO v_existing_audit
        FROM public.attendance_ingestion_audit_logs
        WHERE organization_id = p_organization_id
          AND idempotency_key = p_idempotency_key
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_existing_audit.outcome IS NOT NULL THEN
            RETURN jsonb_build_object(
                'accepted', v_existing_audit.accepted,
                'outcome', 'IDEMPOTENT_REPLAY',
                'original_outcome', v_existing_audit.outcome,
                'reason', 'REQUEST_ALREADY_PROCESSED',
                'source', v_norm_source,
                'existing_source', v_existing_audit.existing_source,
                'attendance_session_id', v_session_id,
                'attendance_date', v_session_date
            );
        END IF;
    END IF;

    -- 5. Cross-Channel Duplicate Check-in Enforcement
    IF v_norm_punch_type = 'CHECK_IN' THEN
        -- Check attendance_punches for any prior check-in ('CHECK_IN' or 'IN')
        SELECT id, punch_source, verification_mode, punch_time
        INTO v_existing_punch_id, v_existing_source, v_existing_mode, v_existing_punch_time
        FROM public.attendance_punches
        WHERE employee_id = p_employee_id
          AND punch_type IN ('CHECK_IN', 'IN')
          AND attendance_date = v_session_date
        ORDER BY punch_time ASC
        LIMIT 1;

        -- Fallback to attendance_daily if mobile/web check-in was registered directly
        IF v_existing_punch_id IS NULL THEN
            SELECT id, COALESCE(check_in_source, 'MOBILE'), 'GPS', first_check_in
            INTO v_existing_punch_id, v_existing_source, v_existing_mode, v_existing_punch_time
            FROM public.attendance_daily
            WHERE employee_id = p_employee_id
              AND attendance_date = v_session_date
              AND first_check_in IS NOT NULL
            LIMIT 1;
        END IF;

        IF v_existing_punch_id IS NOT NULL THEN
            -- Check-in ALREADY exists for this session! First valid check-in wins!
            -- Suppress duplicate: do NOT insert into attendance_punches or update daily attendance.
            INSERT INTO public.attendance_ingestion_audit_logs (
                organization_id, employee_id, source, punch_type,
                verification_mode, idempotency_key, device_id,
                event_timestamp, received_at, accepted,
                outcome, reason, existing_source, existing_punch_time, raw_payload
            ) VALUES (
                p_organization_id, p_employee_id, v_norm_source, v_norm_punch_type,
                v_norm_mode, p_idempotency_key, p_device_id,
                p_punch_time, now(), false,
                'DUPLICATE_CHECK_IN', 'ATTENDANCE_SESSION_ALREADY_HAS_CHECK_IN',
                COALESCE(v_existing_source, 'UNKNOWN'), v_existing_punch_time, p_raw_payload
            );

            RETURN jsonb_build_object(
                'accepted', false,
                'outcome', 'DUPLICATE_CHECK_IN',
                'reason', 'ATTENDANCE_SESSION_ALREADY_HAS_CHECK_IN',
                'source', v_norm_source,
                'existing_source', COALESCE(v_existing_source, 'UNKNOWN'),
                'existing_punch_time', v_existing_punch_time,
                'attendance_session_id', v_session_id,
                'attendance_date', v_session_date
            );
        END IF;
    END IF;

    -- 6. Resolve Device UUID safely if string is a valid UUID
    IF p_device_id IS NOT NULL AND TRIM(p_device_id) != '' THEN
        BEGIN
            v_device_uuid := p_device_id::UUID;
            IF NOT EXISTS (SELECT 1 FROM public.biometric_devices WHERE id = v_device_uuid) THEN
                v_device_uuid := NULL;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_device_uuid := NULL;
        END;
    END IF;

    -- 7. Persist Authorized Punch atomically
    BEGIN
        INSERT INTO public.attendance_punches (
            organization_id, employee_id, device_id, punch_time,
            punch_type, verification_mode, punch_source,
            latitude, longitude, attendance_date, idempotency_key
        ) VALUES (
            p_organization_id, p_employee_id, v_device_uuid, p_punch_time,
            v_norm_punch_type, v_norm_mode, v_norm_source,
            p_latitude, p_longitude, v_session_date, p_idempotency_key
        ) RETURNING id INTO v_punch_id;

        -- Record Accepted Audit Log
        INSERT INTO public.attendance_ingestion_audit_logs (
            organization_id, employee_id, source, punch_type,
            verification_mode, idempotency_key, device_id,
            event_timestamp, received_at, accepted,
            outcome, reason, raw_payload
        ) VALUES (
            p_organization_id, p_employee_id, v_norm_source, v_norm_punch_type,
            v_norm_mode, p_idempotency_key, p_device_id,
            p_punch_time, now(), true,
            'ACCEPTED', 'Attendance punch accepted and persisted', p_raw_payload
        );

        RETURN jsonb_build_object(
            'accepted', true,
            'outcome', 'ACCEPTED',
            'punch_id', v_punch_id,
            'source', v_norm_source,
            'punch_type', v_norm_punch_type,
            'punch_time', p_punch_time,
            'attendance_session_id', v_session_id,
            'attendance_date', v_session_date
        );

    EXCEPTION WHEN unique_violation THEN
        -- Handled rare concurrent race condition caught by database unique index
        INSERT INTO public.attendance_ingestion_audit_logs (
            organization_id, employee_id, source, punch_type,
            verification_mode, idempotency_key, device_id,
            event_timestamp, received_at, accepted,
            outcome, reason, raw_payload
        ) VALUES (
            p_organization_id, p_employee_id, v_norm_source, v_norm_punch_type,
            v_norm_mode, p_idempotency_key, p_device_id,
            p_punch_time, now(), false,
            'DUPLICATE_CHECK_IN', 'Concurrent check-in rejected by database uniqueness constraint', p_raw_payload
        );

        RETURN jsonb_build_object(
            'accepted', false,
            'outcome', 'DUPLICATE_CHECK_IN',
            'reason', 'ATTENDANCE_SESSION_ALREADY_HAS_CHECK_IN',
            'source', v_norm_source,
            'attendance_session_id', v_session_id,
            'attendance_date', v_session_date
        );
    END;
END;
$$;

-- Grant permissions on RPC
GRANT EXECUTE ON FUNCTION public.ingest_attendance_event TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_determine_attendance_session_date TO authenticated, service_role, anon;
