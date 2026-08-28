// src/types/supportCenter.ts
// ============================================================
// Joy PeopleHR — Support Center Case & Operations Type Definitions
// ============================================================

export type SupportPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type SupportStatus =
  | 'New'
  | 'Open'
  | 'Assigned'
  | 'In Progress'
  | 'Waiting for Customer'
  | 'Waiting for Engineering'
  | 'Escalated'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export type SupportCategory =
  | 'Account'
  | 'Login'
  | 'Billing'
  | 'Subscription'
  | 'Attendance'
  | 'Biometric'
  | 'Payroll'
  | 'Employee'
  | 'Reports'
  | 'WhatsApp'
  | 'API'
  | 'Integration'
  | 'Performance'
  | 'Data Issue'
  | 'Security'
  | 'Other';

export type MessageType =
  | 'customer'
  | 'agent'
  | 'internal_note'
  | 'system'
  | 'engineering';

export interface SupportMessage {
  id: string;
  case_id: string;
  author_id: string;
  author_name: string;
  author_role: 'Customer' | 'Support Lead' | 'Platform Engineer' | 'System Bot';
  type: MessageType;
  body: string;
  created_at: string;
  attachments?: { name: string; size: string; url: string }[];
}

export interface SupportCase {
  id: string;
  case_number: string;
  tenant_id: string;
  tenant_name: string;
  tenant_plan: 'Starter' | 'Growth' | 'Business' | 'Enterprise';
  requester_name: string;
  requester_email: string;
  subject: string;
  description: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  assignee_id?: string;
  assignee_name?: string;
  team: string;
  sla_policy_name: string;
  first_response_due_at: string;
  first_response_completed_at?: string;
  resolution_due_at: string;
  sla_remaining_minutes: number;
  sla_status: 'On Track' | 'At Risk' | 'Breached';
  escalation_level?: 'None' | 'Supervisor' | 'Platform Operations' | 'Executive';
  linked_incident_id?: string;
  linked_job_id?: string;
  linked_webhook_id?: string;
  messages: SupportMessage[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolution_reason?: string;
}

export interface SupportAccessRequest {
  id: string;
  request_number: string;
  case_id?: string;
  case_number?: string;
  tenant_id: string;
  tenant_name: string;
  requester_id: string;
  requester_name: string;
  target_user_email: string;
  target_user_name: string;
  access_type: 'View-only' | 'Support Session' | 'Admin Support';
  reason: string;
  duration_minutes: number;
  expires_at?: string;
  status: 'Pending' | 'Approved' | 'Active' | 'Rejected' | 'Expired' | 'Terminated';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: SupportCategory;
  product: string;
  version: string;
  summary: string;
  content: string;
  view_count: number;
  helpful_count: number;
  last_updated_at: string;
}

export interface CustomerActivityEvent {
  id: string;
  tenant_id: string;
  tenant_name: string;
  event_type: 'Login' | 'API Error' | 'Job Failure' | 'Webhook Timeout' | 'Device Offline' | 'Subscription Change';
  severity: 'Normal' | 'Warning' | 'Critical';
  summary: string;
  timestamp: string;
  reference_id?: string;
}

export interface SupportCenterMetrics {
  open_cases_count: number;
  open_cases_today_delta: number;
  sla_at_risk_count: number;
  sla_critical_count: number;
  unassigned_count: number;
  escalated_count: number;
  escalated_platform_count: number;
  pending_access_requests_count: number;
  avg_first_response_min: number;
  avg_resolution_hours: number;
  sla_compliance_pct: number;
  operations_online: boolean;
}
