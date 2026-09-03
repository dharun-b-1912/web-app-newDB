-- ============================================================================
-- Migration: 20260903_096_phase11_core_integrity_hardening.sql
-- Description: Phase 11 Pass 2 Core Relational Integrity Hardening
-- Scope: Ensures timestamp defaults and date sanity CHECK constraints
--        across canonical core tables without modifying immutable event schemas.
-- Non-Destructive: Uses idempotent column checks and ALTER TABLE guards.
-- ============================================================================

DO $$
BEGIN
    -- 1. Date range sanity check on leave_requests (to_date >= from_date)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'leave_requests'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
              AND table_name = 'leave_requests' 
              AND constraint_name = 'chk_leave_dates_valid'
        ) THEN
            -- Check for canonical from_date and to_date columns
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'to_date'
            ) AND EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'from_date'
            ) THEN
                ALTER TABLE public.leave_requests 
                ADD CONSTRAINT chk_leave_dates_valid 
                CHECK (to_date >= from_date);
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'end_date'
            ) AND EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'start_date'
            ) THEN
                ALTER TABLE public.leave_requests 
                ADD CONSTRAINT chk_leave_dates_valid 
                CHECK (end_date >= start_date);
            END IF;
        END IF;
    END IF;

    -- 2. Date range sanity check on payroll_periods (end_date >= start_date)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'payroll_periods'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
              AND table_name = 'payroll_periods' 
              AND constraint_name = 'chk_payroll_dates_valid'
        ) THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'payroll_periods' AND column_name = 'end_date'
            ) AND EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'payroll_periods' AND column_name = 'start_date'
            ) THEN
                ALTER TABLE public.payroll_periods 
                ADD CONSTRAINT chk_payroll_dates_valid 
                CHECK (end_date >= start_date);
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'payroll_periods' AND column_name = 'period_end'
            ) AND EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'payroll_periods' AND column_name = 'period_start'
            ) THEN
                ALTER TABLE public.payroll_periods 
                ADD CONSTRAINT chk_payroll_dates_valid 
                CHECK (period_end >= period_start);
            END IF;
        END IF;
    END IF;

    -- 3. Default now() on core timestamps if missing
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.employees ALTER COLUMN created_at SET DEFAULT now();
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'attendance_events' AND column_name = 'timestamp'
    ) THEN
        ALTER TABLE public.attendance_events ALTER COLUMN "timestamp" SET DEFAULT now();
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'leave_ledger_transactions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.leave_ledger_transactions ALTER COLUMN created_at SET DEFAULT now();
    END IF;

END $$;
