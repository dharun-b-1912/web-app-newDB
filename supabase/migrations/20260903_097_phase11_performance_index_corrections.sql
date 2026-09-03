-- ============================================================================
-- Migration: 20260903_097_phase11_performance_index_corrections.sql
-- Description: Phase 11 Pass 2 Targeted High-Frequency Query Index Acceleration
-- Scope: Covers priority query filters identified in Phase 11 Forensic Audit:
--   1. employees(organization_id, status)
--   2. attendance_events(employee_id, "timestamp" DESC)
--   3. leave_requests(organization_id, employee_id, status)
--   4. leave_ledger_transactions(organization_id, employee_id, created_at DESC)
-- Non-Destructive: Uses IF NOT EXISTS and column verification guards.
-- ============================================================================

DO $$
BEGIN
    -- 1. High-frequency active employee filter index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'organization_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_employees_org_status_opt 
        ON public.employees (organization_id, status);
    END IF;

    -- 2. Biometric punch timeline index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'attendance_events' AND column_name = 'employee_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'attendance_events' AND column_name = 'timestamp'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_att_events_emp_time_desc_opt 
        ON public.attendance_events (employee_id, "timestamp" DESC);
    END IF;

    -- 3. Leave request employee status filter index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'organization_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'employee_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_leave_req_org_emp_status_opt 
        ON public.leave_requests (organization_id, employee_id, status);
    END IF;

    -- 4. Leave ledger transaction audit timeline index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leave_ledger_transactions' AND column_name = 'organization_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leave_ledger_transactions' AND column_name = 'employee_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leave_ledger_transactions' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_leave_ledger_org_emp_created_opt 
        ON public.leave_ledger_transactions (organization_id, employee_id, created_at DESC);
    END IF;
END $$;
