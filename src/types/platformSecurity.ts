// src/types/platformSecurity.ts
// ============================================================
// Joy PeopleHR — Platform Security Control Center Types
// ============================================================

export type SecuritySeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type SecurityAlertStatus = 'New' | 'Investigating' | 'Acknowledged' | 'Resolved' | 'Dismissed';
export type SessionRiskLevel = 'Low' | 'Medium' | 'High' | 'Suspicious';
export type SessionStatus = 'Active' | 'Idle' | 'Expiring Soon' | 'Suspicious' | 'Revoked' | 'Expired';
export type CredentialType = 'API Key' | 'OAuth Secret' | 'Webhook Secret' | 'Service Account' | 'TLS Certificate' | 'Signing Key';
export type CredentialStatus = 'Active' | 'Expiring' | 'Expired' | 'Revoked' | 'Unused' | 'Compromised';

export interface SecurityScoreCategory {
  name: string;
  score: number;
  weight: number;
  status: 'Healthy' | 'Attention' | 'Critical';
}

export interface SecurityPosture {
  overall_score: number;
  status: 'Healthy' | 'Degraded' | 'Critical';
  categories: {
    authentication: number;
    sessions: number;
    api_security: number;
    access_control: number;
    credential_security: number;
    audit_coverage: number;
  };
  last_evaluated_at: string;
}

export interface SecurityAlertItem {
  id: string;
  alert_code: string;
  type:
    | 'Suspicious Login'
    | 'Brute Force Attempt'
    | 'Impossible Travel'
    | 'Multiple Failed Logins'
    | 'Credential Exposure'
    | 'Expired Credential'
    | 'Privilege Escalation'
    | 'Unauthorized Access'
    | 'Invalid API Signature'
    | 'Webhook Signature Failure'
    | 'Abnormal API Usage'
    | 'Unusual Session'
    | 'Disabled Security Control';
  severity: SecuritySeverity;
  status: SecurityAlertStatus;
  tenant_id?: string;
  tenant_name?: string;
  user_email?: string;
  source: string;
  ip_address: string;
  location: string;
  risk_score: number;
  detection_reason: string;
  detected_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  related_sessions_count?: number;
  related_audit_events_count?: number;
}

export interface ActiveSessionItem {
  id: string;
  session_token_prefix: string;
  user_id: string;
  user_name: string;
  user_email: string;
  tenant_id: string;
  tenant_name: string;
  role_name: string;
  is_admin: boolean;
  device_type: 'Desktop' | 'Laptop' | 'Mobile' | 'Tablet' | 'CLI/API';
  os: string;
  browser: string;
  ip_address: string;
  location_city: string;
  location_country: string;
  auth_method: 'Password + MFA' | 'SSO (SAML/Okta)' | 'Passkey (WebAuthn)' | 'Password Only';
  login_time: string;
  last_activity_time: string;
  expires_at: string;
  risk_level: SessionRiskLevel;
  risk_reasons?: string[];
  status: SessionStatus;
}

export interface SecurityRecommendation {
  id: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  category: 'Credentials' | 'Authentication' | 'Sessions' | 'Audit' | 'Access';
  action_label: string;
  status: 'Open' | 'Dismissed' | 'Fixed';
}

export interface CredentialInventoryItem {
  id: string;
  name: string;
  owner: string;
  tenant_name: string;
  type: CredentialType;
  environment: 'Production' | 'Staging' | 'Development';
  created_at: string;
  expires_at: string;
  days_until_expiry: number;
  last_used_at: string;
  risk: SecuritySeverity;
  status: CredentialStatus;
}

export interface SecurityPolicyItem {
  id: string;
  name: string;
  category: 'Authentication' | 'Session' | 'Password' | 'MFA' | 'API Security' | 'IP Access' | 'Audit';
  enabled: boolean;
  config_summary: string;
  updated_at: string;
  updated_by: string;
}

export interface AuditLogEventItem {
  id: string;
  event_number: string;
  timestamp: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  category:
    | 'Authentication'
    | 'Authorization'
    | 'User Management'
    | 'Tenant Management'
    | 'Security'
    | 'API'
    | 'Integrations'
    | 'Webhooks'
    | 'Biometric'
    | 'Billing'
    | 'Subscriptions'
    | 'Support'
    | 'Background Jobs'
    | 'Configuration'
    | 'Data Access'
    | 'Data Export'
    | 'System';
  resource_type: string;
  resource_name: string;
  tenant_name: string;
  result: 'Success' | 'Failed' | 'Blocked';
  ip_address: string;
  user_agent: string;
  request_id: string;
  trace_id: string;
  risk_level: SecuritySeverity;
  reason?: string;
  before_value?: string;
  after_value?: string;
}

export interface ComplianceControlItem {
  id: string;
  code: string;
  name: string;
  framework: 'SOC 2' | 'ISO 27001' | 'GDPR' | 'DPDP' | 'Internal Baseline';
  category: string;
  status: 'Compliant' | 'Partial' | 'Non-Compliant' | 'Unknown';
  requirement: string;
  current_state: string;
  evidence: string;
  last_verified_at: string;
  owner: string;
  exceptions_count?: number;
}

export interface ApiSecurityMetric {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requests_per_min: number;
  error_rate_pct: number;
  p95_latency_ms: number;
  rate_limit_violations: number;
  auth_failure_count: number;
  status: 'Normal' | 'Elevated Errors' | 'Throttled' | 'Suspicious Traffic';
}

export interface TelemetrySourceItem {
  id: string;
  name: string;
  category: string;
  provider: string;
  status: 'Operational' | 'Warning' | 'Unavailable';
  latency_ms: number;
  last_event_at: string;
}

export interface SecurityScoreCategoryItem {
  name: string;
  category_key: string;
  score: number;
  weight: number;
  status: 'Healthy' | 'Attention' | 'Critical';
  deductions: { reason: string; points: number }[];
}

export interface SecurityMetrics {
  critical_alerts_count: number;
  high_risk_findings_count: number;
  active_sessions_count: number;
  admin_sessions_count: number;
  failed_logins_24h_count: number;
  expiring_credentials_count: number;
  suspicious_activity_count: number;
  mfa_adoption_pct: number;
  privileged_mfa_pct: number;
  sso_connected_tenants_count: number;
  audit_events_today_count: number;
  api_requests_per_min: number;
  api_error_rate_pct: number;
}

