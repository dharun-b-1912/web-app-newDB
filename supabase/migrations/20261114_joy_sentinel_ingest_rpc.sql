-- supabase/migrations/20261114_joy_sentinel_ingest_rpc.sql
-- ============================================================================
-- JOY SENTINEL: Autonomous Event Ingestion & Deduplication RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_sentinel_ingest_event(
  p_event_code VARCHAR(32),
  p_severity VARCHAR(16),
  p_service_name VARCHAR(64),
  p_message TEXT,
  p_source_location VARCHAR(255) DEFAULT 'global',
  p_diagnostic_payload JSONB DEFAULT '{}'::jsonb,
  p_probable_cause TEXT DEFAULT NULL,
  p_recommended_action TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fingerprint VARCHAR(128);
  v_incident RECORD;
  v_next_inc_num VARCHAR(32);
  v_date_prefix VARCHAR(16);
  v_seq INT;
  v_result JSONB;
BEGIN
  -- 1. Compute deduplication fingerprint
  v_fingerprint := md5(p_event_code || ':' || p_service_name || ':' || COALESCE(p_source_location, 'global'));

  -- 2. Insert into raw telemetry events stream
  INSERT INTO public.sentinel_events (
    event_code,
    severity,
    service_name,
    environment,
    source_location,
    message,
    diagnostic_payload,
    fingerprint,
    created_at
  ) VALUES (
    p_event_code,
    p_severity,
    p_service_name,
    'production',
    p_source_location,
    p_message,
    p_diagnostic_payload,
    v_fingerprint,
    NOW()
  );

  -- 3. Check for existing active incident with this fingerprint
  SELECT * INTO v_incident
  FROM public.sentinel_incidents
  WHERE fingerprint = v_fingerprint
    AND lifecycle_state NOT IN ('RESOLVED', 'CLOSED')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Deduplicate & aggregate
    UPDATE public.sentinel_incidents
    SET 
      occurrence_count = occurrence_count + 1,
      last_seen_at = NOW(),
      evidence = p_diagnostic_payload,
      severity = CASE 
        WHEN p_severity = 'P0' THEN 'P0'
        WHEN p_severity = 'P1' AND severity != 'P0' THEN 'P1'
        ELSE severity
      END,
      probable_cause = COALESCE(p_probable_cause, probable_cause),
      recommended_action = COALESCE(p_recommended_action, recommended_action)
    WHERE id = v_incident.id
    RETURNING * INTO v_incident;

    v_result := jsonb_build_object(
      'status', 'AGGREGATED',
      'incident_number', v_incident.incident_number,
      'severity', v_incident.severity,
      'occurrence_count', v_incident.occurrence_count,
      'lifecycle_state', v_incident.lifecycle_state,
      'is_new', false
    );
  ELSE
    -- Generate new sequential incident number for the day: INC-YYYYMMDD-0001
    v_date_prefix := to_char(NOW(), 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_seq
    FROM public.sentinel_incidents
    WHERE incident_number LIKE 'INC-' || v_date_prefix || '-%';

    v_next_inc_num := 'INC-' || v_date_prefix || '-' || LPAD(v_seq::text, 4, '0');

    -- Insert new incident
    INSERT INTO public.sentinel_incidents (
      incident_number,
      fingerprint,
      error_code,
      severity,
      lifecycle_state,
      title,
      summary,
      service_name,
      first_seen_at,
      last_seen_at,
      occurrence_count,
      affected_tenants_count,
      probable_cause,
      evidence,
      recommended_action,
      created_at
    ) VALUES (
      v_next_inc_num,
      v_fingerprint,
      p_event_code,
      p_severity,
      'DETECTED',
      p_message,
      p_message,
      p_service_name,
      NOW(),
      NOW(),
      1,
      1,
      p_probable_cause,
      p_diagnostic_payload,
      p_recommended_action,
      NOW()
    )
    RETURNING * INTO v_incident;

    v_result := jsonb_build_object(
      'status', 'CREATED',
      'incident_number', v_incident.incident_number,
      'severity', v_incident.severity,
      'occurrence_count', 1,
      'lifecycle_state', v_incident.lifecycle_state,
      'is_new', true
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execution to service_role and authenticated
GRANT EXECUTE ON FUNCTION public.fn_sentinel_ingest_event TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_sentinel_ingest_event TO anon;
GRANT EXECUTE ON FUNCTION public.fn_sentinel_ingest_event TO authenticated;

