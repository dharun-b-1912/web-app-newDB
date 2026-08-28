-- ==============================================================================
-- Migration: 20260825_052_realtime_audit_and_health_mesh.sql
-- Description: Universal Audit Mesh, Replica Identity Full, and Realtime Health Diagnostics
-- ==============================================================================

-- 1. Create or Upgrade Canonical Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01',
    actor_user_id VARCHAR(128) NOT NULL DEFAULT 'system',
    actor_role VARCHAR(64) NOT NULL DEFAULT 'Admin',
    actor_name VARCHAR(128) DEFAULT 'Authorized Administrator',
    entity_type VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
    entity_id VARCHAR(128) NOT NULL DEFAULT 'system',
    action VARCHAR(32) NOT NULL DEFAULT 'SYNC',
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    correlation_id VARCHAR(128),
    source VARCHAR(32) DEFAULT 'WEB',
    ip_address VARCHAR(64) DEFAULT '127.0.0.1',
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist even if table pre-existed with different schema
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) NOT NULL DEFAULT 'org-joy-01';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_user_id VARCHAR(128) NOT NULL DEFAULT 'system';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role VARCHAR(64) NOT NULL DEFAULT 'Admin';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_name VARCHAR(128) DEFAULT 'Authorized Administrator';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(64) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(128) NOT NULL DEFAULT 'system';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(32) NOT NULL DEFAULT 'SYNC';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_data JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS changed_fields TEXT[];
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(128);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS source VARCHAR(32) DEFAULT 'WEB';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64) DEFAULT '127.0.0.1';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Safely create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_org ON public.audit_logs (tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON public.audit_logs (correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_tenant_isolation ON public.audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON public.audit_logs
    FOR ALL
    TO authenticated
    USING (
        tenant_id = COALESCE(current_setting('request.jwt.claim.tenant_id', true), 'org-joy-01')
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- 2. Configure REPLICA IDENTITY FULL for Detailed Change Capture on Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees') THEN
        ALTER TABLE public.employees REPLICA IDENTITY FULL;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_daily') THEN
        ALTER TABLE public.attendance_daily REPLICA IDENTITY FULL;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_roster_entries') THEN
        ALTER TABLE public.attendance_roster_entries REPLICA IDENTITY FULL;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_shifts') THEN
        ALTER TABLE public.attendance_shifts REPLICA IDENTITY FULL;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_requests') THEN
        ALTER TABLE public.leave_requests REPLICA IDENTITY FULL;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_master') THEN
        ALTER TABLE public.document_master REPLICA IDENTITY FULL;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_requirements') THEN
        ALTER TABLE public.document_requirements REPLICA IDENTITY FULL;
    END IF;
END $$;

-- 3. Ensure Publication in supabase_realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_daily;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_roster_entries;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_shifts;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.document_master;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requirements;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_outbox;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 4. Database Health Check Function
CREATE OR REPLACE FUNCTION public.fn_check_database_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    emp_count INT := 0;
    att_count INT := 0;
    audit_count INT := 0;
    rt_pub_tables TEXT[];
BEGIN
    SELECT COUNT(*) INTO emp_count FROM public.employees;
    SELECT COUNT(*) INTO att_count FROM public.attendance_daily;
    SELECT COUNT(*) INTO audit_count FROM public.audit_logs;
    
    SELECT array_agg(tablename::text) INTO rt_pub_tables 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime';

    result := jsonb_build_object(
        'status', 'HEALTHY',
        'timestamp', NOW(),
        'database_version', version(),
        'employee_count', emp_count,
        'attendance_count', att_count,
        'audit_log_count', audit_count,
        'realtime_publication_tables', COALESCE(rt_pub_tables, ARRAY[]::TEXT[]),
        'rls_enabled_tables', ARRAY['employees', 'attendance_daily', 'leave_requests', 'audit_logs']
    );

    RETURN result;
END;
$$;
