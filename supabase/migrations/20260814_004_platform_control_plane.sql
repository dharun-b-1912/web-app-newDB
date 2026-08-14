-- ============================================================
-- WorkForceOS Enterprise HRMS — Platform Control Plane 2.0 Schema
-- Migration: 20260814_004_platform_control_plane.sql
-- ============================================================
-- Adds enterprise tables for SaaS control plane:
-- Plans, Subscriptions, Invoices, Usage Events, Feature Flags,
-- Incidents, Background Jobs, Webhooks, API Keys, Audit Logs,
-- and Impersonation Sessions.
-- ============================================================

-- Enable UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SUBSCRIPTION PLANS & ENTITLEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_plans (
  id                       TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  tier_code                TEXT NOT NULL UNIQUE,
  max_employees            INT NOT NULL DEFAULT 50,
  max_admins               INT NOT NULL DEFAULT 3,
  storage_gb               INT NOT NULL DEFAULT 20,
  api_requests_per_month   INT NOT NULL DEFAULT 100000,
  whatsapp_limit           INT NOT NULL DEFAULT 1000,
  price_monthly            NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_annual             NUMERIC(12,2) NOT NULL DEFAULT 0,
  features                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TENANT SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id                  TEXT PRIMARY KEY DEFAULT ('sub-' || gen_random_uuid()::text),
  tenant_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id             TEXT NOT NULL REFERENCES platform_plans(id),
  plan_name           TEXT NOT NULL,
  billing_cycle       TEXT NOT NULL CHECK (billing_cycle IN ('Monthly', 'Annual')),
  seats_allocated     INT NOT NULL DEFAULT 50,
  seats_used          INT NOT NULL DEFAULT 1,
  unit_price          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'INR',
  status              TEXT NOT NULL CHECK (status IN ('Trial', 'Active', 'Grace Period', 'Past Due', 'Suspended', 'Cancelled')),
  auto_renew          BOOLEAN NOT NULL DEFAULT TRUE,
  trial_ends_at       TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ NOT NULL,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. FINANCIAL INVOICES & PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_invoices (
  id                  TEXT PRIMARY KEY DEFAULT ('inv-' || gen_random_uuid()::text),
  invoice_number      TEXT NOT NULL UNIQUE,
  tenant_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id     TEXT REFERENCES platform_subscriptions(id),
  subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate_percent    NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  gst_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'INR',
  status              TEXT NOT NULL CHECK (status IN ('Draft', 'Issued', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled', 'Refunded')),
  due_date            DATE NOT NULL,
  paid_at             TIMESTAMPTZ,
  payment_method      TEXT,
  payment_gateway_ref TEXT,
  reconciliation_status TEXT NOT NULL DEFAULT 'Matched' CHECK (reconciliation_status IN ('Matched', 'Unmatched', 'Needs Review', 'Resolved')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. USAGE METERING & RESOURCE EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_usage_snapshots (
  id                  TEXT PRIMARY KEY DEFAULT ('use-' || gen_random_uuid()::text),
  tenant_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employees_used      INT NOT NULL DEFAULT 0,
  employees_quota     INT NOT NULL DEFAULT 50,
  storage_gb_used     NUMERIC(8,2) NOT NULL DEFAULT 0,
  storage_gb_quota    INT NOT NULL DEFAULT 20,
  api_calls_used      INT NOT NULL DEFAULT 0,
  api_calls_quota     INT NOT NULL DEFAULT 100000,
  whatsapp_sent       INT NOT NULL DEFAULT 0,
  whatsapp_quota      INT NOT NULL DEFAULT 1000,
  snapshot_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_usage_events (
  id                  TEXT PRIMARY KEY DEFAULT ('uevt-' || gen_random_uuid()::text),
  tenant_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type         TEXT NOT NULL CHECK (metric_type IN ('API_CALL', 'WHATSAPP_MSG', 'EMAIL_MSG', 'STORAGE_UPLOAD', 'AI_PROMPT', 'BIOMETRIC_PUNCH')),
  quantity            NUMERIC(10,2) NOT NULL DEFAULT 1,
  source              TEXT,
  metadata            JSONB DEFAULT '{}'::jsonb,
  recorded_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. FEATURE FLAGS & ENTITLEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_feature_flags (
  key                  TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  description          TEXT,
  category             TEXT NOT NULL DEFAULT 'Core',
  status               TEXT NOT NULL CHECK (status IN ('Active', 'Beta', 'Disabled', 'Deprecated')),
  environment          TEXT NOT NULL CHECK (environment IN ('Production', 'Staging', 'All')),
  default_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_plans        JSONB NOT NULL DEFAULT '["Enterprise"]'::jsonb,
  rollout_percentage   INT NOT NULL DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
  updated_by           TEXT,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_tenant_feature_overrides (
  id                  TEXT PRIMARY KEY DEFAULT ('fovr-' || gen_random_uuid()::text),
  tenant_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key         TEXT NOT NULL REFERENCES platform_feature_flags(key) ON DELETE CASCADE,
  is_enabled          BOOLEAN NOT NULL,
  reason              TEXT,
  granted_by          TEXT NOT NULL,
  granted_at          TIMESTAMPTZ DEFAULT NOW(),
  expires_at          TIMESTAMPTZ,
  UNIQUE(tenant_id, feature_key)
);

-- ============================================================
-- 6. INCIDENT MANAGEMENT & SLA OBSERVABILITY
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_incidents (
  id                  TEXT PRIMARY KEY DEFAULT ('inc-' || gen_random_uuid()::text),
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  severity            TEXT NOT NULL CHECK (severity IN ('SEV-1 Critical', 'SEV-2 Major', 'SEV-3 Moderate', 'SEV-4 Minor')),
  status              TEXT NOT NULL CHECK (status IN ('Investigating', 'Identified', 'Monitoring', 'Resolved', 'Closed')),
  affected_services   JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_tenants_count INT DEFAULT 0,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ,
  root_cause          TEXT,
  postmortem_url      TEXT,
  lead_engineer       TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. BACKGROUND JOBS & ASYNCHRONOUS WORKERS
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_background_jobs (
  id                  TEXT PRIMARY KEY DEFAULT ('job-' || gen_random_uuid()::text),
  type                TEXT NOT NULL CHECK (type IN (
    'TENANT_PROVISIONING', 'INVOICE_GENERATION', 'SUBSCRIPTION_RENEWAL',
    'USAGE_AGGREGATION', 'LEAVE_ACCRUAL', 'TRIAL_EXPIRY', 'WHATSAPP_BROADCAST',
    'DATA_CLEANUP', 'WEBHOOK_DELIVERY', 'BACKUP_SNAPSHOT'
  )),
  payload             JSONB DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL CHECK (status IN ('Queued', 'Running', 'Completed', 'Failed', 'Retrying', 'Cancelled')),
  priority            INT NOT NULL DEFAULT 3,
  attempt_count       INT NOT NULL DEFAULT 0,
  max_attempts        INT NOT NULL DEFAULT 5,
  progress_percent    INT NOT NULL DEFAULT 0,
  error_message       TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. WEBHOOKS & API KEYS
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_webhook_endpoints (
  id                  TEXT PRIMARY KEY DEFAULT ('whk-' || gen_random_uuid()::text),
  tenant_id           TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  url                 TEXT NOT NULL,
  description         TEXT,
  events              JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  secret_hash         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Disabled', 'Failing')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_webhook_deliveries (
  id                  TEXT PRIMARY KEY DEFAULT ('whd-' || gen_random_uuid()::text),
  endpoint_id         TEXT NOT NULL REFERENCES platform_webhook_endpoints(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  payload             JSONB NOT NULL,
  http_status         INT,
  latency_ms          INT,
  attempt_count       INT NOT NULL DEFAULT 1,
  status              TEXT NOT NULL CHECK (status IN ('Pending', 'Delivered', 'Failed', 'Retrying')),
  error_message       TEXT,
  delivered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_api_keys (
  id                  TEXT PRIMARY KEY DEFAULT ('key-' || gen_random_uuid()::text),
  tenant_id           TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  key_prefix          TEXT NOT NULL,
  hashed_secret       TEXT NOT NULL,
  scopes              JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  rate_limit_per_min  INT NOT NULL DEFAULT 100,
  status              TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Revoked', 'Expired')),
  created_by          TEXT NOT NULL,
  expires_at          TIMESTAMPTZ,
  last_used_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. AUDIT LOG & PRIVILEGED IMPERSONATION
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_audit_events (
  id                  TEXT PRIMARY KEY DEFAULT ('aud-' || gen_random_uuid()::text),
  actor_id            TEXT NOT NULL,
  actor_name          TEXT NOT NULL,
  actor_role          TEXT NOT NULL,
  organization_id     TEXT,
  action              TEXT NOT NULL,
  resource_type       TEXT NOT NULL,
  resource_id         TEXT NOT NULL,
  severity            TEXT NOT NULL DEFAULT 'Normal' CHECK (severity IN ('Low', 'Normal', 'High', 'Critical')),
  reason              TEXT,
  ip_address          TEXT,
  user_agent          TEXT,
  before_state        JSONB,
  after_state         JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_impersonation_sessions (
  id                  TEXT PRIMARY KEY DEFAULT ('imp-' || gen_random_uuid()::text),
  admin_user_id       TEXT NOT NULL,
  admin_name          TEXT NOT NULL,
  target_tenant_id    TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_tenant_name  TEXT NOT NULL,
  reason              TEXT NOT NULL,
  duration_minutes    INT NOT NULL DEFAULT 30,
  status              TEXT NOT NULL CHECK (status IN ('Active', 'Expired', 'Revoked')),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key                 TEXT PRIMARY KEY,
  category            TEXT NOT NULL,
  value               JSONB NOT NULL,
  description         TEXT,
  is_secret           BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by          TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR SCALE (10,000+ TENANTS & MILLIONS OF EVENTS)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sub_tenant_id        ON platform_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_status           ON platform_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_inv_tenant_id        ON platform_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_status           ON platform_invoices(status);
CREATE INDEX IF NOT EXISTS idx_usage_tenant_date    ON platform_usage_snapshots(tenant_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant  ON platform_usage_events(tenant_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status_type     ON platform_background_jobs(status, type);
CREATE INDEX IF NOT EXISTS idx_audit_action_org     ON platform_audit_events(action, organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_created        ON platform_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imp_target           ON platform_impersonation_sessions(target_tenant_id, status);
