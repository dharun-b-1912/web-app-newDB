-- supabase/migrations/20261114_joy_sentinel_v4_v5_v6.sql
-- ============================================================================
-- JOY SENTINEL: Phases V4, V5, V6 Database Architecture
-- ============================================================================

-- 1. Phase V5: Automated Root-Cause Diagnostic Runbooks
CREATE TABLE IF NOT EXISTS public.sentinel_diagnostic_runbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code VARCHAR(32) NOT NULL UNIQUE,
  module VARCHAR(64) NOT NULL,
  title TEXT NOT NULL,
  probable_cause_pattern TEXT NOT NULL,
  investigation_steps JSONB NOT NULL,
  recommended_actions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Runbooks
INSERT INTO public.sentinel_diagnostic_runbooks (error_code, module, title, probable_cause_pattern, investigation_steps, recommended_actions)
VALUES
  (
    'ATT-001',
    'Attendance Core Engine',
    'Biometric Punch Ingestion Failure / Timeout',
    'ADMS Gateway unable to commit punch transaction due to DB lock, invalid employee ID mapping, or duplicate non-idempotent punch.',
    '["1. Check /adms-gateway edge function logs for HTTP 500/504 errors.", "2. Verify terminal serial number in biometric_devices.", "3. Inspect attendance_punches for duplicate punches on same device.", "4. Check if recent deployment modified attendance RPC."]'::jsonb,
    '["Do not bulk re-punch raw records without verifying idempotency.", "Verify device internet connectivity via /devices command.", "Inspect Postgres lock contention on attendance_punches table."]'::jsonb
  ),
  (
    'SMS-001',
    'Carrier Communication Hub',
    'Airtel IQ Gateway Rejection / DLT Non-Compliance',
    'Carrier rejected dispatch due to non-whitelisted priority flag, DLT template variable mismatch, or insufficient prepaid balance.',
    '["1. Check communication_dispatch_logs for error_message details.", "2. Verify DLT Principal Entity ID 1001333025440167393 is active.", "3. Verify template ID matches TRAI registration (1077076930061928891).", "4. Confirm payload omits restricted priority: HIGH field."]'::jsonb,
    '["Verify Airtel IQ prepaid credit balance on iqsms.airtel.in.", "Ensure only whitelisted headers (JCSPRL) are dispatched.", "Run /airtel command to review realtime carrier success rate."]'::jsonb
  ),
  (
    'AUTH-001',
    'Platform Security & IAM',
    'Tenant Authentication Failure / Token Invalidation',
    'Supabase Auth JWT expired, invalid organization membership, or revoked credentials for admin account.',
    '["1. Check auth.users table for user account status.", "2. Verify organization_memberships row for target tenant.", "3. Review Supabase Auth audit logs for failed login attempts."]'::jsonb,
    '["Inspect edge function CORS and Authorization headers.", "Verify RLS policies on organization_memberships.", "Do not reset credentials without developer audit."]'::jsonb
  ),
  (
    'DB-001',
    'PostgreSQL Database Core',
    'Database Connection Exhaustion / Query Latency Spike',
    'Connection pool saturation, unindexed foreign key query, or runaway analytical aggregate.',
    '["1. Check pg_stat_activity for long-running queries (>2000ms).", "2. Inspect Supabase pooler (pgBouncer / Supavisor) connection count.", "3. Verify indexes on foreign keys and tenant_id columns."]'::jsonb,
    '["Terminate long-running unindexed queries using pg_cancel_backend().", "Verify Supavisor transaction pool mode is active.", "Scale read-replicas if analytical reporting causes load."]'::jsonb
  ),
  (
    'PAY-001',
    'Payroll Calculation Pipeline',
    'Payroll Batch Processing Inconsistency / Deviation',
    'Salary structure misconfiguration, unapproved attendance regularization, or statutory tax rule mismatch.',
    '["1. Check payroll_runs for status and error logs.", "2. Verify employee salary structure components.", "3. Check Code on Wages OT calculation policy for target branch."]'::jsonb,
    '["Halt automated payroll disallowance until manual review.", "Inspect attendance cutoff dates on shifts.", "Re-run payroll simulation in dry-run mode before final approval."]'::jsonb
  ),
  (
    'FACE-001',
    'FaceAttend SaaS Module',
    'Face Verification Quality / Confidence Threshold Failure',
    'Client camera resolution below requirement, poor lighting, or biometric embedding model version mismatch.',
    '["1. Check face_enrollments for target employee embedding quality.", "2. Inspect client face-matcher logs in Flutter console.", "3. Verify anti-spoof liveness score in diagnostic payload."]'::jsonb,
    '["Instruct employee to re-capture face profile under proper lighting.", "Verify faceattend_entitlements table for organization tenant.", "Inspect mobile device model and OS camera permissions."]'::jsonb
  ),
  (
    'TENANT-001',
    'Multi-Tenant Isolation',
    'Tenant Isolation Breach Attempt / Cross-Tenant Leakage',
    'RLS policy bypass detected or missing organization_id filter in database query.',
    '["1. IMMEDIATELY isolate affected session in platform_sessions.", "2. Review SQL query location reported in source_location.", "3. Inspect RLS policy on target table."]'::jsonb,
    '["Escalate immediately as P0 incident.", "Revoke session token for calling client.", "Audit all rows accessed during the anomalous session."]'::jsonb
  )
ON CONFLICT (error_code) DO UPDATE SET
  module = EXCLUDED.module,
  title = EXCLUDED.title,
  probable_cause_pattern = EXCLUDED.probable_cause_pattern,
  investigation_steps = EXCLUDED.investigation_steps,
  recommended_actions = EXCLUDED.recommended_actions;

-- 2. Phase V6: Predictive Resource Saturation & Predictive Maintenance Planner
CREATE TABLE IF NOT EXISTS public.sentinel_predictive_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key VARCHAR(64) NOT NULL UNIQUE,
  metric_name VARCHAR(128) NOT NULL,
  current_value NUMERIC NOT NULL,
  unit VARCHAR(32) NOT NULL,
  warning_threshold NUMERIC NOT NULL,
  critical_threshold NUMERIC NOT NULL,
  status VARCHAR(16) DEFAULT 'HEALTHY', -- 'HEALTHY', 'WARNING', 'CRITICAL'
  trend VARCHAR(16) DEFAULT 'STABLE',    -- 'IMPROVING', 'STABLE', 'DEGRADING'
  prediction_notes TEXT,
  recommended_maintenance TEXT,
  last_evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Predictive Metrics
INSERT INTO public.sentinel_predictive_metrics (metric_key, metric_name, current_value, unit, warning_threshold, critical_threshold, status, trend, prediction_notes, recommended_maintenance)
VALUES
  (
    'CARRIER_SMS_SUCCESS_RATE',
    'Airtel IQ Gateway Delivery Rate',
    100,
    '%',
    80,
    60,
    'HEALTHY',
    'IMPROVING',
    'Prepaid delivery nominal post-fix. 9/9 recent dispatches delivered with confirmed Airtel message IDs.',
    'Monitor daily carrier invoice and top-up prepaid SMS balance when units dip below 500.'
  ),
  (
    'BIOMETRIC_DEVICE_ONLINE_RATIO',
    'Hardware Attendance Terminals Online',
    100,
    '%',
    70,
    50,
    'HEALTHY',
    'STABLE',
    'All registered eSSL ADMS biometric devices active with sub-30s heartbeat cadence.',
    'Schedule quarterly firmware inspection for all field terminals.'
  ),
  (
    'ACTIVE_INCIDENTS_COUNT',
    'Unresolved P0/P1 Critical Incidents',
    0,
    'incidents',
    1,
    3,
    'HEALTHY',
    'STABLE',
    'Zero unacknowledged high-severity platform incidents open.',
    'Maintain 15-minute Night Watch SLA escalation readiness.'
  ),
  (
    'DATABASE_STORAGE_CAPACITY',
    'PostgreSQL Disk Space Allocation',
    14.2,
    '%',
    75,
    90,
    'HEALTHY',
    'STABLE',
    'Storage consumption is well within provisioned 50GB tier.',
    'Run monthly pg_cron table vacuuming on raw attendance_punches and audit logs.'
  ),
  (
    'EDGE_FUNCTION_LATENCY',
    'Supabase Edge Function Execution P95',
    185,
    'ms',
    800,
    1500,
    'HEALTHY',
    'STABLE',
    'All API routes operating under 250ms threshold with warm Deno isolates.',
    'Pre-warm edge worker instances during peak shift hours (08:30 AM and 05:30 PM).'
  )
ON CONFLICT (metric_key) DO UPDATE SET
  current_value = EXCLUDED.current_value,
  status = EXCLUDED.status,
  trend = EXCLUDED.trend,
  prediction_notes = EXCLUDED.prediction_notes,
  recommended_maintenance = EXCLUDED.recommended_maintenance,
  last_evaluated_at = NOW();

-- 3. Phase V4: Autonomous Night Watch Escalation RPC
CREATE OR REPLACE FUNCTION public.fn_sentinel_check_nightwatch_escalation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_breached RECORD;
  v_secondary RECORD;
  v_escalated_count INT := 0;
  v_escalated_ids JSONB := '[]'::jsonb;
BEGIN
  -- Get active secondary on-call engineer
  SELECT * INTO v_secondary
  FROM public.sentinel_oncall_schedules
  WHERE role_tier = 'SECONDARY' AND is_active = true
  LIMIT 1;

  -- Find all P0/P1 incidents created > 15 mins ago still in 'DETECTED' state and not yet escalated
  FOR v_breached IN
    SELECT *
    FROM public.sentinel_incidents
    WHERE severity IN ('P0', 'P1')
      AND lifecycle_state = 'DETECTED'
      AND created_at <= NOW() - INTERVAL '15 minutes'
      AND (evidence->>'escalated_to_tier' IS NULL OR evidence->>'escalated_to_tier' != 'SECONDARY')
  LOOP
    -- Mark incident as escalated to SECONDARY
    UPDATE public.sentinel_incidents
    SET
      assigned_to = COALESCE(v_secondary.developer_name, 'Secondary On-Call'),
      evidence = COALESCE(evidence, '{}'::jsonb) || jsonb_build_object(
        'escalated_to_tier', 'SECONDARY',
        'escalated_at', NOW(),
        'escalated_to_name', v_secondary.developer_name,
        'escalated_to_chat_id', v_secondary.telegram_chat_id,
        'reason', 'Primary developer acknowledgement timeout (15 mins)'
      )
    WHERE id = v_breached.id;

    v_escalated_count := v_escalated_count + 1;
    v_escalated_ids := v_escalated_ids || jsonb_build_object(
      'incident_number', v_breached.incident_number,
      'severity', v_breached.severity,
      'title', v_breached.title,
      'error_code', v_breached.error_code,
      'created_at', v_breached.created_at,
      'escalated_to', v_secondary.developer_name,
      'secondary_chat_id', v_secondary.telegram_chat_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'escalated_count', v_escalated_count,
    'escalated_incidents', v_escalated_ids,
    'checked_at', NOW()
  );
END;
$$;

-- Enable RLS & Grants
ALTER TABLE public.sentinel_diagnostic_runbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_predictive_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on sentinel_diagnostic_runbooks"
  ON public.sentinel_diagnostic_runbooks FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on sentinel_diagnostic_runbooks"
  ON public.sentinel_diagnostic_runbooks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role full access on sentinel_predictive_metrics"
  ON public.sentinel_predictive_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on sentinel_predictive_metrics"
  ON public.sentinel_predictive_metrics FOR SELECT TO authenticated USING (true);
