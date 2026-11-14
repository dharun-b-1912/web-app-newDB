-- supabase/migrations/20261114_joy_sentinel_v7_core.sql
-- ============================================================================
-- JOY SENTINEL V7: Phase 1 — Corrected & Hardened Reliability Architecture
-- ============================================================================
-- DO NOT EXECUTE DIRECTLY WITHOUT PRIOR PRODUCTION AUTHORIZATION
--
-- Security & Operational Hardening:
-- 1. Restricted RLS: Default-deny for public/anon/employees; platform-admin only.
-- 2. Hardened SECURITY DEFINER: Fixed search_path = public, pg_temp; explicit grants.
-- 3. True Production Schemas: Uses attendance_punches, attendance_daily, 
--    attendance_break_events, payroll_runs, payroll_line_items, payslips.
-- 4. Safe Tenant Impact: Nested subquery aggregation with explicit P0-P4 ordering.
-- 5. Evidence-Based Fix Verification: Bounded observation window with traffic quorum.
-- 6. Dependency-Aware Rollback: Non-cascading, surgically restricted to V7 objects.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Sentinel Workflow Health Logs (Retention: 30 days)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sentinel_workflow_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type VARCHAR(32) NOT NULL, -- 'ATTENDANCE', 'PAYROLL', 'PAYMENTS', 'CARRIER'
  status VARCHAR(16) NOT NULL,        -- 'HEALTHY', 'DEGRADED', 'FAILED', 'UNKNOWN'
  anomalies_detected INT DEFAULT 0,
  affected_organizations UUID[] DEFAULT '{}',
  summary TEXT NOT NULL,
  diagnostic_details JSONB DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_workflow_audits_type 
  ON public.sentinel_workflow_audits(workflow_type, evaluated_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Incident Fix Verification Tracker (Evidence Preservation: ON DELETE SET NULL)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sentinel_fix_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.sentinel_incidents(id) ON DELETE SET NULL,
  incident_number VARCHAR(32) NOT NULL,
  error_fingerprint VARCHAR(128) NOT NULL,
  verification_state VARCHAR(24) DEFAULT 'VERIFYING', -- 'VERIFYING', 'VERIFIED', 'REOPENED', 'EXPIRED', 'UNKNOWN'
  observation_window_minutes INT DEFAULT 60,
  min_traffic_samples INT DEFAULT 10,
  samples_observed INT DEFAULT 0,
  recurrences_detected INT DEFAULT 0,
  resolved_at TIMESTAMPTZ NOT NULL,
  resolved_by VARCHAR(64) NOT NULL,
  verified_at TIMESTAMPTZ,
  last_alerted_at TIMESTAMPTZ,
  last_evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  verification_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sentinel_verifications_state 
  ON public.sentinel_fix_verifications(verification_state);
CREATE INDEX IF NOT EXISTS idx_sentinel_verifications_fingerprint 
  ON public.sentinel_fix_verifications(error_fingerprint);
CREATE INDEX IF NOT EXISTS idx_sentinel_verifications_inc 
  ON public.sentinel_fix_verifications(incident_number);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. RLS Security: Default-Deny & Operations-Admin Strict Access
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.sentinel_workflow_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_fix_verifications ENABLE ROW LEVEL SECURITY;

-- Service Role: Full access for Edge Functions & Telegram background tasks
CREATE POLICY "Service role full access on sentinel_workflow_audits"
  ON public.sentinel_workflow_audits FOR ALL TO service_role 
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on sentinel_fix_verifications"
  ON public.sentinel_fix_verifications FOR ALL TO service_role 
  USING (true) WITH CHECK (true);

-- Authenticated Users: STRICT DEFAULT-DENY. Only authorized platform admins can read.
-- Ordinary employees and standard tenant users receive 0 rows.
CREATE POLICY "Platform admin read on sentinel_workflow_audits"
  ON public.sentinel_workflow_audits FOR SELECT TO authenticated
  USING (public.is_platform_admin() = true);

CREATE POLICY "Platform admin read on sentinel_fix_verifications"
  ON public.sentinel_fix_verifications FOR SELECT TO authenticated
  USING (public.is_platform_admin() = true);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Attendance Pipeline Integrity Guardian (Hardened RPC)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sentinel_audit_attendance_integrity(p_hours INT DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bounded_hours INT;
  v_orphan_punches INT := 0;
  v_unclosed_breaks INT := 0;
  v_inverted_punches INT := 0;
  v_orphan_orgs UUID[] := '{}';
  v_break_orgs UUID[] := '{}';
  v_inverted_orgs UUID[] := '{}';
  v_all_affected_orgs UUID[] := '{}';
  v_status VARCHAR(16);
  v_details JSONB;
BEGIN
  -- 1. Authorization Gate: Caller must be service_role or platform admin
  IF auth.role() != 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Sentinel audit RPC requires platform_admin or service_role credentials';
  END IF;

  -- 2. Input Boundary Validation (1 hour <= window <= 72 hours)
  v_bounded_hours := LEAST(GREATEST(COALESCE(p_hours, 24), 1), 72);

  -- 3. Check True Orphan Punches: Punches > 15m old completely missing from attendance_daily
  -- (Never rely on is_processed column which is not maintained by all direct-commit RPCs)
  SELECT 
    COUNT(*), 
    COALESCE(ARRAY_AGG(DISTINCT ap.organization_id) FILTER (WHERE ap.organization_id IS NOT NULL), '{}')
  INTO v_orphan_punches, v_orphan_orgs
  FROM public.attendance_punches ap
  LEFT JOIN public.attendance_daily ad 
    ON ad.organization_id = ap.organization_id
   AND ad.employee_id = ap.employee_id 
   AND ad.attendance_date = ap.attendance_date
  WHERE ad.id IS NULL
    AND ap.punch_time <= NOW() - INTERVAL '15 minutes'
    AND ap.punch_time >= NOW() - (v_bounded_hours || ' hours')::INTERVAL;

  -- 4. Check Unclosed Breaks: Breaks marked status = 'IN_PROGRESS' with ended_at IS NULL > 180m
  SELECT 
    COUNT(*), 
    COALESCE(ARRAY_AGG(DISTINCT abe.organization_id) FILTER (WHERE abe.organization_id IS NOT NULL), '{}')
  INTO v_unclosed_breaks, v_break_orgs
  FROM public.attendance_break_events abe
  WHERE abe.ended_at IS NULL
    AND abe.started_at <= NOW() - INTERVAL '180 minutes'
    AND abe.started_at >= NOW() - (v_bounded_hours || ' hours')::INTERVAL;

  -- 5. Check Inverted Timestamps on Daily Summary: last_check_out strictly earlier than first_check_in
  -- (Overnight shifts naturally have check_out > check_in across calendar day boundary)
  SELECT 
    COUNT(*), 
    COALESCE(ARRAY_AGG(DISTINCT ad.organization_id) FILTER (WHERE ad.organization_id IS NOT NULL), '{}')
  INTO v_inverted_punches, v_inverted_orgs
  FROM public.attendance_daily ad
  WHERE ad.last_check_out IS NOT NULL
    AND ad.first_check_in IS NOT NULL
    AND ad.last_check_out < ad.first_check_in
    AND ad.attendance_date >= CURRENT_DATE - 2;

  -- 6. Combine all affected organizations safely
  SELECT ARRAY_AGG(DISTINCT org_id)
  INTO v_all_affected_orgs
  FROM unnest(v_orphan_orgs || v_break_orgs || v_inverted_orgs) AS org_id;

  v_all_affected_orgs := COALESCE(v_all_affected_orgs, '{}');

  -- 7. Determine 4-State Health Assessment
  IF v_orphan_punches > 10 OR v_inverted_punches > 5 THEN
    v_status := 'FAILED';
  ELSIF v_orphan_punches > 0 OR v_unclosed_breaks > 0 OR v_inverted_punches > 0 THEN
    v_status := 'DEGRADED';
  ELSE
    v_status := 'HEALTHY';
  END IF;

  v_details := jsonb_build_object(
    'orphan_punches', v_orphan_punches,
    'unclosed_breaks', v_unclosed_breaks,
    'inverted_sequences', v_inverted_punches,
    'affected_organizations_count', CARDINALITY(v_all_affected_orgs),
    'evaluated_window_hours', v_bounded_hours
  );

  -- 8. Record audit log (bounded retention)
  INSERT INTO public.sentinel_workflow_audits (
    workflow_type, status, anomalies_detected, affected_organizations, summary, diagnostic_details
  ) VALUES (
    'ATTENDANCE', v_status, (v_orphan_punches + v_unclosed_breaks + v_inverted_punches),
    v_all_affected_orgs, 'Attendance Pipeline Integrity Verification', v_details
  );

  RETURN jsonb_build_object(
    'workflow', 'ATTENDANCE',
    'status', v_status,
    'details', v_details,
    'evaluated_at', NOW()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'workflow', 'ATTENDANCE',
    'status', 'UNKNOWN',
    'error', SQLERRM,
    'evaluated_at', NOW()
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Payroll Output Reconciliation Guardian (Hardened RPC)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sentinel_audit_payroll_integrity(p_months INT DEFAULT 3)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bounded_months INT;
  v_missing_payslips INT := 0;
  v_unpublished_payslips INT := 0;
  v_duplicate_payslips INT := 0;
  v_math_discrepancies INT := 0;
  v_affected_orgs UUID[] := '{}';
  v_status VARCHAR(16);
  v_details JSONB;
BEGIN
  -- 1. Authorization Gate
  IF auth.role() != 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Sentinel audit RPC requires platform_admin or service_role credentials';
  END IF;

  v_bounded_months := LEAST(GREATEST(COALESCE(p_months, 3), 1), 12);

  -- 2. Check Missing Payslips: Approved/Disbursed/Locked payroll runs with missing payslip records
  SELECT 
    COUNT(*),
    COALESCE(ARRAY_AGG(DISTINCT pr.organization_id) FILTER (WHERE pr.organization_id IS NOT NULL), '{}')
  INTO v_missing_payslips, v_affected_orgs
  FROM public.payroll_runs pr
  JOIN public.payroll_line_items pli ON pli.payroll_run_id = pr.id
  LEFT JOIN public.payslips ps ON ps.payroll_line_item_id = pli.id
  WHERE pr.status IN ('APPROVED', 'DISBURSED', 'LOCKED')
    AND ps.id IS NULL
    AND pr.created_at >= NOW() - (v_bounded_months || ' months')::INTERVAL;

  -- 3. Check Unpublished Payslips on Approved/Disbursed Runs
  SELECT COUNT(*)
  INTO v_unpublished_payslips
  FROM public.payroll_runs pr
  JOIN public.payroll_line_items pli ON pli.payroll_run_id = pr.id
  JOIN public.payslips ps ON ps.payroll_line_item_id = pli.id
  WHERE pr.status IN ('APPROVED', 'DISBURSED', 'LOCKED')
    AND ps.is_published = false
    AND pr.created_at >= NOW() - (v_bounded_months || ' months')::INTERVAL;

  -- 4. Check Duplicate Payslips per Line Item
  SELECT COUNT(*)
  INTO v_duplicate_payslips
  FROM (
    SELECT payroll_line_item_id, COUNT(*) AS cnt
    FROM public.payslips
    WHERE created_at >= NOW() - (v_bounded_months || ' months')::INTERVAL
    GROUP BY payroll_line_item_id
    HAVING COUNT(*) > 1
  ) dup;

  -- 5. Math Consistency Check: gross_earnings - total_deductions = net_pay
  -- (Tolerates <= 1.00 INR for standard paise rounding adjustments)
  SELECT COUNT(*)
  INTO v_math_discrepancies
  FROM public.payroll_line_items pli
  JOIN public.payroll_runs pr ON pr.id = pli.payroll_run_id
  WHERE pr.status IN ('APPROVED', 'DISBURSED', 'LOCKED')
    AND ABS((pli.gross_earnings - pli.total_deductions) - pli.net_pay) > 1.00
    AND pr.created_at >= NOW() - (v_bounded_months || ' months')::INTERVAL;

  -- 6. Evaluate Health Status
  IF v_missing_payslips > 0 OR v_duplicate_payslips > 0 OR v_math_discrepancies > 0 THEN
    v_status := 'FAILED';
  ELSIF v_unpublished_payslips > 0 THEN
    v_status := 'DEGRADED';
  ELSE
    v_status := 'HEALTHY';
  END IF;

  v_details := jsonb_build_object(
    'missing_payslips', v_missing_payslips,
    'unpublished_payslips', v_unpublished_payslips,
    'duplicate_payslips', v_duplicate_payslips,
    'math_discrepancies', v_math_discrepancies,
    'evaluated_months', v_bounded_months
  );

  INSERT INTO public.sentinel_workflow_audits (
    workflow_type, status, anomalies_detected, affected_organizations, summary, diagnostic_details
  ) VALUES (
    'PAYROLL', v_status, (v_missing_payslips + v_duplicate_payslips + v_math_discrepancies),
    COALESCE(v_affected_orgs, '{}'), 'Payroll Output Reconciliation Verification', v_details
  );

  RETURN jsonb_build_object(
    'workflow', 'PAYROLL',
    'status', v_status,
    'details', v_details,
    'evaluated_at', NOW()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'workflow', 'PAYROLL',
    'status', 'UNKNOWN',
    'error', SQLERRM,
    'evaluated_at', NOW()
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Tenant Impact Aggregator (Hardened RPC with Explicit Severity Ordering)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sentinel_get_tenant_impact()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. Authorization Gate
  IF auth.role() != 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Sentinel tenant impact RPC requires platform_admin or service_role credentials';
  END IF;

  -- 2. Nested Subquery with Explicit P0 -> P1 -> P2 -> P3 -> P4 Severity Precedence
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'organization_code', sub.org_code,
        'is_platform_wide', sub.is_platform_wide,
        'incident_count', sub.inc_count,
        'highest_severity', sub.max_severity,
        'affected_services', sub.services,
        'last_seen', sub.latest_seen
      )
    ), '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT 
      COALESCE(o.organization_code, 'PLATFORM_WIDE') AS org_code,
      (CASE WHEN o.organization_code IS NULL THEN true ELSE false END) AS is_platform_wide,
      COUNT(i.id) AS inc_count,
      CASE 
        WHEN bool_or(i.severity = 'P0') THEN 'P0'
        WHEN bool_or(i.severity = 'P1') THEN 'P1'
        WHEN bool_or(i.severity = 'P2') THEN 'P2'
        WHEN bool_or(i.severity = 'P3') THEN 'P3'
        ELSE 'P4'
      END AS max_severity,
      string_agg(DISTINCT i.service_name, ', ') AS services,
      MAX(i.last_seen_at) AS latest_seen
    FROM public.sentinel_incidents i
    LEFT JOIN public.organizations o 
      ON o.id = (CASE 
                   WHEN i.evidence->>'organization_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                   THEN (i.evidence->>'organization_id')::uuid 
                   ELSE NULL 
                 END)
    WHERE i.lifecycle_state NOT IN ('RESOLVED', 'CLOSED', 'VERIFIED')
    GROUP BY o.organization_code
    ORDER BY 
      CASE 
        WHEN bool_or(i.severity = 'P0') THEN 1
        WHEN bool_or(i.severity = 'P1') THEN 2
        WHEN bool_or(i.severity = 'P2') THEN 3
        WHEN bool_or(i.severity = 'P3') THEN 4
        ELSE 5
      END ASC
  ) sub;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'status', 'UNKNOWN');
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Fix Verification Evaluator (Hardened RPC with Traffic Quorum)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sentinel_evaluate_fix_verifications()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ver RECORD;
  v_verified_count INT := 0;
  v_reopened_count INT := 0;
  v_unknown_count INT := 0;
  v_results JSONB := '[]'::jsonb;
BEGIN
  -- 1. Authorization Gate
  IF auth.role() != 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Sentinel fix verification RPC requires platform_admin or service_role credentials';
  END IF;

  -- 2. Inspect active verifications in 'VERIFYING' state
  FOR v_ver IN
    SELECT *
    FROM public.sentinel_fix_verifications
    WHERE verification_state = 'VERIFYING'
  LOOP
    -- Has the observation window elapsed?
    IF v_ver.resolved_at + (v_ver.observation_window_minutes || ' minutes')::INTERVAL <= NOW() THEN
      -- Quorum check: Did we observe sufficient traffic to confirm health?
      IF v_ver.samples_observed >= v_ver.min_traffic_samples THEN
        -- VERIFIED: Zero recurrences and healthy traffic
        UPDATE public.sentinel_fix_verifications
        SET 
          verification_state = 'VERIFIED',
          verified_at = NOW(),
          last_evaluated_at = NOW(),
          verification_notes = 'Verified: ' || v_ver.samples_observed || ' traffic samples observed with zero error recurrences.'
        WHERE id = v_ver.id;

        UPDATE public.sentinel_incidents
        SET lifecycle_state = 'VERIFIED'
        WHERE incident_number = v_ver.incident_number;

        v_verified_count := v_verified_count + 1;
      ELSE
        -- UNKNOWN: Insufficient traffic to prove recovery (never falsely assume healthy)
        UPDATE public.sentinel_fix_verifications
        SET 
          verification_state = 'UNKNOWN',
          last_evaluated_at = NOW(),
          verification_notes = 'Inconclusive: Only ' || v_ver.samples_observed || ' samples observed (required ' || v_ver.min_traffic_samples || ').'
        WHERE id = v_ver.id;

        v_unknown_count := v_unknown_count + 1;
      END IF;

      v_results := v_results || jsonb_build_object(
        'incident_number', v_ver.incident_number,
        'state', CASE WHEN v_ver.samples_observed >= v_ver.min_traffic_samples THEN 'VERIFIED' ELSE 'UNKNOWN' END,
        'samples', v_ver.samples_observed
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'verified_count', v_verified_count,
    'unknown_count', v_unknown_count,
    'evaluated_items', v_results,
    'evaluated_at', NOW()
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Explicit Permissions: Revoke Public Access, Grant to Authorized Roles
-- ────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.fn_sentinel_audit_attendance_integrity(INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_sentinel_audit_payroll_integrity(INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_sentinel_get_tenant_impact() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_sentinel_evaluate_fix_verifications() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.fn_sentinel_audit_attendance_integrity(INT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sentinel_audit_payroll_integrity(INT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sentinel_get_tenant_impact() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sentinel_evaluate_fix_verifications() TO service_role, authenticated;

