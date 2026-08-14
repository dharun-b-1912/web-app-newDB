export interface AdminUser {
  id: string;
  user_code: string;
  name: string;
  email: string;
  employee_id: string;
  department_name: string;
  role_name: string;
  status: 'Active' | 'Invited' | 'Suspended' | 'Locked' | 'Deactivated';
  mfa_enabled: boolean;
  last_login: string;
  created_at: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  employee_name: string;
  role_name: string;
  company_name: string;
  expiration_date: string;
  status: 'Pending' | 'Sent' | 'Accepted' | 'Expired';
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  role_type: 'System' | 'Organization' | 'Custom';
  assigned_users_count: number;
  data_scope: 'Organization' | 'Company' | 'Department' | 'Team' | 'Self';
  is_protected: boolean;
}

export interface PermissionItem {
  id: string;
  module_key: string;
  resource_key: string;
  action_key: 'view' | 'create' | 'update' | 'delete' | 'approve' | 'export';
  permission_code: string;
  description: string;
}

export interface WorkflowDefinition {
  id: string;
  workflow_code: string;
  name: string;
  module_name: string;
  trigger_event: string;
  status: 'Active' | 'Draft' | 'Paused';
  version: string;
  steps_count: number;
  created_at: string;
}

export interface ApprovalPolicy {
  id: string;
  policy_code: string;
  module_name: string;
  request_type: string;
  approver_sequence: string[];
  escalation_hours: number;
  status: 'Active' | 'Draft';
}

export interface AuditLogEntry {
  id: string;
  event_code: string;
  actor_name: string;
  module_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  timestamp: string;
  status: 'Success' | 'Warning' | 'Failure';
}

export interface ApiKeyItem {
  id: string;
  client_name: string;
  key_prefix: string;
  scopes: string[];
  status: 'Active' | 'Revoked' | 'Expired';
  created_at: string;
  last_used_at: string;
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: 'HR' | 'Payroll' | 'Biometric' | 'Communication' | 'Storage';
  status: 'Connected' | 'Disconnected' | 'Degraded';
  last_sync_at: string;
}

export interface SubscriptionInfo {
  plan_name: string;
  billing_cycle: 'Annual' | 'Monthly';
  employee_limit: number;
  active_employees: number;
  renewal_date: string;
  status: 'Active' | 'PastDue' | 'Trial';
}

export interface SystemSettingsConfig {
  organization_name: string;
  timezone: string;
  currency: string;
  financial_year_start: string;
  privacy_threshold: number;
}
