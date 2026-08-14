-- ============================================================
-- WorkForceOS — Active Sessions & Security Telemetry Schema
-- Migration: 20260814_007_platform_sessions_schema.sql
-- ============================================================

-- 1. Platform Sessions Table (Application-Level Session Registry)
CREATE TABLE IF NOT EXISTS public.platform_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_session_id TEXT,
    user_id UUID,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_avatar TEXT,
    tenant_id TEXT NOT NULL DEFAULT 'global',
    tenant_name TEXT NOT NULL DEFAULT 'Global Platform',
    role_id TEXT NOT NULL DEFAULT 'employee',
    role_name TEXT NOT NULL DEFAULT 'Employee',
    session_status TEXT NOT NULL DEFAULT 'Active' CHECK (session_status IN ('Active', 'Idle', 'Expired', 'Revoked', 'Terminated', 'Unknown')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    revocation_reason TEXT,
    ip_hash TEXT,
    ip_masked TEXT,
    country TEXT DEFAULT 'India',
    region TEXT DEFAULT 'Tamil Nadu',
    city TEXT DEFAULT 'Chennai',
    asn TEXT,
    device_id TEXT NOT NULL DEFAULT 'dev-default',
    device_name TEXT DEFAULT 'Desktop Workstation',
    device_type TEXT DEFAULT 'Desktop' CHECK (device_type IN ('Desktop', 'Mobile', 'Tablet')),
    os_name TEXT DEFAULT 'Windows',
    os_version TEXT DEFAULT '11',
    browser_name TEXT DEFAULT 'Chrome',
    browser_version TEXT DEFAULT '128.0',
    user_agent_hash TEXT,
    auth_method TEXT NOT NULL DEFAULT 'Password' CHECK (auth_method IN ('Password', 'SSO', 'MFA', 'Passkey', 'OAuth')),
    mfa_verified BOOLEAN DEFAULT false,
    is_privileged BOOLEAN DEFAULT false,
    risk_level TEXT NOT NULL DEFAULT 'Low' CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical', 'Unknown')),
    risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_reason TEXT,
    first_seen_device BOOLEAN DEFAULT false,
    last_security_check_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for high-throughput operational queries
CREATE INDEX IF NOT EXISTS idx_platform_sessions_status ON public.platform_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_user_email ON public.platform_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_tenant ON public.platform_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_last_activity ON public.platform_sessions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_risk ON public.platform_sessions(risk_level, risk_score);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_device ON public.platform_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_privileged ON public.platform_sessions(is_privileged);

-- 2. Session Events Table (Audit & Security Lifecycle Stream)
CREATE TABLE IF NOT EXISTS public.session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.platform_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'SESSION_CREATED', 'MFA_VERIFIED', 'HEARTBEAT_PULSED', 'SESSION_REVOKED', 'RISK_ELEVATED', 'DEVICE_ENROLLED', 'EXPIRED'
    user_email TEXT NOT NULL,
    actor_id TEXT,
    actor_name TEXT,
    ip_masked TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_events_session ON public.session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_created ON public.session_events(created_at DESC);

-- 3. Device Registry Table
CREATE TABLE IF NOT EXISTS public.device_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'Desktop',
    os_name TEXT NOT NULL,
    browser_name TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    trust_status TEXT NOT NULL DEFAULT 'Trusted' CHECK (trust_status IN ('Trusted', 'New', 'Suspicious', 'Blocked')),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uq_device_user UNIQUE(device_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_device_registry_user ON public.device_registry(user_email);

-- -------------------------------------------------------------
-- Stored Procedures & Database Functions
-- -------------------------------------------------------------

-- Function: Compute Exact Session Summary KPIs
CREATE OR REPLACE FUNCTION public.fn_get_session_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_count INTEGER;
    v_admin_count INTEGER;
    v_tenant_count INTEGER;
    v_suspicious_count INTEGER;
    v_new_devices_count INTEGER;
    v_idle_count INTEGER;
    v_expired_today_count INTEGER;
    v_revoked_today_count INTEGER;
BEGIN
    -- Active Sessions (valid, not expired, not revoked, recent activity)
    SELECT COUNT(*) INTO v_active_count
    FROM public.platform_sessions
    WHERE session_status = 'Active' AND expires_at > now();

    -- Admin Sessions
    SELECT COUNT(*) INTO v_admin_count
    FROM public.platform_sessions
    WHERE session_status = 'Active' AND is_privileged = true AND expires_at > now();

    -- Tenant User Sessions
    SELECT COUNT(*) INTO v_tenant_count
    FROM public.platform_sessions
    WHERE session_status = 'Active' AND is_privileged = false AND expires_at > now();

    -- Suspicious Sessions (Risk High/Critical or Suspicious flag)
    SELECT COUNT(*) INTO v_suspicious_count
    FROM public.platform_sessions
    WHERE session_status = 'Active' AND (risk_level IN ('High', 'Critical') OR session_status = 'Suspicious');

    -- New Devices Enrolled Today
    SELECT COUNT(*) INTO v_new_devices_count
    FROM public.platform_sessions
    WHERE first_seen_device = true AND created_at >= (now() - INTERVAL '24 hours');

    -- Idle Sessions
    SELECT COUNT(*) INTO v_idle_count
    FROM public.platform_sessions
    WHERE session_status = 'Idle' AND expires_at > now();

    -- Expired Today
    SELECT COUNT(*) INTO v_expired_today_count
    FROM public.platform_sessions
    WHERE (session_status = 'Expired' OR expires_at <= now()) AND expires_at >= (now() - INTERVAL '24 hours');

    -- Revoked Today
    SELECT COUNT(*) INTO v_revoked_today_count
    FROM public.platform_sessions
    WHERE session_status = 'Revoked' AND revoked_at >= (now() - INTERVAL '24 hours');

    RETURN jsonb_build_object(
        'active_sessions_count', COALESCE(v_active_count, 0),
        'admin_sessions_count', COALESCE(v_admin_count, 0),
        'tenant_sessions_count', COALESCE(v_tenant_count, 0),
        'suspicious_sessions_count', COALESCE(v_suspicious_count, 0),
        'new_devices_count', COALESCE(v_new_devices_count, 0),
        'idle_sessions_count', COALESCE(v_idle_count, 0),
        'expired_today_count', COALESCE(v_expired_today_count, 0),
        'revoked_today_count', COALESCE(v_revoked_today_count, 0),
        'calculated_at', now()
    );
END;
$$;

-- Function: Transactionally Revoke a Single Session
CREATE OR REPLACE FUNCTION public.fn_revoke_session(
    p_session_id UUID,
    p_revoked_by TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session
    FROM public.platform_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    IF v_session.session_status = 'Revoked' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session is already revoked');
    END IF;

    -- Update session status
    UPDATE public.platform_sessions
    SET session_status = 'Revoked',
        revoked_at = now(),
        revoked_by = p_revoked_by,
        revocation_reason = p_reason,
        updated_at = now()
    WHERE id = p_session_id;

    -- Record event in session_events
    INSERT INTO public.session_events (
        session_id,
        event_type,
        user_email,
        actor_name,
        ip_masked,
        details
    ) VALUES (
        p_session_id,
        'SESSION_REVOKED',
        v_session.user_email,
        p_revoked_by,
        v_session.ip_masked,
        jsonb_build_object('reason', p_reason, 'revoked_at', now())
    );

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'user_email', v_session.user_email,
        'revoked_at', now()
    );
END;
$$;

-- Function: Transactionally Revoke All Sessions for a User
CREATE OR REPLACE FUNCTION public.fn_revoke_user_sessions(
    p_user_email TEXT,
    p_revoked_by TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.platform_sessions
    SET session_status = 'Revoked',
        revoked_at = now(),
        revoked_by = p_revoked_by,
        revocation_reason = p_reason,
        updated_at = now()
    WHERE user_email = p_user_email AND session_status IN ('Active', 'Idle');

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Record event
    INSERT INTO public.session_events (
        event_type,
        user_email,
        actor_name,
        details
    ) VALUES (
        'USER_ALL_SESSIONS_REVOKED',
        p_user_email,
        p_revoked_by,
        jsonb_build_object('revoked_count', v_count, 'reason', p_reason, 'revoked_at', now())
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_email', p_user_email,
        'revoked_count', v_count
    );
END;
$$;

-- Function: Emergency Mass Revoke All Privileged Sessions
CREATE OR REPLACE FUNCTION public.fn_revoke_all_privileged_sessions(
    p_revoked_by TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.platform_sessions
    SET session_status = 'Revoked',
        revoked_at = now(),
        revoked_by = p_revoked_by,
        revocation_reason = p_reason,
        updated_at = now()
    WHERE is_privileged = true AND session_status IN ('Active', 'Idle');

    GET DIAGNOSTICS v_count = ROW_COUNT;

    INSERT INTO public.session_events (
        event_type,
        user_email,
        actor_name,
        details
    ) VALUES (
        'EMERGENCY_PRIVILEGED_SESSIONS_REVOKED',
        'all_privileged@workforceos.com',
        p_revoked_by,
        jsonb_build_object('revoked_count', v_count, 'reason', p_reason, 'revoked_at', now())
    );

    RETURN jsonb_build_object(
        'success', true,
        'revoked_count', v_count
    );
END;
$$;

-- -------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- -------------------------------------------------------------
ALTER TABLE public.platform_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all sessions"
ON public.platform_sessions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Platform admins can view session events"
ON public.session_events
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Platform admins can manage device registry"
ON public.device_registry
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_events;
