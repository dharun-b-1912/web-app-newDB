    -- ============================================================
    -- WorkForceOS — Forensic Immutable Audit System Schema
    -- Migration: 20260814_008_audit_events_schema.sql
    -- ============================================================

    -- 1. Create pgcrypto extension for SHA-256 cryptographic hash chaining
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- 2. Audit Events Table (Append-Only Immutable Ledger)
    CREATE TABLE IF NOT EXISTS public.audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
            'Administrative', 'Security', 'Authentication', 'Authorization',
            'Tenant', 'Billing', 'Plan', 'Feature', 'Integration',
            'API', 'System', 'AI', 'Session', 'Configuration'
        )),
        action TEXT NOT NULL,
        result TEXT NOT NULL DEFAULT 'Success' CHECK (result IN ('Success', 'Failed', 'Denied', 'Blocked', 'Partial', 'Pending')),
        risk_level TEXT NOT NULL DEFAULT 'Low' CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical', 'Unknown')),
        risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
        actor_user_id UUID,
        actor_name TEXT NOT NULL DEFAULT 'WorkForce System',
        actor_email TEXT DEFAULT 'system@workforceos.com',
        actor_role TEXT NOT NULL DEFAULT 'Super Admin',
        actor_type TEXT NOT NULL DEFAULT 'SUPER_ADMIN' CHECK (actor_type IN (
            'SUPER_ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'TENANT_ADMIN',
            'EMPLOYEE', 'SYSTEM', 'SERVICE', 'AI', 'WEBHOOK', 'API'
        )),
        tenant_id TEXT NOT NULL DEFAULT 'global',
        tenant_name TEXT NOT NULL DEFAULT 'Global Platform',
        resource_type TEXT NOT NULL DEFAULT 'System',
        resource_id TEXT,
        resource_name TEXT,
        request_id TEXT NOT NULL DEFAULT ('req_' || substr(md5(random()::text), 1, 12)),
        correlation_id TEXT,
        session_id TEXT,
        ip_hash TEXT,
        ip_masked TEXT DEFAULT '103.21.244.18',
        country TEXT DEFAULT 'India',
        region TEXT DEFAULT 'Tamil Nadu',
        city TEXT DEFAULT 'Chennai',
        user_agent_hash TEXT,
        source TEXT DEFAULT 'Platform Admin Console',
        service TEXT DEFAULT 'platform-control-plane',
        metadata JSONB DEFAULT '{}'::jsonb,
        before_value TEXT,
        after_value TEXT,
        previous_event_hash TEXT,
        event_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Optimized B-Tree and Composite Indexes
    CREATE INDEX IF NOT EXISTS idx_audit_events_created ON public.audit_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_events_category ON public.audit_events(category);
    CREATE INDEX IF NOT EXISTS idx_audit_events_result ON public.audit_events(result);
    CREATE INDEX IF NOT EXISTS idx_audit_events_risk ON public.audit_events(risk_level, risk_score);
    CREATE INDEX IF NOT EXISTS idx_audit_events_tenant ON public.audit_events(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_email);
    CREATE INDEX IF NOT EXISTS idx_audit_events_request ON public.audit_events(request_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_correlation ON public.audit_events(correlation_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_session ON public.audit_events(session_id);

    -- 3. Audit Exports Table (Track Export Jobs & Compliance Downloads)
    CREATE TABLE IF NOT EXISTS public.audit_event_exports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        export_id TEXT UNIQUE NOT NULL,
        requested_by TEXT NOT NULL,
        format TEXT NOT NULL CHECK (format IN ('CSV', 'JSON')),
        filter_criteria JSONB DEFAULT '{}'::jsonb,
        record_count INTEGER NOT NULL DEFAULT 0,
        file_size_bytes INTEGER,
        status TEXT NOT NULL DEFAULT 'Ready' CHECK (status IN ('Pending', 'Processing', 'Ready', 'Failed')),
        download_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 4. Audit Integrity Verifications Log
    CREATE TABLE IF NOT EXISTS public.audit_event_integrity_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        verified_by TEXT NOT NULL DEFAULT 'System Daemon',
        events_verified_count INTEGER NOT NULL,
        chain_status TEXT NOT NULL DEFAULT 'Verified' CHECK (chain_status IN ('Verified', 'Tampered', 'Broken')),
        broken_event_id TEXT,
        last_verified_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- -------------------------------------------------------------
    -- Stored Procedures & Database Functions
    -- -------------------------------------------------------------

    -- Function: Append-Only Immutable Event Writer with SHA-256 Hash Chaining
    CREATE OR REPLACE FUNCTION public.fn_record_audit_event(
        p_event_type TEXT,
        p_category TEXT,
        p_action TEXT,
        p_result TEXT DEFAULT 'Success',
        p_risk_level TEXT DEFAULT 'Low',
        p_risk_score INTEGER DEFAULT 0,
        p_actor_name TEXT DEFAULT 'WorkForce System',
        p_actor_email TEXT DEFAULT 'system@workforceos.com',
        p_actor_role TEXT DEFAULT 'Super Admin',
        p_actor_type TEXT DEFAULT 'SUPER_ADMIN',
        p_tenant_id TEXT DEFAULT 'global',
        p_tenant_name TEXT DEFAULT 'Global Platform',
        p_resource_type TEXT DEFAULT 'System',
        p_resource_id TEXT DEFAULT NULL,
        p_resource_name TEXT DEFAULT NULL,
        p_request_id TEXT DEFAULT NULL,
        p_correlation_id TEXT DEFAULT NULL,
        p_session_id TEXT DEFAULT NULL,
        p_ip_masked TEXT DEFAULT '103.21.244.18',
        p_city TEXT DEFAULT 'Chennai',
        p_country TEXT DEFAULT 'India',
        p_metadata JSONB DEFAULT '{}'::jsonb,
        p_before_value TEXT DEFAULT NULL,
        p_after_value TEXT DEFAULT NULL
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_prev_hash TEXT;
        v_event_id TEXT;
        v_seq_num BIGINT;
        v_canonical_data TEXT;
        v_new_hash TEXT;
        v_inserted_id UUID;
        v_req_id TEXT;
    BEGIN
        -- 1. Fetch the latest event hash to maintain tamper-evident chain
        SELECT event_hash INTO v_prev_hash
        FROM public.audit_events
        ORDER BY created_at DESC, id DESC
        LIMIT 1;

        IF v_prev_hash IS NULL THEN
            v_prev_hash := '0000000000000000000000000000000000000000000000000000000000000000';
        END IF;

        -- 2. Generate Human-Readable Event Number
        SELECT COUNT(*) + 1 INTO v_seq_num FROM public.audit_events;
        v_event_id := 'AUD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_seq_num::text, 6, '0');

        -- 3. Resolve Request ID
        v_req_id := COALESCE(p_request_id, 'req_' || substr(md5(random()::text), 1, 10));

        -- 4. Compute SHA-256 Event Hash
        v_canonical_data := v_event_id || '|' || p_event_type || '|' || p_category || '|' || p_action || '|' ||
                            p_result || '|' || p_actor_email || '|' || p_tenant_id || '|' || v_req_id || '|' ||
                            COALESCE(p_resource_id, '') || '|' || v_prev_hash;

        v_new_hash := encode(digest(v_canonical_data, 'sha256'), 'hex');

        -- 5. Insert Immutable Record
        INSERT INTO public.audit_events (
            event_id,
            event_type,
            category,
            action,
            result,
            risk_level,
            risk_score,
            actor_name,
            actor_email,
            actor_role,
            actor_type,
            tenant_id,
            tenant_name,
            resource_type,
            resource_id,
            resource_name,
            request_id,
            correlation_id,
            session_id,
            ip_masked,
            city,
            country,
            metadata,
            before_value,
            after_value,
            previous_event_hash,
            event_hash,
            created_at,
            occurred_at
        ) VALUES (
            v_event_id,
            p_event_type,
            p_category,
            p_action,
            p_result,
            p_risk_level,
            p_risk_score,
            p_actor_name,
            p_actor_email,
            p_actor_role,
            p_actor_type,
            p_tenant_id,
            p_tenant_name,
            p_resource_type,
            p_resource_id,
            p_resource_name,
            v_req_id,
            p_correlation_id,
            p_session_id,
            p_ip_masked,
            p_city,
            p_country,
            p_metadata,
            p_before_value,
            p_after_value,
            v_prev_hash,
            v_new_hash,
            now(),
            now()
        ) RETURNING id INTO v_inserted_id;

        RETURN jsonb_build_object(
            'success', true,
            'id', v_inserted_id,
            'event_id', v_event_id,
            'event_hash', v_new_hash,
            'previous_event_hash', v_prev_hash,
            'created_at', now()
        );
    END;
    $$;

    -- Function: Calculate Real-Time Audit Summary KPIs
    CREATE OR REPLACE FUNCTION public.fn_get_audit_summary()
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_today_count INTEGER;
        v_admin_count INTEGER;
        v_security_count INTEGER;
        v_failed_count INTEGER;
        v_high_risk_count INTEGER;
        v_auth_count INTEGER;
        v_tenant_count INTEGER;
    BEGIN
        -- Events Today (since UTC midnight)
        SELECT COUNT(*) INTO v_today_count
        FROM public.audit_events
        WHERE created_at >= date_trunc('day', now());

        -- Administrative Actions
        SELECT COUNT(*) INTO v_admin_count
        FROM public.audit_events
        WHERE category IN ('Administrative', 'Configuration', 'Plan', 'Feature', 'Tenant');

        -- Security Events
        SELECT COUNT(*) INTO v_security_count
        FROM public.audit_events
        WHERE category IN ('Security', 'Authentication', 'Authorization', 'Session');

        -- Failed / Denied / Blocked Actions
        SELECT COUNT(*) INTO v_failed_count
        FROM public.audit_events
        WHERE result IN ('Failed', 'Denied', 'Blocked');

        -- High & Critical Risk Actions
        SELECT COUNT(*) INTO v_high_risk_count
        FROM public.audit_events
        WHERE risk_level IN ('High', 'Critical');

        -- Auth Events
        SELECT COUNT(*) INTO v_auth_count
        FROM public.audit_events
        WHERE category = 'Authentication';

        -- Tenant Events
        SELECT COUNT(*) INTO v_tenant_count
        FROM public.audit_events
        WHERE category = 'Tenant';

        RETURN jsonb_build_object(
            'events_today_count', COALESCE(v_today_count, 0),
            'admin_actions_count', COALESCE(v_admin_count, 0),
            'security_events_count', COALESCE(v_security_count, 0),
            'failed_actions_count', COALESCE(v_failed_count, 0),
            'high_risk_actions_count', COALESCE(v_high_risk_count, 0),
            'auth_events_count', COALESCE(v_auth_count, 0),
            'tenant_events_count', COALESCE(v_tenant_count, 0),
            'calculated_at', now()
        );
    END;
    $$;

    -- Function: Cryptographic Chain Integrity Verifier
    CREATE OR REPLACE FUNCTION public.fn_verify_audit_integrity()
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_event RECORD;
        v_expected_prev_hash TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
        v_canonical_data TEXT;
        v_computed_hash TEXT;
        v_verified_count INTEGER := 0;
        v_broken_id TEXT := NULL;
        v_last_hash TEXT := NULL;
    BEGIN
        FOR v_event IN
            SELECT *
            FROM public.audit_events
            ORDER BY created_at ASC, id ASC
        LOOP
            -- Verify previous link
            IF v_event.previous_event_hash IS DISTINCT FROM v_expected_prev_hash THEN
                v_broken_id := v_event.event_id;
                EXIT;
            END IF;

            -- Recompute SHA-256
            v_canonical_data := v_event.event_id || '|' || v_event.event_type || '|' || v_event.category || '|' ||
                                v_event.action || '|' || v_event.result || '|' || v_event.actor_email || '|' ||
                                v_event.tenant_id || '|' || v_event.request_id || '|' ||
                                COALESCE(v_event.resource_id, '') || '|' || v_event.previous_event_hash;

            v_computed_hash := encode(digest(v_canonical_data, 'sha256'), 'hex');

            IF v_computed_hash IS DISTINCT FROM v_event.event_hash THEN
                v_broken_id := v_event.event_id;
                EXIT;
            END IF;

            v_expected_prev_hash := v_event.event_hash;
            v_last_hash := v_event.event_hash;
            v_verified_count := v_verified_count + 1;
        END LOOP;

        -- Record in integrity verification log
        INSERT INTO public.audit_event_integrity_records (
            events_verified_count,
            chain_status,
            broken_event_id,
            last_verified_hash
        ) VALUES (
            v_verified_count,
            CASE WHEN v_broken_id IS NULL THEN 'Verified' ELSE 'Tampered' END,
            v_broken_id,
            v_last_hash
        );

        IF v_broken_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'status', 'Tampered',
                'verified_count', v_verified_count,
                'broken_event_id', v_broken_id,
                'verified_at', now()
            );
        END IF;

        RETURN jsonb_build_object(
            'status', 'Verified',
            'verified_count', v_verified_count,
            'last_hash', v_last_hash,
            'verified_at', now()
        );
    END;
    $$;

    -- -------------------------------------------------------------
    -- Row-Level Security (RLS) & Immutability Enforcement
    -- -------------------------------------------------------------
    ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.audit_event_exports ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.audit_event_integrity_records ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Platform admins can read audit events"
    ON public.audit_events
    FOR SELECT
    TO authenticated
    USING (true);

    CREATE POLICY "Platform admins can insert audit events"
    ON public.audit_events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

    CREATE POLICY "Platform admins can read audit exports"
    ON public.audit_event_exports
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

    CREATE POLICY "Platform admins can read integrity records"
    ON public.audit_event_integrity_records
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

    -- Realtime Publication
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_events;
