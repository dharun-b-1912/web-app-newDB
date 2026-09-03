-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 009
-- Target Project: ysiajemrqakfngasehhi
-- Description: Time, Attendance, Biometrics and Regularization
-- ============================================================================

-- 1. Biometric Hardware Devices Master
CREATE TABLE IF NOT EXISTS public.biometric_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    port INTEGER NOT NULL DEFAULT 4370,
    protocol VARCHAR(20) NOT NULL DEFAULT 'TCP' CHECK (protocol IN ('TCP', 'UDP', 'HTTP', 'CLOUD')),
    direction VARCHAR(20) NOT NULL DEFAULT 'BOTH' CHECK (direction IN ('IN', 'OUT', 'BOTH')),
    last_heartbeat_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bio_devices_org_serial UNIQUE (organization_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_bio_devices_org ON public.biometric_devices(organization_id);

-- 2. Raw Attendance Punches (Immutable High-Velocity Stream)
CREATE TABLE IF NOT EXISTS public.attendance_punches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.biometric_devices(id) ON DELETE SET NULL,
    punch_time TIMESTAMPTZ NOT NULL,
    punch_type VARCHAR(20) NOT NULL DEFAULT 'CHECK_IN' CHECK (punch_type IN ('CHECK_IN', 'CHECK_OUT', 'AUTO')),
    verification_mode VARCHAR(32) NOT NULL DEFAULT 'BIOMETRIC' CHECK (verification_mode IN ('BIOMETRIC', 'FACE', 'GPS', 'CARD', 'MANUAL')),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    is_processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_punches_org_time ON public.attendance_punches(organization_id, punch_time);
CREATE INDEX IF NOT EXISTS idx_punches_emp_time ON public.attendance_punches(employee_id, punch_time);

-- 3. Attendance Daily Processed Summary
CREATE TABLE IF NOT EXISTS public.attendance_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    first_check_in TIMESTAMPTZ,
    last_check_out TIMESTAMPTZ,
    total_work_minutes INTEGER NOT NULL DEFAULT 0,
    break_minutes INTEGER NOT NULL DEFAULT 0,
    overtime_minutes INTEGER NOT NULL DEFAULT 0,
    late_entry_minutes INTEGER NOT NULL DEFAULT 0,
    early_exit_minutes INTEGER NOT NULL DEFAULT 0,
    status public.attendance_status_enum NOT NULL DEFAULT 'PRESENT',
    payable_status NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (payable_status IN (1.00, 0.50, 0.00)),
    is_regularized BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attendance_emp_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_org_date ON public.attendance_daily(organization_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance_daily(employee_id, attendance_date);

-- 4. Attendance Regularizations
CREATE TABLE IF NOT EXISTS public.attendance_regularizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    requested_check_in TIMESTAMPTZ,
    requested_check_out TIMESTAMPTZ,
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regularizations_emp ON public.attendance_regularizations(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_regularizations_org_status ON public.attendance_regularizations(organization_id, status);
