// src/types/platformSessions.ts
// ============================================================
// WorkForceOS — Active Sessions & Security Telemetry Types
// ============================================================

export type SessionStatusType = 'Active' | 'Idle' | 'Expired' | 'Revoked' | 'Terminated' | 'Unknown';
export type SessionRiskType = 'Low' | 'Medium' | 'High' | 'Critical' | 'Unknown';
export type SessionAuthMethodType = 'Password' | 'SSO' | 'MFA' | 'Passkey' | 'OAuth';
export type DeviceCategoryType = 'Desktop' | 'Mobile' | 'Tablet';

export interface PlatformSessionRecord {
  id: string;
  auth_session_id?: string;
  user_id?: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  tenant_id: string;
  tenant_name: string;
  role_id: string;
  role_name: string;
  session_status: SessionStatusType;
  created_at: string;
  last_activity_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at?: string;
  revoked_by?: string;
  revocation_reason?: string;
  ip_hash?: string;
  ip_masked: string;
  country: string;
  region?: string;
  city: string;
  asn?: string;
  device_id: string;
  device_name: string;
  device_type: DeviceCategoryType;
  os_name: string;
  os_version?: string;
  browser_name: string;
  browser_version?: string;
  user_agent_hash?: string;
  auth_method: SessionAuthMethodType;
  mfa_verified: boolean;
  is_privileged: boolean;
  risk_level: SessionRiskType;
  risk_score: number;
  risk_reason?: string;
  first_seen_device: boolean;
  last_security_check_at?: string;
  metadata?: Record<string, any>;
  updated_at: string;
}

export interface SessionSummaryKPIs {
  active_sessions_count: number;
  admin_sessions_count: number;
  tenant_sessions_count: number;
  suspicious_sessions_count: number;
  new_devices_count: number;
  idle_sessions_count: number;
  expired_today_count: number;
  revoked_today_count: number;
  calculated_at: string;
}

export interface SessionFilterOptions {
  risk?: string;
  status?: string;
  role?: string;
  tenantId?: string;
  authMethod?: string;
  deviceType?: string;
  search?: string;
  firstSeenToday?: boolean;
  sortBy?: 'last_activity_at' | 'created_at' | 'risk_score' | 'user_name' | 'tenant_name';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SessionEventItem {
  id: string;
  session_id?: string;
  event_type: string;
  user_email: string;
  actor_id?: string;
  actor_name?: string;
  ip_masked?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface DeviceRegistryItem {
  id: string;
  device_id: string;
  user_email: string;
  tenant_id: string;
  device_type: string;
  os_name: string;
  browser_name: string;
  first_seen_at: string;
  last_seen_at: string;
  trust_status: 'Trusted' | 'New' | 'Suspicious' | 'Blocked';
  metadata?: Record<string, any>;
}

export interface SessionRiskFactor {
  signal: string;
  points: number;
  severity: 'Info' | 'Warning' | 'High' | 'Critical';
  description: string;
}
