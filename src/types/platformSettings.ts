// src/types/platformSettings.ts
// ============================================================
// WorkForceOS — Platform Settings & Integrations Type Contracts
// ============================================================

export type PlatformEnvironment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';

export type SettingCategoryKey =
  | 'general'
  | 'access_security'
  | 'integrations'
  | 'realtime_events'
  | 'operations'
  | 'governance';

export type SettingRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PlatformSettingDefinition {
  key: string;
  category: SettingCategoryKey;
  sub_category: string;
  label: string;
  description: string;
  value_type: 'boolean' | 'integer' | 'decimal' | 'string' | 'enum' | 'json' | 'duration' | 'rate';
  default_value: any;
  allowed_values?: string[] | number[];
  scope: 'GLOBAL' | 'ENVIRONMENT' | 'TENANT';
  risk_level: SettingRiskLevel;
  requires_restart?: boolean;
  requires_confirmation?: boolean;
  documentation_url?: string;
  enabled: boolean;
}

export interface PlatformSettingItem {
  id: string;
  key: string;
  definition: PlatformSettingDefinition;
  environment: PlatformEnvironment;
  value: any;
  is_overridden: boolean;
  version: number;
  last_modified_by: string;
  last_modified_reason?: string;
  updated_at: string;
}

export interface PlatformConfigVersion {
  id: string;
  setting_key: string;
  environment: PlatformEnvironment;
  version: number;
  old_value: any;
  new_value: any;
  changed_by: string;
  reason: string;
  request_id?: string;
  is_rollback?: boolean;
  created_at: string;
}

export interface ApiKeyScope {
  scope: string;
  category: string;
  label: string;
  description: string;
  risk_level: SettingRiskLevel;
  is_admin_only: boolean;
}

export interface ApiKeyScopeGroup {
  category: string;
  scopes: ApiKeyScope[];
}

export interface PlatformApiKeyItem {
  id: string;
  name: string;
  description?: string;
  key_prefix: string; // e.g. 'wk_live_9a2f'
  environment: PlatformEnvironment;
  owner: string;
  organization_id?: string;
  tenant_name?: string;
  scopes: string[];
  rate_limit_per_min: number;
  burst_limit: number;
  concurrency_limit: number;
  status: 'Active' | 'Revoked' | 'Expired';
  expires_at?: string;
  revoked_at?: string;
  revoked_by?: string;
  revocation_reason?: string;
  created_by: string;
  last_used_at?: string;
  last_used_ip?: string;
  total_requests_count: number;
  requests_today_count: number;
  success_rate_pct: number;
  rate_limit_hits_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateApiKeyDTO {
  name: string;
  description?: string;
  environment: PlatformEnvironment;
  owner: string;
  organization_id?: string;
  tenant_name?: string;
  scopes: string[];
  rate_limit_per_min: number;
  burst_limit?: number;
  concurrency_limit?: number;
  expires_in_days?: number | null; // null = never expires
}

export interface ApiKeyCreationResult {
  key: PlatformApiKeyItem;
  raw_secret: string; // Shown ONLY ONCE
}

export interface RotateApiKeyDTO {
  key_id: string;
  grace_period_hours: number;
  reason: string;
}

export interface PlatformIntegrationItem {
  id: string;
  provider_type: 'email' | 'sms' | 'whatsapp' | 'push' | 'storage' | 'erp' | 'siem';
  provider_name: string; // 'SMTP', 'Resend', 'Twilio', 'WhatsApp Cloud API', 'AWS S3'
  environment: PlatformEnvironment;
  status: 'Configured' | 'Not Configured' | 'Degraded' | 'Disabled';
  health_status: 'Healthy' | 'At Risk' | 'Failing' | 'Unknown';
  is_default: boolean;
  masked_credentials: Record<string, string>;
  config: Record<string, any>;
  last_health_check_at?: string;
  last_test_request_id?: string;
  last_latency_ms?: number;
  failure_rate_pct: number;
  created_by: string;
  updated_at: string;
}

export interface PlatformMaintenanceSchedule {
  id: string;
  title: string;
  operator_message: string;
  environment: PlatformEnvironment;
  is_active: boolean;
  read_only_mode: boolean;
  api_read_only: boolean;
  scheduled_start?: string;
  scheduled_end?: string;
  timezone: string;
  affected_services: string[];
  bypass_roles: string[];
  created_by: string;
  activated_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface PlatformRateLimitConfig {
  id: string;
  scope_type: 'GLOBAL' | 'ENVIRONMENT' | 'TENANT' | 'API_KEY';
  scope_id: string;
  requests_per_minute: number;
  burst_capacity: number;
  concurrency_limit: number;
  daily_quota?: number;
  monthly_quota?: number;
  is_custom_override: boolean;
  updated_at: string;
}

export interface SystemHealthDependency {
  id: string;
  name: string;
  service_type: string;
  status: 'Healthy' | 'Degraded' | 'Unavailable';
  latency_ms: number;
  last_checked_at: string;
  details: string;
}

export interface EmergencyControlActionDTO {
  action_type:
    | 'DISABLE_OUTBOUND_WEBHOOKS'
    | 'PAUSE_EVENT_MESH'
    | 'PAUSE_BACKGROUND_JOBS'
    | 'DISABLE_API_KEY_CREATION'
    | 'FORCE_LOGOUT_ALL_ADMINS'
    | 'ENABLE_READ_ONLY_MODE';
  environment: PlatformEnvironment;
  reason: string;
  confirmed_by: string;
}
