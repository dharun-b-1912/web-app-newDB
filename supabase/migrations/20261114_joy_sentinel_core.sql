-- supabase/migrations/20261114_joy_sentinel_core.sql
-- ============================================================================
-- JOY SENTINEL — Autonomous SaaS Reliability & Engineering Operations Center
-- Dedicated Telemetry Vault: Events, Deduplicated Incidents, On-Call Directory
-- ============================================================================

-- 1. Raw Telemetry Event Stream (Non-blocking, Event-Driven Ingestion)
CREATE TABLE IF NOT EXISTS public.sentinel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code VARCHAR(32) NOT NULL,
  severity VARCHAR(16) NOT NULL, -- 'P0', 'P1', 'P2', 'P3', 'P4'
  service_name VARCHAR(64) NOT NULL,
  environment VARCHAR(16) DEFAULT 'production',
  organization_id UUID,
  source_location VARCHAR(255),
  message TEXT NOT NULL,
  diagnostic_payload JSONB DEFAULT '{}'::jsonb,
  fingerprint VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_events_code ON public.sentinel_events(event_code);
CREATE INDEX IF NOT EXISTS idx_sentinel_events_fingerprint ON public.sentinel_events(fingerprint);
CREATE INDEX IF NOT EXISTS idx_sentinel_events_created ON public.sentinel_events(created_at DESC);

-- 2. Deduplicated Platform Incidents
CREATE TABLE IF NOT EXISTS public.sentinel_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number VARCHAR(32) UNIQUE NOT NULL, -- e.g. INC-2026-00101
  fingerprint VARCHAR(128) UNIQUE NOT NULL,    -- dedup cluster key
  error_code VARCHAR(32) NOT NULL,
  severity VARCHAR(16) NOT NULL,              -- 'P0', 'P1', 'P2', 'P3', 'P4'
  lifecycle_state VARCHAR(24) DEFAULT 'DETECTED', -- 'DETECTED', 'ACKNOWLEDGED', 'MITIGATING', 'RESOLVED', 'CLOSED'
  title TEXT NOT NULL,
  summary TEXT,
  service_name VARCHAR(64) NOT NULL,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  occurrence_count INT DEFAULT 1,
  affected_tenants_count INT DEFAULT 1,
  assigned_to VARCHAR(64),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(64),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(64),
  resolution_notes TEXT,
  probable_cause TEXT,
  evidence JSONB DEFAULT '{}'::jsonb,
  recommended_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_incidents_state ON public.sentinel_incidents(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_sentinel_incidents_severity ON public.sentinel_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_sentinel_incidents_last_seen ON public.sentinel_incidents(last_seen_at DESC);

-- 3. On-Call Developer Directory & Escalation Config
CREATE TABLE IF NOT EXISTS public.sentinel_oncall_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_name VARCHAR(64) NOT NULL,
  phone VARCHAR(16) NOT NULL,
  telegram_chat_id VARCHAR(32) NOT NULL,
  role_tier VARCHAR(16) NOT NULL, -- 'PRIMARY', 'SECONDARY', 'LEAD'
  is_active BOOLEAN DEFAULT TRUE,
  ack_timeout_mins INT DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial On-Call Engineers
INSERT INTO public.sentinel_oncall_schedules (developer_name, phone, telegram_chat_id, role_tier, is_active, ack_timeout_mins)
VALUES
  ('Lead Cloud Architect', '919384125278', '9155594412', 'PRIMARY', true, 15),
  ('Head of Engineering Ops', '919944399088', '9155594412', 'SECONDARY', true, 15)
ON CONFLICT DO NOTHING;

-- Enable RLS with public service role bypass
ALTER TABLE public.sentinel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_oncall_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on sentinel_events"
  ON public.sentinel_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on sentinel_incidents"
  ON public.sentinel_incidents FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on sentinel_oncall_schedules"
  ON public.sentinel_oncall_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on sentinel_incidents"
  ON public.sentinel_incidents FOR SELECT TO authenticated USING (true);
