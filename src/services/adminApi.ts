import {
  AdminUser,
  UserInvitation,
  AdminRole,
  PermissionItem,
  WorkflowDefinition,
  ApprovalPolicy,
  AuditLogEntry,
  ApiKeyItem,
  IntegrationItem,
  SubscriptionInfo,
  SystemSettingsConfig,
} from '../types/admin';

const initialUsers: AdminUser[] = [
  { id: 'usr-101', user_code: 'USR-001', name: 'Anand Viswanathan', email: 'anand@workforceos.com', employee_id: 'emp-100', department_name: 'Executive Management', role_name: 'Super Admin', status: 'Active', mfa_enabled: true, last_login: '2026-08-12 10:15 AM', created_at: '2025-01-01' },
  { id: 'usr-102', user_code: 'USR-002', name: 'Rajesh Kumar', email: 'rajesh@workforceos.com', employee_id: 'emp-101', department_name: 'Engineering', role_name: 'Company Admin', status: 'Active', mfa_enabled: true, last_login: '2026-08-12 09:30 AM', created_at: '2025-01-15' },
  { id: 'usr-103', user_code: 'USR-003', name: 'Ananya Sen', email: 'ananya@workforceos.com', employee_id: 'emp-102', department_name: 'Product & Design', role_name: 'HR Head', status: 'Active', mfa_enabled: true, last_login: '2026-08-11 04:45 PM', created_at: '2025-02-01' },
];

const initialInvitations: UserInvitation[] = [
  { id: 'inv-101', email: 'karthik@workforceos.com', employee_name: 'Karthik Raja', role_name: 'Manager', company_name: 'WorkForceOS India Pvt Ltd', expiration_date: '2026-08-18', status: 'Sent' },
];

const initialRoles: AdminRole[] = [
  { id: 'rol-1', name: 'Super Admin', description: 'Full platform administration & control plane access', role_type: 'System', assigned_users_count: 2, data_scope: 'Organization', is_protected: true },
  { id: 'rol-2', name: 'HR Head', description: 'Complete HR, Recruitment, Attendance, LMS & Employee Relations access', role_type: 'System', assigned_users_count: 5, data_scope: 'Organization', is_protected: true },
  { id: 'rol-3', name: 'Company Admin', description: 'Company-scoped operational & user management access', role_type: 'System', assigned_users_count: 8, data_scope: 'Company', is_protected: true },
  { id: 'rol-4', name: 'Finance Admin', description: 'Payroll processing, salary structures & cost analytics access', role_type: 'System', assigned_users_count: 4, data_scope: 'Organization', is_protected: true },
];

const initialAuditLogs: AuditLogEntry[] = [
  { id: 'aud-101', event_code: 'EVT-8819', actor_name: 'Anand Viswanathan', module_name: 'Security', action: 'MFA Policy Enforced', entity_type: 'SecurityPolicy', entity_id: 'sec-pol-1', ip_address: '106.51.72.18', timestamp: '2026-08-12 09:45 AM', status: 'Success' },
  { id: 'aud-102', event_code: 'EVT-8812', actor_name: 'System Engine', module_name: 'Payroll', action: 'Statutory EPF ECR Generation', entity_type: 'PayrollRun', entity_id: 'pay-2026-07', ip_address: 'Internal', timestamp: '2026-08-10 11:30 AM', status: 'Success' },
];

const initialApiKeys: ApiKeyItem[] = [
  { id: 'key-101', client_name: 'WorkForceOS Mobile App iOS/Android', key_prefix: 'wfos_live_pk_881a...', scopes: ['employees.read', 'attendance.write', 'leave.write'], status: 'Active', created_at: '2026-01-10', last_used_at: '2026-08-12 10:14 AM' },
];

const initialIntegrations: IntegrationItem[] = [
  { id: 'int-1', name: 'Supabase PostgreSQL DB & Storage', category: 'Storage', status: 'Connected', last_sync_at: 'Realtime Active' },
  { id: 'int-2', name: 'ZK Teco Biometric Hardware Adapter', category: 'Biometric', status: 'Connected', last_sync_at: '2026-08-12 10:00 AM' },
  { id: 'int-3', name: 'SendGrid Email & WhatsApp Business API', category: 'Communication', status: 'Connected', last_sync_at: '2026-08-12 09:15 AM' },
];

export const adminApi = {
  getUsers(): AdminUser[] {
    return initialUsers;
  },
  getInvitations(): UserInvitation[] {
    return initialInvitations;
  },
  getRoles(): AdminRole[] {
    return initialRoles;
  },
  getAuditLogs(): AuditLogEntry[] {
    return initialAuditLogs;
  },
  getApiKeys(): ApiKeyItem[] {
    return initialApiKeys;
  },
  getIntegrations(): IntegrationItem[] {
    return initialIntegrations;
  },
  getSubscription(): SubscriptionInfo {
    return {
      plan_name: 'WorkForceOS Enterprise Tier',
      billing_cycle: 'Annual',
      employee_limit: 1000,
      active_employees: 416,
      renewal_date: '2027-01-01',
      status: 'Active',
    };
  },
  getSystemSettings(): SystemSettingsConfig {
    return {
      organization_name: 'Joy Corporate Solutions India Pvt Ltd',
      timezone: 'Asia/Kolkata (IST +5:30)',
      currency: 'INR (₹ - Indian Rupee)',
      financial_year_start: 'April 1 (Indian Financial Year)',
      privacy_threshold: 5,
    };
  },
};
