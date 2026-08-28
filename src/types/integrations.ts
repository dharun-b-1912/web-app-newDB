// src/types/integrations.ts
// ============================================================
// Joy PeopleHR — Integration Control Center Type Definitions
// ============================================================

export type IntegrationEnvironment = 'Production' | 'Staging' | 'Development';

export type IntegrationCategory =
  | 'Communication'
  | 'Social'
  | 'Workforce'
  | 'Finance'
  | 'HR'
  | 'Developer'
  | 'Storage';

export type IntegrationStatus =
  | 'Connected'
  | 'Healthy'
  | 'Degraded'
  | 'Authentication Required'
  | 'Expired'
  | 'Failed'
  | 'Disabled'
  | 'Maintenance';

export type IntegrationScope =
  | 'Platform-wide'
  | 'Tenant-specific'
  | 'Tenant Group'
  | 'Environment-specific';

export type AuthMode =
  | 'OAuth 2.0'
  | 'API Key'
  | 'Client ID + Secret'
  | 'JWT / Bearer'
  | 'HMAC'
  | 'Basic Auth'
  | 'Device Gateway Token'
  | 'Mutual TLS Certificate'
  | 'Custom Credential';

export interface IntegrationProviderMeta {
  id: string;
  name: string;
  provider_key: string;
  category: IntegrationCategory;
  description: string;
  icon_name: string;
  supported_auth: AuthMode[];
  is_popular?: boolean;
  doc_url?: string;
  required_permissions: string[];
  optional_permissions: string[];
}

export interface Integration {
  id: string;
  provider_key: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  status: IntegrationStatus;
  environment: IntegrationEnvironment;
  scope: IntegrationScope;
  tenants_count: number;
  health_score: number;
  last_sync_at?: string;
  auth_type: AuthMode;
  webhook_url?: string;
  webhook_status?: 'Active' | 'Failing' | 'Not Configured';
  created_at: string;
  updated_at: string;
  config_summary?: Record<string, any>;
  error_message?: string;
}

export interface IntegrationConnection {
  id: string;
  integration_id: string;
  provider_key: string;
  tenant_id: string;
  tenant_name: string;
  provider_account_id: string;
  status: IntegrationStatus;
  auth_type: AuthMode;
  last_sync_at?: string;
  last_health_check_at?: string;
  expires_at?: string;
  environment: IntegrationEnvironment;
  usage_summary: string;
  created_at: string;
  config?: Record<string, any>;
  error_details?: string;
}

export interface IntegrationApiKey {
  id: string;
  name: string;
  key_prefix: string;
  hashed_secret?: string;
  tenant_id?: string;
  tenant_name?: string;
  scopes: string[];
  environment: IntegrationEnvironment;
  rate_limit_per_min: number;
  ip_restrictions?: string[];
  created_by: string;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
  revoked_at?: string;
  status: 'Active' | 'Revoked' | 'Expired';
}

export interface OAuthApplication {
  id: string;
  name: string;
  client_id: string;
  client_secret_masked: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  environment: IntegrationEnvironment;
  owner: string;
  status: 'Healthy' | 'Attention' | 'Disabled';
  active_tokens_count: number;
  created_at: string;
  last_token_refresh_at?: string;
}

export interface BiometricDevice {
  id: string;
  tenant_id: string;
  tenant_name: string;
  device_name: string;
  provider: 'Mantra' | 'eSSL' | 'Suprema' | 'ZKTeco' | 'Hikvision' | 'Realtime Biometrics';
  device_type: 'Fingerprint' | 'Face Recognition' | 'Iris Scanner' | 'RFID Card' | 'Multi-Modal';
  ip_address: string;
  gateway_id: string;
  gateway_name: string;
  status: 'Online' | 'Offline' | 'Syncing' | 'Error';
  last_sync_at: string;
  enrolled_employees_count: number;
  firmware_version: string;
  location: string;
  serial_number: string;
  error_message?: string;
}

export interface DeviceGateway {
  id: string;
  tenant_id: string;
  tenant_name: string;
  name: string;
  agent_version: string;
  status: 'Online' | 'Offline' | 'Degraded';
  last_heartbeat_at: string;
  connected_devices_count: number;
  local_ip: string;
  server_endpoint: string;
  os_platform: string;
}

export interface WhatsAppAccount {
  id: string;
  tenant_id: string;
  tenant_name: string;
  business_account_id: string;
  phone_number_id: string;
  display_phone_number: string;
  status: 'Connected' | 'Restricted' | 'Disconnected' | 'Pending Verification';
  verified_name: string;
  quality_rating: 'GREEN (High)' | 'YELLOW (Medium)' | 'RED (Low)';
  messages_today: number;
  delivered_pct: number;
  failed_pct: number;
  webhook_status: 'Healthy' | 'Failing';
  last_activity_at: string;
  templates_count: number;
}

export interface MetaConnection {
  id: string;
  tenant_id: string;
  tenant_name: string;
  page_id: string;
  page_name: string;
  instagram_account_id?: string;
  ig_handle?: string;
  messenger_active: boolean;
  lead_forms_active: boolean;
  token_expires_in_days: number;
  token_status: 'Valid' | 'Expiring Soon' | 'Expired';
  last_sync_at: string;
  webhook_status: 'Healthy' | 'Degraded';
}

export interface SyncJob {
  id: string;
  job_name: string;
  tenant_name: string;
  integration_name: string;
  provider: string;
  started_at: string;
  duration_sec: number;
  records_processed: number;
  status: 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Retrying' | 'Cancelled';
  retries_count: number;
  error_message?: string;
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  tenant_name?: string;
  provider: string;
  event_type: string;
  severity: 'Normal' | 'Warning' | 'Error' | 'Critical';
  message: string;
  request_id: string;
  actor: string;
  http_status?: number;
  latency_ms?: number;
  environment: IntegrationEnvironment;
}

export interface SecurityAlert {
  id: string;
  severity: 'Critical' | 'Warning' | 'Info';
  title: string;
  description: string;
  category: 'Expiring Token' | 'Weak Configuration' | 'Unused Key' | 'High Failure Rate' | 'IP Violation';
  affected_resource: string;
  recommendation: string;
  created_at: string;
  status: 'Open' | 'Resolved';
}

export interface IntegrationMetrics {
  total_connected: number;
  active_tenants: number;
  webhook_success_pct: number;
  total_webhook_deliveries: number;
  monthly_api_requests: string;
  monthly_api_requests_trend: number;
  security_alerts_count: number;
  expiring_credentials_count: number;
  engine_status: 'Healthy' | 'Degraded' | 'Incident';
  attention_count: number;
  failed_count: number;
}
