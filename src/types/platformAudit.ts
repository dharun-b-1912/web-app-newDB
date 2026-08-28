// src/types/platformAudit.ts
// ============================================================
// Joy PeopleHR — Forensic Immutable Audit System Types
// ============================================================

export type AuditEventCategory =
  | 'Administrative'
  | 'Security'
  | 'Authentication'
  | 'Authorization'
  | 'Tenant'
  | 'Billing'
  | 'Plan'
  | 'Feature'
  | 'Integration'
  | 'API'
  | 'System'
  | 'AI'
  | 'Session'
  | 'Configuration';

export type AuditEventResult = 'Success' | 'Failed' | 'Denied' | 'Blocked' | 'Partial' | 'Pending';

export type AuditRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical' | 'Unknown';

export type AuditActorType =
  | 'SUPER_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'SECURITY_ADMIN'
  | 'TENANT_ADMIN'
  | 'EMPLOYEE'
  | 'SYSTEM'
  | 'SERVICE'
  | 'AI'
  | 'WEBHOOK'
  | 'API';

export interface AuditEventRecord {
  id: string;
  event_id: string;
  event_type: string;
  category: AuditEventCategory;
  action: string;
  result: AuditEventResult;
  risk_level: AuditRiskLevel;
  risk_score: number;
  actor_user_id?: string;
  actor_name: string;
  actor_email?: string;
  actor_role: string;
  actor_type: AuditActorType;
  tenant_id: string;
  tenant_name: string;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  request_id: string;
  correlation_id?: string;
  session_id?: string;
  ip_hash?: string;
  ip_masked: string;
  country: string;
  region?: string;
  city: string;
  user_agent_hash?: string;
  source: string;
  service: string;
  metadata?: Record<string, any>;
  before_value?: string;
  after_value?: string;
  previous_event_hash?: string;
  event_hash?: string;
  created_at: string;
  occurred_at: string;
}

export interface AuditSummaryKPIs {
  events_today_count: number;
  admin_actions_count: number;
  security_events_count: number;
  failed_actions_count: number;
  high_risk_actions_count: number;
  auth_events_count: number;
  tenant_events_count: number;
  calculated_at: string;
}

export interface AuditFilterOptions {
  category?: string;
  result?: string;
  risk?: string;
  actorType?: string;
  tenantId?: string;
  search?: string;
  range?: 'today' | '24h' | '7d' | '30d' | 'all';
  requestId?: string;
  correlationId?: string;
  sessionId?: string;
  resourceId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'risk_score' | 'actor_name' | 'action';
  sortDirection?: 'asc' | 'desc';
}

export interface AuditIntegrityVerificationResult {
  status: 'Verified' | 'Tampered' | 'Broken';
  verified_count: number;
  last_hash?: string;
  broken_event_id?: string;
  verified_at: string;
}

export interface AuditExportRecord {
  id: string;
  export_id: string;
  requested_by: string;
  format: 'CSV' | 'JSON';
  record_count: number;
  status: 'Pending' | 'Processing' | 'Ready' | 'Failed';
  download_url?: string;
  created_at: string;
}
