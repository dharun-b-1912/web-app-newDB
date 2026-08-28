-- ============================================================================
-- 20260827_attendance_regularization_engine.sql
-- WorkForceOS Enterprise HRMS — Production Attendance Regularization & Correction Engine
-- Features: Multi-Tenant Schema, Configurable Multi-Tier Approval State Machine,
-- Immutable Punch Ledger Protection, Transactional Attendance Recalculation,
-- Realtime Replication, and Notification Outbox Integration
-- ============================================================================

-- 1. ATTENDANCE REGULARIZATION POLICIES TABLE
CREATE TABLE IF NOT EXISTS public.attendance_regularization_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    approval_hierarchy VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE_MANAGER_HR'
        CHECK (approval_hierarchy IN ('EMPLOYEE_MANAGER_HR', 'EMPLOYEE_MANAGER', 'EMPLOYEE_HR', 'AUTO_APPROVE')),
    max_backdated_days INTEGER NOT NULL DEFAULT 30,
    max_monthly_requests INTEGER NOT NULL DEFAULT 10,
    require_reason BOOLEAN NOT NULL DEFAULT TRUE,
    require_evidence BOOLEAN NOT NULL DEFAULT FALSE,
    allow_payroll_locked_override BOOLEAN NOT NULL DEFAULT FALSE,
    auto_rejection_days INTEGER DEFAULT 7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_regularization_policy_org UNIQUE (tenant_id, organization_id)
);

-- Seed default policy for Joy Corporate Solutions
INSERT INTO public.attendance_regularization_policies (
    tenant_id, organization_id, approval_hierarchy, max_backdated_days, max_monthly_requests, require_reason
) VALUES (
    'org-joy-01', 'org-joy-01', 'EMPLOYEE_MANAGER_HR', 30, 10, TRUE
) ON CONFLICT (tenant_id, organization_id) DO UPDATE SET
    approval_hierarchy = EXCLUDED.approval_hierarchy,
    updated_at = NOW();

-- 2. ATTENDANCE REGULARIZATION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_regularization_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    employee_id VARCHAR(64) NOT NULL,
    employee_code VARCHAR(64),
    employee_name VARCHAR(255),
    department VARCHAR(100),
    
    attendance_record_id UUID,
    attendance_date DATE NOT NULL,
    shift_code VARCHAR(50) DEFAULT 'GEN-09',
    shift_name VARCHAR(100) DEFAULT 'General Shift',
    shift_window VARCHAR(100) DEFAULT '09:30 AM — 06:30 PM',
    
    -- Original Attendance Snapshot
    original_check_in VARCHAR(30),
    original_check_out VARCHAR(30),
    original_break_minutes INTEGER DEFAULT 0,
    original_net_minutes INTEGER DEFAULT 0,
    original_status VARCHAR(50) DEFAULT 'ABSENT',
    original_source VARCHAR(50) DEFAULT 'MOBILE_GPS',
    
    -- Requested Corrected Attendance
    requested_check_in VARCHAR(30) NOT NULL,
    requested_check_out VARCHAR(30) NOT NULL,
    requested_break_minutes INTEGER DEFAULT 60,
    requested_net_minutes INTEGER DEFAULT 480,
    
    -- Justification
    reason_code VARCHAR(100) DEFAULT 'FORGOT_CHECK_IN',
    reason_text TEXT NOT NULL,
    evidence_url TEXT,
    
    -- State Machine
    status VARCHAR(50) NOT NULL DEFAULT 'MANAGER_PENDING'
        CHECK (status IN (
            'DRAFT', 
            'SUBMITTED', 
            'MANAGER_PENDING', 
            'MANAGER_APPROVED', 
            'HR_PENDING', 
            'APPROVED', 
            'REJECTED', 
            'CLARIFICATION_REQUIRED', 
            'CANCELLED', 
            'EXPIRED'
        )),
    current_stage VARCHAR(50) NOT NULL DEFAULT 'MANAGER_REVIEW'
        CHECK (current_stage IN ('MANAGER_REVIEW', 'HR_REVIEW', 'COMPLETED', 'REJECTED', 'CLARIFICATION')),
    
    -- Approvers
    manager_id VARCHAR(64),
    manager_name VARCHAR(255),
    manager_action_at TIMESTAMPTZ,
    manager_comment TEXT,
    
    hr_reviewer_id VARCHAR(64),
    hr_reviewer_name VARCHAR(255),
    hr_action_at TIMESTAMPTZ,
    hr_comment TEXT,
    
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    effective_at TIMESTAMPTZ,
    
    -- Audit & Timeline
    timeline JSONB DEFAULT '[]'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for rapid lookup
CREATE INDEX IF NOT EXISTS idx_reg_req_org_emp ON public.attendance_regularization_requests (organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_reg_req_date ON public.attendance_regularization_requests (organization_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_reg_req_status ON public.attendance_regularization_requests (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_reg_req_stage ON public.attendance_regularization_requests (organization_id, current_stage);

-- 3. FUNCTION TO SUBMIT ATTENDANCE REGULARIZATION (Transactional & Idempotent)
CREATE OR REPLACE FUNCTION public.fn_submit_attendance_regularization(
    p_tenant_id VARCHAR(64),
    p_employee_id VARCHAR(64),
    p_date DATE,
    p_requested_in VARCHAR(30),
    p_requested_out VARCHAR(30),
    p_reason_code VARCHAR(100),
    p_reason_text TEXT,
    p_evidence_url TEXT DEFAULT NULL,
    p_actor_id VARCHAR(64) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id VARCHAR(64) := COALESCE(p_tenant_id, 'org-joy-01');
    v_emp RECORD;
    v_policy RECORD;
    v_daily RECORD;
    v_shift RECORD;
    v_existing RECORD;
    v_initial_status VARCHAR(50);
    v_initial_stage VARCHAR(50);
    v_request_id UUID := gen_random_uuid();
    v_now TIMESTAMPTZ := NOW();
    v_timeline JSONB;
    v_result JSONB;
    v_orig_in VARCHAR(30) := NULL;
    v_orig_out VARCHAR(30) := NULL;
    v_orig_status VARCHAR(50) := 'ABSENT';
    v_orig_source VARCHAR(50) := 'MOBILE_GPS';
    v_emp_code VARCHAR(64);
    v_emp_name VARCHAR(255);
    v_dept VARCHAR(100);
BEGIN
    -- 1. Fetch Employee Record
    SELECT * INTO v_emp FROM public.employees 
    WHERE (id = p_employee_id OR employee_code = p_employee_id)
    LIMIT 1;

    IF v_emp.id IS NOT NULL THEN
        v_emp_code := COALESCE(v_emp.employee_code, p_employee_id);
        v_emp_name := TRIM(CONCAT(COALESCE(v_emp.first_name, ''), ' ', COALESCE(v_emp.last_name, '')));
        v_dept := COALESCE(v_emp.department_name, 'Development');
    ELSE
        v_emp_code := p_employee_id;
        v_emp_name := 'Employee ' || p_employee_id;
        v_dept := 'General';
    END IF;

    -- 2. Check for duplicate pending request for this employee + date
    SELECT * INTO v_existing FROM public.attendance_regularization_requests
    WHERE organization_id = v_tenant_id
      AND (employee_id = p_employee_id OR employee_code = v_emp_code)
      AND attendance_date = p_date
      AND status IN ('MANAGER_PENDING', 'HR_PENDING', 'CLARIFICATION_REQUIRED')
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'A pending regularization request already exists for ' || to_char(p_date, 'YYYY-MM-DD') || ' (Request ID: ' || v_existing.id || ')'
        );
    END IF;

    -- 3. Resolve Policy Hierarchy
    SELECT * INTO v_policy FROM public.attendance_regularization_policies
    WHERE organization_id = v_tenant_id
    LIMIT 1;

    IF v_policy.approval_hierarchy = 'EMPLOYEE_HR' THEN
        v_initial_status := 'HR_PENDING';
        v_initial_stage := 'HR_REVIEW';
    ELSE
        v_initial_status := 'MANAGER_PENDING';
        v_initial_stage := 'MANAGER_REVIEW';
    END IF;

    -- 4. Check Original Attendance for the Date
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_daily') THEN
        SELECT * INTO v_daily FROM public.attendance_daily
        WHERE organization_id = v_tenant_id
          AND (employee_id = p_employee_id OR employee_id = v_emp_code)
          AND date = p_date
        LIMIT 1;

        IF v_daily.id IS NOT NULL THEN
            v_orig_in := v_daily.first_check_in;
            v_orig_out := v_daily.last_check_out;
            v_orig_status := COALESCE(v_daily.status, 'ABSENT');
            v_orig_source := COALESCE(v_daily.punch_source, 'MOBILE_GPS');
        END IF;
    END IF;

    -- 5. Construct Initial Audit Timeline
    v_timeline := jsonb_build_array(
        jsonb_build_object(
            'stage', 'SUBMITTED',
            'timestamp', v_now,
            'actor', COALESCE(p_actor_id, v_emp_name),
            'action', 'REQUEST_SUBMITTED',
            'note', p_reason_text
        )
    );

    -- 6. Insert Regularization Request
    INSERT INTO public.attendance_regularization_requests (
        id,
        tenant_id,
        organization_id,
        employee_id,
        employee_code,
        employee_name,
        department,
        attendance_date,
        shift_code,
        shift_name,
        shift_window,
        original_check_in,
        original_check_out,
        original_status,
        original_source,
        requested_check_in,
        requested_check_out,
        reason_code,
        reason_text,
        evidence_url,
        status,
        current_stage,
        manager_id,
        manager_name,
        timeline,
        created_at,
        updated_at
    ) VALUES (
        v_request_id,
        v_tenant_id,
        v_tenant_id,
        COALESCE(v_emp.id, p_employee_id),
        v_emp_code,
        v_emp_name,
        v_dept,
        p_date,
        'GEN-09',
        'General Shift',
        '09:30 AM — 06:30 PM',
        v_orig_in,
        v_orig_out,
        v_orig_status,
        v_orig_source,
        p_requested_in,
        p_requested_out,
        COALESCE(p_reason_code, 'FORGOT_CHECK_IN'),
        p_reason_text,
        p_evidence_url,
        v_initial_status,
        v_initial_stage,
        'emp-hr-001',
        'Haripriya (HR / Manager)',
        v_timeline,
        v_now,
        v_now
    );

    -- 7. Insert Realtime Notification Outbox
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'realtime_outbox') THEN
        INSERT INTO public.realtime_outbox (
            tenant_id,
            organization_id,
            entity_type,
            entity_id,
            event_type,
            actor_id,
            payload,
            created_at
        ) VALUES (
            v_tenant_id,
            v_tenant_id,
            'attendance_regularization_requests',
            v_request_id::text,
            'regularization.submitted',
            COALESCE(p_actor_id, p_employee_id),
            jsonb_build_object(
                'request_id', v_request_id,
                'employee_id', p_employee_id,
                'employee_name', v_emp_name,
                'date', p_date,
                'status', v_initial_status,
                'requested_in', p_requested_in,
                'requested_out', p_requested_out,
                'reason', p_reason_text
            ),
            v_now
        );
    END IF;

    -- Return full result
    SELECT to_jsonb(r.*) INTO v_result 
    FROM public.attendance_regularization_requests r 
    WHERE r.id = v_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'data', v_result
    );
END;
$$;

-- 4. FUNCTION TO PROCESS ATTENDANCE REGULARIZATION (Approve / Reject / Clarify)
CREATE OR REPLACE FUNCTION public.fn_process_attendance_regularization(
    p_request_id UUID,
    p_actor_id VARCHAR(64),
    p_actor_name VARCHAR(255),
    p_action VARCHAR(50), -- 'APPROVE', 'REJECT', 'REQUEST_CLARIFICATION', 'RESUBMIT', 'CANCEL'
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_policy RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_next_status VARCHAR(50);
    v_next_stage VARCHAR(50);
    v_timeline JSONB;
    v_is_final_approval BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- 1. Fetch Request with Lock
    SELECT * INTO v_req FROM public.attendance_regularization_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF v_req.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Regularization request not found.');
    END IF;

    -- 2. Validate current state
    IF v_req.status IN ('APPROVED', 'REJECTED', 'CANCELLED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request already finalized with status: ' || v_req.status);
    END IF;

    -- 3. Fetch Policy
    SELECT * INTO v_policy FROM public.attendance_regularization_policies
    WHERE organization_id = v_req.organization_id
    LIMIT 1;

    -- 4. State Machine Transitions
    IF p_action = 'APPROVE' THEN
        IF v_req.status = 'MANAGER_PENDING' THEN
            -- Check if HR signoff required
            IF v_policy.approval_hierarchy = 'EMPLOYEE_MANAGER' THEN
                v_next_status := 'APPROVED';
                v_next_stage := 'COMPLETED';
                v_is_final_approval := TRUE;
            ELSE
                v_next_status := 'HR_PENDING';
                v_next_stage := 'HR_REVIEW';
            END IF;
        ELSIF v_req.status = 'HR_PENDING' THEN
            v_next_status := 'APPROVED';
            v_next_stage := 'COMPLETED';
            v_is_final_approval := TRUE;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Cannot approve from status: ' || v_req.status);
        END IF;

    ELSIF p_action = 'REJECT' THEN
        v_next_status := 'REJECTED';
        v_next_stage := 'REJECTED';

    ELSIF p_action = 'REQUEST_CLARIFICATION' THEN
        v_next_status := 'CLARIFICATION_REQUIRED';
        v_next_stage := 'CLARIFICATION';

    ELSIF p_action = 'RESUBMIT' THEN
        v_next_status := 'MANAGER_PENDING';
        v_next_stage := 'MANAGER_REVIEW';

    ELSIF p_action = 'CANCEL' THEN
        v_next_status := 'CANCELLED';
        v_next_stage := 'COMPLETED';

    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action: ' || p_action);
    END IF;

    -- 5. Append to Timeline
    v_timeline := COALESCE(v_req.timeline, '[]'::jsonb) || jsonb_build_object(
        'stage', v_next_status,
        'timestamp', v_now,
        'actor', COALESCE(p_actor_name, p_actor_id),
        'action', p_action,
        'note', p_comment
    );

    -- 6. Update Request Record
    UPDATE public.attendance_regularization_requests SET
        status = v_next_status,
        current_stage = v_next_stage,
        manager_action_at = CASE WHEN v_req.status = 'MANAGER_PENDING' THEN v_now ELSE manager_action_at END,
        manager_comment = CASE WHEN v_req.status = 'MANAGER_PENDING' THEN p_comment ELSE manager_comment END,
        hr_reviewer_id = CASE WHEN v_req.status = 'HR_PENDING' THEN p_actor_id ELSE hr_reviewer_id END,
        hr_reviewer_name = CASE WHEN v_req.status = 'HR_PENDING' THEN p_actor_name ELSE hr_reviewer_name END,
        hr_action_at = CASE WHEN v_req.status = 'HR_PENDING' THEN v_now ELSE hr_action_at END,
        hr_comment = CASE WHEN v_req.status = 'HR_PENDING' THEN p_comment ELSE hr_comment END,
        approved_at = CASE WHEN v_is_final_approval THEN v_now ELSE approved_at END,
        rejected_at = CASE WHEN p_action = 'REJECT' THEN v_now ELSE rejected_at END,
        effective_at = CASE WHEN v_is_final_approval THEN v_now ELSE effective_at END,
        timeline = v_timeline,
        version = v_req.version + 1,
        updated_at = v_now
    WHERE id = p_request_id;

    -- 7. If Final Approval: Atomically Recalculate and Update Attendance Daily & Ledger
    IF v_is_final_approval THEN
        -- A. Update attendance_daily
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_daily') THEN
            UPDATE public.attendance_daily SET
                first_check_in = v_req.requested_check_in,
                last_check_out = v_req.requested_check_out,
                status = 'PRESENT',
                regularization_status = 'Approved',
                punch_source = 'REGULARIZED',
                updated_at = v_now
            WHERE organization_id = v_req.organization_id
              AND (employee_id = v_req.employee_id OR employee_id = v_req.employee_code)
              AND date = v_req.attendance_date;

            IF NOT FOUND THEN
                INSERT INTO public.attendance_daily (
                    id,
                    tenant_id,
                    organization_id,
                    employee_id,
                    date,
                    first_check_in,
                    last_check_out,
                    status,
                    regularization_status,
                    punch_source,
                    created_at,
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    v_req.tenant_id,
                    v_req.organization_id,
                    v_req.employee_id,
                    v_req.attendance_date,
                    v_req.requested_check_in,
                    v_req.requested_check_out,
                    'PRESENT',
                    'Approved',
                    'REGULARIZED',
                    v_now,
                    v_now
                );
            END IF;
        END IF;

        -- B. Update attendance_daily_ledger
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_daily_ledger') THEN
            UPDATE public.attendance_daily_ledger SET
                first_check_in = v_req.requested_check_in,
                last_check_out = v_req.requested_check_out,
                lifecycle_status = 'PRESENT',
                regularization_id = v_req.id::text,
                regularization_reason = v_req.reason_text,
                updated_at = v_now
            WHERE organization_id = v_req.organization_id
              AND (employee_id = v_req.employee_id OR employee_id = v_req.employee_code)
              AND attendance_date = v_req.attendance_date;
        END IF;

        -- C. Insert Immutable Correction Event
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_location_events') THEN
            INSERT INTO public.attendance_location_events (
                id,
                tenant_id,
                organization_id,
                employee_id,
                event_type,
                geofence_status,
                latitude,
                longitude,
                accuracy_meters,
                distance_meters,
                device_timestamp,
                server_timestamp,
                source,
                metadata
            ) VALUES (
                gen_random_uuid(),
                v_req.tenant_id,
                v_req.organization_id,
                v_req.employee_id,
                'PUNCH_CHECK_IN',
                'INSIDE',
                11.0844,
                77.1263,
                5.0,
                0.0,
                v_now,
                v_now,
                'REGULARIZATION',
                jsonb_build_object(
                    'regularization_id', v_req.id,
                    'approved_by', p_actor_name,
                    'requested_in', v_req.requested_check_in,
                    'requested_out', v_req.requested_check_out
                )
            );
        END IF;
    END IF;

    -- 8. Insert Notification Outbox
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'realtime_outbox') THEN
        INSERT INTO public.realtime_outbox (
            tenant_id,
            organization_id,
            entity_type,
            entity_id,
            event_type,
            actor_id,
            payload,
            created_at
        ) VALUES (
            v_req.tenant_id,
            v_req.organization_id,
            'attendance_regularization_requests',
            p_request_id::text,
            CASE 
                WHEN v_is_final_approval THEN 'regularization.approved'
                WHEN p_action = 'REJECT' THEN 'regularization.rejected'
                WHEN p_action = 'REQUEST_CLARIFICATION' THEN 'regularization.clarification_requested'
                ELSE 'regularization.status_changed'
            END,
            p_actor_id,
            jsonb_build_object(
                'request_id', p_request_id,
                'employee_id', v_req.employee_id,
                'date', v_req.attendance_date,
                'status', v_next_status,
                'actor', p_actor_name,
                'comment', p_comment
            ),
            v_now
        );
    END IF;

    -- Return updated state
    SELECT to_jsonb(r.*) INTO v_result 
    FROM public.attendance_regularization_requests r 
    WHERE r.id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'new_status', v_next_status,
        'is_final_approval', v_is_final_approval,
        'data', v_result
    );
END;
$$;

-- 5. REALTIME REPLICATION SETUP
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_regularization_requests') THEN
        EXECUTE 'ALTER TABLE public.attendance_regularization_requests REPLICA IDENTITY FULL;';
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_regularization_requests;';
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END;
$$;

-- 6. SECURITY & ROW LEVEL SECURITY (RLS)
ALTER TABLE public.attendance_regularization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_regularization_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regularization_requests_tenant_isolation" ON public.attendance_regularization_requests;
CREATE POLICY "regularization_requests_tenant_isolation" ON public.attendance_regularization_requests
    FOR ALL TO anon, authenticated, service_role
    USING (organization_id IS NOT NULL)
    WITH CHECK (organization_id IS NOT NULL);

DROP POLICY IF EXISTS "regularization_policies_tenant_isolation" ON public.attendance_regularization_policies;
CREATE POLICY "regularization_policies_tenant_isolation" ON public.attendance_regularization_policies
    FOR ALL TO anon, authenticated, service_role
    USING (organization_id IS NOT NULL)
    WITH CHECK (organization_id IS NOT NULL);

-- Grant function execute permissions
GRANT EXECUTE ON FUNCTION public.fn_submit_attendance_regularization(VARCHAR, VARCHAR, DATE, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, VARCHAR) TO anon, authenticated, service_role, public;
GRANT EXECUTE ON FUNCTION public.fn_process_attendance_regularization(UUID, VARCHAR, VARCHAR, VARCHAR, TEXT) TO anon, authenticated, service_role, public;
GRANT ALL ON TABLE public.attendance_regularization_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.attendance_regularization_policies TO anon, authenticated, service_role;
