-- supabase/migrations/20261114_joy_sentinel_deployments.sql
-- ============================================================================
-- JOY SENTINEL: Phase V3 — Deployments & GitHub Webhook Telemetry
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sentinel_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(32) DEFAULT 'github',
  event_type VARCHAR(32) NOT NULL, -- 'pull_request', 'push', 'workflow_run', 'deployment'
  commit_sha VARCHAR(64) NOT NULL,
  commit_short_sha VARCHAR(16) NOT NULL,
  commit_message TEXT,
  author_name VARCHAR(64),
  author_login VARCHAR(64),
  branch VARCHAR(64) NOT NULL DEFAULT 'main',
  pr_number INT,
  pr_title TEXT,
  status VARCHAR(16) DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED', 'PENDING'
  environment VARCHAR(32) DEFAULT 'production',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_deployments_created ON public.sentinel_deployments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentinel_deployments_sha ON public.sentinel_deployments(commit_sha);
CREATE INDEX IF NOT EXISTS idx_sentinel_deployments_branch ON public.sentinel_deployments(branch);

-- Enable Row Level Security
ALTER TABLE public.sentinel_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on sentinel_deployments"
  ON public.sentinel_deployments FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read on sentinel_deployments"
  ON public.sentinel_deployments FOR SELECT TO authenticated USING (true);
