-- supabase/migrations/20261114_joy_sentinel_v7_phase2_phase3.sql
-- ============================================================================
-- JOY SENTINEL V7: Phases 2 & 3 — Autonomous Reliability, SLOs, Postmortems & Briefing
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Sentinel Service Level Objectives (SLOs) & Error Budget Intelligence
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sentinel_slos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key VARCHAR(64) UNIQUE NOT NULL,      -- 'AUTH_GATEWAY', 'ATTENDANCE_PUNCH', 'PAYROLL_EXEC', 'AIRTEL_SMS'
  service_name VARCHAR(128) NOT NULL,
  target_slo_percentage NUMERIC(5,2) DEFAULT 99.90, -- e.g. 99.90%
  rolling_window_days INT DEFAULT 30,
  total_events INT DEFAULT 0,
  successful_events INT DEFAULT 0,
  failed_events INT DEFAULT 0,
  current_slo_percentage NUMERIC(5,2) DEFAULT 100.00,
  error_budget_total INT DEFAULT 100,           -- Maximum tolerated errors in window
  error_budget_consumed INT DEFAULT 0,
  error_budget_remaining INT DEFAULT 100,
  burn_rate_1h NUMERIC(5,2) DEFAULT 0.00,       -- 1.0 = burning at sustainable rate, >14.4 = 1h fast burn
  burn_rate_24h NUMERIC(5,2) DEFAULT 0.00,
  status VARCHAR(24) DEFAULT 'HEALTHY',         -- 'HEALTHY', 'AT_RISK', 'EXHAUSTED'
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sentinel_slos_key ON public.sentinel_slos(service_key);
CREATE INDEX IF NOT EXISTS idx_sentinel_slos_status ON public.sentinel_slos(status);

-- Seed Initial Enterprise SLO Targets
INSERT INTO public.sentinel_slos (
  service_key, service_name, target_slo_percentage, rolling_window_days, 
  error_budget_total, error_budget_remaining, status
) VALUES
  ('AUTH_GATEWAY', 'Authentication & Session Engine', 99.95, 30, 50, 50, 'HEALTHY'),
  ('ATTENDANCE_PUNCH', 'Biometric ADMS Punch Pipeline', 99.90, 30, 100, 100, 'HEALTHY'),
  ('PAYROLL_EXEC', 'Payroll Batch Calculation & Disbursal', 99.99, 30, 5, 5, 'HEALTHY'),
  ('AIRTEL_SMS', 'Carrier Communication & DLT Gateway', 99.50, 30, 200, 200, 'HEALTHY')
ON CONFLICT (service_key) DO UPDATE SET
  service_name = EXCLUDED.service_name,
  target_slo_percentage = EXCLUDED.target_slo_percentage;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Sentinel Incident Postmortems & Engineering Memory
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sentinel_postmortems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.sentinel_incidents(id) ON DELETE SET NULL,
  incident_number VARCHAR(32) UNIQUE NOT NULL,
  error_code VARCHAR(32) NOT NULL,
  summary TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  trigger_mechanism TEXT NOT NULL,
  detection_time_mins INT DEFAULT 0,
  resolution_time_mins INT DEFAULT 0,
  preventative_actions JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT FALSE,
  published_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_postmortems_inc ON public.sentinel_postmortems(incident_number);
CREATE INDEX IF NOT EXISTS idx_sentinel_postmortems_code ON public.sentinel_postmortems(error_code);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Row-Level Security (RLS) Hardening
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.sentinel_slos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_postmortems ENABLE ROW LEVEL SECURITY;

-- Default-deny for anonymous and client roles
REVOKE ALL ON public.sentinel_slos FROM anon, authenticated;
REVOKE ALL ON public.sentinel_postmortems FROM anon, authenticated;

-- Service role bypass
CREATE POLICY "Allow service role full access on sentinel_slos"
  ON public.sentinel_slos FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on sentinel_postmortems"
  ON public.sentinel_postmortems FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Platform admin read-only access
CREATE POLICY "Allow platform admin read on sentinel_slos"
  ON public.sentinel_slos FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Allow platform admin read on sentinel_postmortems"
  ON public.sentinel_postmortems FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RPC: Evaluate Enterprise SLOs and Error Budget Burn Rates
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sentinel_evaluate_slos()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB := '[]'::jsonb;
  v_comm_total INT;
  v_comm_success INT;
  v_comm_failed INT;
  v_comm_slo NUMERIC(5,2);
  v_comm_budget_consumed INT;
  v_comm_budget_rem INT;
  v_comm_burn NUMERIC(5,2);
  v_comm_status VARCHAR(24);
  v_att_orphans INT;
  v_pay_math_errs INT;
  v_caller_role TEXT;
BEGIN
  v_caller_role := COALESCE(current_setting('request.jwt.claim.role', true), 'service_role');
  IF v_caller_role = 'authenticated' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: caller does not hold platform administrator authorization.';
  END IF;

  -- 1. Evaluate AIRTEL_SMS from real carrier communication_dispatch_logs
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'DELIVERED'),
    COUNT(*) FILTER (WHERE status IN ('FAILED', 'REJECTED', 'UNDELIVERED'))
  INTO v_comm_total, v_comm_success, v_comm_failed
  FROM public.communication_dispatch_logs
  WHERE created_at >= NOW() - INTERVAL '30 days';

  IF v_comm_total > 0 THEN
    v_comm_slo := ROUND(((v_comm_success::NUMERIC / v_comm_total::NUMERIC) * 100.0), 2);
    v_comm_budget_consumed := v_comm_failed;
    v_comm_budget_rem := GREATEST(0, 200 - v_comm_budget_consumed);
    v_comm_burn := ROUND((v_comm_failed::NUMERIC / 30.0), 2);
    v_comm_status := CASE 
      WHEN v_comm_budget_rem = 0 THEN 'EXHAUSTED'
      WHEN v_comm_slo < 99.50 THEN 'AT_RISK'
      ELSE 'HEALTHY'
    END;
  ELSE
    v_comm_slo := 100.00;
    v_comm_budget_consumed := 0;
    v_comm_budget_rem := 200;
    v_comm_burn := 0.00;
    v_comm_status := 'HEALTHY';
  END IF;

  UPDATE public.sentinel_slos
  SET 
    total_events = v_comm_total,
    successful_events = v_comm_success,
    failed_events = v_comm_failed,
    current_slo_percentage = v_comm_slo,
    error_budget_consumed = v_comm_budget_consumed,
    error_budget_remaining = v_comm_budget_rem,
    burn_rate_24h = v_comm_burn,
    status = v_comm_status,
    last_calculated_at = NOW()
  WHERE service_key = 'AIRTEL_SMS';

  -- 2. Evaluate ATTENDANCE_PUNCH from attendance_punches & attendance_daily
  SELECT COUNT(*) INTO v_att_orphans
  FROM public.attendance_punches p
  WHERE p.created_at >= NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance_daily d
      WHERE d.organization_id = p.organization_id
        AND d.employee_id = p.employee_id
        AND d.attendance_date = p.punch_time::date
    );

  UPDATE public.sentinel_slos
  SET 
    failed_events = v_att_orphans,
    current_slo_percentage = CASE WHEN v_att_orphans = 0 THEN 100.00 ELSE 99.85 END,
    error_budget_consumed = v_att_orphans,
    error_budget_remaining = GREATEST(0, 100 - v_att_orphans),
    status = CASE WHEN v_att_orphans > 0 THEN 'AT_RISK' ELSE 'HEALTHY' END,
    last_calculated_at = NOW()
  WHERE service_key = 'ATTENDANCE_PUNCH';

  -- 3. Evaluate PAYROLL_EXEC from payroll_line_items & payslips
  SELECT COUNT(*) INTO v_pay_math_errs
  FROM public.payroll_runs pr
  JOIN public.payroll_line_items pli ON pli.payroll_run_id = pr.id
  WHERE pr.created_at >= NOW() - INTERVAL '90 days'
    AND pr.status IN ('APPROVED', 'DISBURSED', 'LOCKED')
    AND ABS((pli.gross_earnings - pli.total_deductions) - pli.net_pay) > 1.0;

  UPDATE public.sentinel_slos
  SET 
    failed_events = v_pay_math_errs,
    current_slo_percentage = CASE WHEN v_pay_math_errs = 0 THEN 100.00 ELSE 99.50 END,
    error_budget_consumed = v_pay_math_errs,
    error_budget_remaining = GREATEST(0, 5 - v_pay_math_errs),
    status = CASE WHEN v_pay_math_errs > 0 THEN 'AT_RISK' ELSE 'HEALTHY' END,
    last_calculated_at = NOW()
  WHERE service_key = 'PAYROLL_EXEC';

  -- Return all live SLO records
  SELECT jsonb_agg(
    jsonb_build_object(
      'service_key', s.service_key,
      'service_name', s.service_name,
      'target_slo', s.target_slo_percentage,
      'current_slo', s.current_slo_percentage,
      'error_budget_remaining', s.error_budget_remaining,
      'error_budget_total', s.error_budget_total,
      'burn_rate_24h', s.burn_rate_24h,
      'status', s.status,
      'last_calculated_at', s.last_calculated_at
    ) ORDER BY s.service_key
  ) INTO v_result
  FROM public.sentinel_slos s;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RPC: Cost & Resource Burn Rate Forecaster
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sentinel_get_cost_forecast()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_db_size TEXT;
  v_sms_count_30d INT;
  v_sms_cost_estimate NUMERIC(10,2);
  v_total_employees INT;
  v_active_tenants INT;
  v_caller_role TEXT;
BEGIN
  v_caller_role := COALESCE(current_setting('request.jwt.claim.role', true), 'service_role');
  IF v_caller_role = 'authenticated' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: caller does not hold platform administrator authorization.';
  END IF;

  -- 1. Database storage footprint
  SELECT pg_size_pretty(pg_database_size(current_database())) INTO v_db_size;

  -- 2. 30-Day SMS Dispatch Count (Airtel IQ rate approx ₹0.18 per DLT transactional SMS)
  SELECT COUNT(*) INTO v_sms_count_30d
  FROM public.communication_dispatch_logs
  WHERE created_at >= NOW() - INTERVAL '30 days'
    AND channel = 'SMS';

  v_sms_cost_estimate := ROUND((v_sms_count_30d * 0.18)::NUMERIC, 2);

  -- 3. Tenant & Workforce active count
  SELECT COUNT(DISTINCT organization_id) INTO v_active_tenants FROM public.organization_memberships;
  SELECT COUNT(*) INTO v_total_employees FROM public.employees WHERE employment_status = 'ACTIVE' OR employment_status IS NULL;

  RETURN jsonb_build_object(
    'database_size', v_db_size,
    'sms_dispatches_30d', v_sms_count_30d,
    'estimated_sms_spend_inr', v_sms_cost_estimate,
    'projected_monthly_sms_burn_inr', ROUND((v_sms_cost_estimate * 1.15)::NUMERIC, 2),
    'active_tenants_count', v_active_tenants,
    'active_employees_count', v_total_employees,
    'evaluated_at', NOW()
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. RPC: Recurring Incident Pattern Intelligence (Engineering Memory)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sentinel_get_recurring_patterns()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_caller_role TEXT;
BEGIN
  v_caller_role := COALESCE(current_setting('request.jwt.claim.role', true), 'service_role');
  IF v_caller_role = 'authenticated' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: caller does not hold platform administrator authorization.';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'error_code', sub.error_code,
      'service_name', sub.service_name,
      'total_incidents', sub.total_incidents,
      'total_occurrences', sub.total_occurrences,
      'latest_incident', sub.latest_incident,
      'first_seen', sub.first_seen,
      'last_seen', sub.last_seen,
      'lifecycle_state', sub.lifecycle_state,
      'is_chronic', sub.total_incidents > 1 OR sub.total_occurrences >= 5
    ) ORDER BY sub.total_occurrences DESC
  ) INTO v_result
  FROM (
    SELECT 
      error_code,
      service_name,
      COUNT(DISTINCT id) as total_incidents,
      SUM(occurrence_count) as total_occurrences,
      MAX(incident_number) as latest_incident,
      MIN(first_seen_at) as first_seen,
      MAX(last_seen_at) as last_seen,
      MAX(lifecycle_state) as lifecycle_state
    FROM public.sentinel_incidents
    GROUP BY error_code, service_name
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Grant execution to service_role and authenticated
GRANT EXECUTE ON FUNCTION public.fn_sentinel_evaluate_slos() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sentinel_get_cost_forecast() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sentinel_get_recurring_patterns() TO service_role, authenticated;
