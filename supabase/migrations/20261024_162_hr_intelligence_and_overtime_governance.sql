-- ============================================================================
-- JOY PeopleHR — Migration 162
-- HR Intelligence MIS, Overtime Governance (60h Annual / 20h 4-Month Period)
-- Immutable MIS Snapshots, Configurable Warning Thresholds & Recipient Scope
-- ============================================================================

-- 1. Create Overtime Governance Policies Table
CREATE TABLE IF NOT EXISTS public.overtime_governance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    policy_name TEXT NOT NULL DEFAULT 'Standard 60-Hour Annual Overtime Policy',
    annual_allocation_hours NUMERIC(6, 2) NOT NULL DEFAULT 60.00,
    period_allocation_hours NUMERIC(6, 2) NOT NULL DEFAULT 20.00,
    period_type TEXT NOT NULL DEFAULT 'FOUR_MONTH_FIXED', -- 'FOUR_MONTH_FIXED'
    
    -- Threshold Warning Percentages (Configurable)
    warning_approaching_pct NUMERIC(5, 2) NOT NULL DEFAULT 75.00,   -- >= 75%: Approaching
    warning_high_priority_pct NUMERIC(5, 2) NOT NULL DEFAULT 90.00, -- >= 90%: High Priority
    warning_exceeded_pct NUMERIC(5, 2) NOT NULL DEFAULT 100.00,     -- > 100%: Exceeded
    
    -- Inclusions & Rules
    included_sources TEXT[] NOT NULL DEFAULT ARRAY['BIOMETRIC', 'MOBILE', 'WEB', 'MANUAL'],
    require_approval_for_allocation BOOLEAN NOT NULL DEFAULT true,
    count_pending_in_utilization BOOLEAN NOT NULL DEFAULT false,
    include_holiday_ot BOOLEAN NOT NULL DEFAULT true,
    include_sunday_ot BOOLEAN NOT NULL DEFAULT true,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_ot_gov_org_policy UNIQUE (organization_id, policy_name)
);

-- Index for fast lookup by organization
CREATE INDEX IF NOT EXISTS idx_ot_gov_org ON public.overtime_governance_policies(organization_id, is_active);

-- Enable RLS
ALTER TABLE public.overtime_governance_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ot_gov_policies_tenant_access" ON public.overtime_governance_policies;
CREATE POLICY "ot_gov_policies_tenant_access"
    ON public.overtime_governance_policies
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
        OR auth.role() = 'service_role'
    );

-- 2. Create Immutable MIS Report Snapshots Table
CREATE TABLE IF NOT EXISTS public.mis_report_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL, -- 'DAILY_MIS', 'WEEKLY_HR_MIS', 'MONTHLY_HR_MIS', 'OVERTIME_GOVERNANCE', 'DEPT_SHIFT_MIS', 'HR_EXCEPTIONS'
    reporting_period TEXT NOT NULL, -- e.g. '2026-10-24', '2026-W43', '2026-10', '2026-P3'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    cutoff_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Authoritative Snapshot Metrics & Summary Data (JSONB)
    metrics_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    department_rollups JSONB NOT NULL DEFAULT '[]'::jsonb,
    shift_rollups JSONB NOT NULL DEFAULT '[]'::jsonb,
    overtime_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    exceptions_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Artifact Persistence
    artifact_storage_path TEXT,
    artifact_filename TEXT,
    sha256_checksum TEXT,
    file_size_bytes BIGINT,
    page_count INTEGER DEFAULT 1,
    
    -- Metadata & Auditing
    report_version TEXT NOT NULL DEFAULT '2.0.0',
    policy_version TEXT NOT NULL DEFAULT '1.0.0',
    generated_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    generated_by_name TEXT,
    generation_mode TEXT NOT NULL DEFAULT 'ON_DEMAND', -- 'ON_DEMAND', 'SCHEDULED_DAEMON', 'BOT_SELF_SERVICE'
    generation_status TEXT NOT NULL DEFAULT 'COMPLETED', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mis_snapshots_org_period ON public.mis_report_snapshots(organization_id, report_type, reporting_period);
CREATE INDEX IF NOT EXISTS idx_mis_snapshots_dates ON public.mis_report_snapshots(organization_id, start_date, end_date);

-- Enable RLS
ALTER TABLE public.mis_report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mis_snapshots_tenant_access" ON public.mis_report_snapshots;
CREATE POLICY "mis_snapshots_tenant_access"
    ON public.mis_report_snapshots
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
        OR auth.role() = 'service_role'
    );

-- 3. Extend mis_report_recipients Table if needed
DO $$
BEGIN
    -- Add permitted_departments if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mis_report_recipients' AND column_name = 'permitted_departments'
    ) THEN
        ALTER TABLE public.mis_report_recipients ADD COLUMN permitted_departments UUID[] DEFAULT '{}'::uuid[];
    END IF;

    -- Add scheduled_weekly and scheduled_monthly if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mis_report_recipients' AND column_name = 'scheduled_weekly'
    ) THEN
        ALTER TABLE public.mis_report_recipients ADD COLUMN scheduled_weekly BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mis_report_recipients' AND column_name = 'scheduled_monthly'
    ) THEN
        ALTER TABLE public.mis_report_recipients ADD COLUMN scheduled_monthly BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;
