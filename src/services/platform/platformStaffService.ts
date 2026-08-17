// src/services/platform/platformStaffService.ts
// ============================================================
// WorkForceOS — Platform Admin Assistant & Delegated IAM Service
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';

export type StaffStatus = 'Active' | 'Invitation Pending' | 'Suspended' | 'Disabled' | 'Locked';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PermissionActionType = 'View' | 'Create' | 'Update' | 'Delete' | 'Export' | 'Manage' | 'Approve' | 'Execute';

export interface PlatformStaffScopeItem {
  id?: string;
  scope_type: 'ORGANIZATION' | 'REGION' | 'MODULE_RESTRICTION';
  scope_value: string;
}

export interface PlatformStaffRecord {
  id: string;
  user_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  staff_code: string;
  job_title: string;
  department: string;
  phone: string;
  avatar_url?: string;
  role_key: string;
  role_display_name: string;
  status: StaffStatus;
  mfa_enforced: boolean;
  mfa_enabled: boolean;
  is_root_superadmin: boolean;
  account_start_date: string;
  account_expiry_date?: string;
  active_sessions_count: number;
  risk_level: RiskLevel;
  permissions_count: number;
  last_login_at?: string;
  created_at: string;
  scopes?: PlatformStaffScopeItem[];
}

export interface PlatformRoleRecord {
  id: string;
  role_key: string;
  display_name: string;
  description: string;
  is_system_role: boolean;
  hierarchy_level: number;
  risk_level: RiskLevel;
  permissions_count: number;
  permissions: string[];
}

export interface PlatformPermissionRecord {
  id: string;
  permission_key: string;
  module_name: string;
  action: PermissionActionType;
  risk_level: RiskLevel;
  is_protected: boolean;
  scope: string;
  description: string;
}

export interface StaffDirectoryKPIs {
  total_staff: number;
  active_staff: number;
  pending_invitations: number;
  suspended_staff: number;
  mfa_protected: number;
  high_risk_staff: number;
}

export interface AdminActivityRecord {
  id: string;
  timestamp: string;
  actor_name: string;
  actor_role: string;
  action: string;
  resource_type: string;
  target_user?: string;
  target_name?: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  reason?: string;
  result: 'Success' | 'Failure' | 'Denied';
  ip_address: string;
  request_id: string;
  risk_level: RiskLevel;
}

// Initial System Data
let cachedStaffList: PlatformStaffRecord[] = [
  {
    id: 'stf-001',
    email: 'superadmin@workforceos.com',
    first_name: 'Arun',
    last_name: 'Kumar',
    name: 'Arun Kumar',
    staff_code: 'STF-ROOT01',
    job_title: 'Chief Platform Architect & Super Admin',
    department: 'Platform Core & Infrastructure',
    phone: '+91 98765 43210',
    role_key: 'SUPER_ADMIN',
    role_display_name: 'Super Admin',
    status: 'Active',
    mfa_enforced: true,
    mfa_enabled: true,
    is_root_superadmin: true,
    account_start_date: '2026-01-01T00:00:00Z',
    active_sessions_count: 3,
    risk_level: 'LOW',
    permissions_count: 34,
    last_login_at: 'Just now',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'stf-002',
    email: 'priya.sharma@workforceos.com',
    first_name: 'Priya',
    last_name: 'Sharma',
    name: 'Priya Sharma',
    staff_code: 'STF-OPS02',
    job_title: 'Operations & Fleet Admin',
    department: 'SRE & Platform Operations',
    phone: '+91 98111 22334',
    role_key: 'OPERATIONS_ADMIN',
    role_display_name: 'Operations Admin',
    status: 'Active',
    mfa_enforced: true,
    mfa_enabled: true,
    is_root_superadmin: false,
    account_start_date: '2026-04-10T00:00:00Z',
    active_sessions_count: 1,
    risk_level: 'LOW',
    permissions_count: 18,
    last_login_at: '2 hours ago',
    created_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 'stf-003',
    email: 'karthik.rajan@workforceos.com',
    first_name: 'Karthik',
    last_name: 'Rajan',
    name: 'Karthik Rajan',
    staff_code: 'STF-SUP03',
    job_title: 'Tier-3 Support Lead',
    department: 'Enterprise Customer Support',
    phone: '+91 97222 33445',
    role_key: 'SUPPORT_ADMIN',
    role_display_name: 'Support Admin',
    status: 'Active',
    mfa_enforced: true,
    mfa_enabled: true,
    is_root_superadmin: false,
    account_start_date: '2026-05-15T00:00:00Z',
    active_sessions_count: 1,
    risk_level: 'LOW',
    permissions_count: 8,
    last_login_at: 'Yesterday',
    created_at: '2026-05-15T00:00:00Z',
    scopes: [{ scope_type: 'MODULE_RESTRICTION', scope_value: 'Support, Organizations' }],
  },
  {
    id: 'stf-004',
    email: 'neha.deshmukh@workforceos.com',
    first_name: 'Neha',
    last_name: 'Deshmukh',
    name: 'Neha Deshmukh',
    staff_code: 'STF-SEC04',
    job_title: 'Platform Security Officer',
    department: 'Information Security & Compliance',
    phone: '+91 99333 44556',
    role_key: 'SECURITY_ADMIN',
    role_display_name: 'Security Admin',
    status: 'Active',
    mfa_enforced: true,
    mfa_enabled: true,
    is_root_superadmin: false,
    account_start_date: '2026-06-01T00:00:00Z',
    active_sessions_count: 2,
    risk_level: 'LOW',
    permissions_count: 12,
    last_login_at: '30 mins ago',
    created_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'stf-005',
    email: 'rohit.mehta@workforceos.com',
    first_name: 'Rohit',
    last_name: 'Mehta',
    name: 'Rohit Mehta',
    staff_code: 'STF-INV05',
    job_title: 'Contract Integration Specialist',
    department: 'Partner Ecosystem',
    phone: '+91 96444 55667',
    role_key: 'OPERATIONS_ADMIN',
    role_display_name: 'Operations Admin',
    status: 'Invitation Pending',
    mfa_enforced: true,
    mfa_enabled: false,
    is_root_superadmin: false,
    account_start_date: '2026-08-16T00:00:00Z',
    account_expiry_date: '2026-11-16T00:00:00Z',
    active_sessions_count: 0,
    risk_level: 'MEDIUM',
    permissions_count: 14,
    created_at: '2026-08-16T10:00:00Z',
  },
];

let cachedRolesList: PlatformRoleRecord[] = [
  {
    id: 'role-super',
    role_key: 'SUPER_ADMIN',
    display_name: 'Super Admin',
    description: 'Full unrestricted platform root authority, IAM management, master keys, and audit.',
    is_system_role: true,
    hierarchy_level: 5,
    risk_level: 'CRITICAL',
    permissions_count: 34,
    permissions: ['*'],
  },
  {
    id: 'role-plat',
    role_key: 'PLATFORM_ADMIN',
    display_name: 'Platform Admin',
    description: 'Broad operational administration over organizations, subscriptions, webhooks, and fleet.',
    is_system_role: true,
    hierarchy_level: 4,
    risk_level: 'HIGH',
    permissions_count: 28,
    permissions: ['platform.organizations.*', 'platform.billing.*', 'platform.subscriptions.*', 'platform.support.*', 'platform.jobs.*', 'platform.webhooks.*', 'platform.integrations.*', 'platform.audit.read'],
  },
  {
    id: 'role-ops',
    role_key: 'OPERATIONS_ADMIN',
    display_name: 'Operations Admin',
    description: 'Operational management of tenants, background workers, incident runbooks, and mesh.',
    is_system_role: true,
    hierarchy_level: 3,
    risk_level: 'MEDIUM',
    permissions_count: 18,
    permissions: ['platform.organizations.read', 'platform.organizations.update', 'platform.support.*', 'platform.jobs.*', 'platform.webhooks.*', 'platform.integrations.*'],
  },
  {
    id: 'role-sec',
    role_key: 'SECURITY_ADMIN',
    display_name: 'Security Admin',
    description: 'Security Center defense, session revocation, MFA governance, and forensic audit logs.',
    is_system_role: true,
    hierarchy_level: 3,
    risk_level: 'HIGH',
    permissions_count: 12,
    permissions: ['platform.security.*', 'platform.sessions.*', 'platform.audit.*'],
  },
  {
    id: 'role-sup',
    role_key: 'SUPPORT_ADMIN',
    display_name: 'Support Admin',
    description: 'Customer escalation cases, customer activity telemetry, and knowledge base management.',
    is_system_role: true,
    hierarchy_level: 2,
    risk_level: 'LOW',
    permissions_count: 8,
    permissions: ['platform.support.*', 'platform.organizations.read'],
  },
  {
    id: 'role-ro',
    role_key: 'READ_ONLY_ADMIN',
    display_name: 'Read-Only Admin',
    description: 'Inspection and monitoring access to permitted platform modules with zero mutation capability.',
    is_system_role: true,
    hierarchy_level: 1,
    risk_level: 'LOW',
    permissions_count: 10,
    permissions: ['platform.*.read'],
  },
];

let cachedActivityList: AdminActivityRecord[] = [
  {
    id: 'act-101',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    actor_name: 'Arun Kumar',
    actor_role: 'Super Admin',
    action: 'staff.role_assigned',
    resource_type: 'PlatformStaff',
    target_user: 'priya.sharma@workforceos.com',
    target_name: 'Priya Sharma',
    before_state: { role: 'SUPPORT_ADMIN' },
    after_state: { role: 'OPERATIONS_ADMIN' },
    reason: 'Promoted to lead platform operations and queue retry duties',
    result: 'Success',
    ip_address: '103.21.144.92',
    request_id: 'req_98bf12',
    risk_level: 'HIGH',
  },
  {
    id: 'act-102',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    actor_name: 'Arun Kumar',
    actor_role: 'Super Admin',
    action: 'staff.invitation_created',
    resource_type: 'PlatformStaffInvitation',
    target_user: 'rohit.mehta@workforceos.com',
    target_name: 'Rohit Mehta',
    after_state: { role: 'OPERATIONS_ADMIN', expires_at: '48 hours' },
    reason: 'Temporary contractor access for ERP adapter integration',
    result: 'Success',
    ip_address: '103.21.144.92',
    request_id: 'req_87cd34',
    risk_level: 'MEDIUM',
  },
];

export const platformStaffService = {
  // --- Fetch Staff Directory ---
  async getStaffDirectory(filters?: {
    search?: string;
    role?: string;
    status?: string;
    department?: string;
  }): Promise<{ staff: PlatformStaffRecord[]; totalCount: number }> {
    if (isSupabaseEnabled) {
      try {
        let query = supabase.from('platform_staff').select('*');
        if (filters?.role && filters.role !== 'ALL') query = query.eq('role', filters.role);
        if (filters?.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
        const { data, error } = await query;
        if (data && !error && data.length > 0) {
          cachedStaffList = data.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            email: d.email,
            first_name: d.first_name || d.name?.split(' ')[0] || '',
            last_name: d.last_name || d.name?.split(' ')[1] || '',
            name: d.name,
            staff_code: d.staff_code || `STF-${d.id.slice(0, 5)}`,
            job_title: d.job_title || 'Platform Administrator',
            department: d.department || 'Platform Operations',
            phone: d.phone || '',
            avatar_url: d.avatar_url || '',
            role_key: d.role,
            role_display_name: cachedRolesList.find((r) => r.role_key === d.role)?.display_name || d.role,
            status: d.status,
            mfa_enforced: d.mfa_enforced ?? true,
            mfa_enabled: d.mfa_enabled ?? false,
            is_root_superadmin: d.is_root_superadmin ?? (d.role === 'SUPER_ADMIN'),
            account_start_date: d.account_start_date || d.created_at,
            account_expiry_date: d.account_expiry_date,
            active_sessions_count: d.status === 'Active' ? 1 : 0,
            risk_level: d.role === 'SUPER_ADMIN' ? 'CRITICAL' : d.role === 'PLATFORM_ADMIN' ? 'HIGH' : 'LOW',
            permissions_count: cachedRolesList.find((r) => r.role_key === d.role)?.permissions_count || 12,
            last_login_at: d.last_login_at ? new Date(d.last_login_at).toLocaleDateString() : 'Never',
            created_at: d.created_at,
          }));
        }
      } catch (err) {
        console.warn('[PlatformStaffService] Failed to query platform_staff from Supabase:', err);
      }
    }

    let list = [...cachedStaffList];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.staff_code.toLowerCase().includes(q) ||
          s.job_title.toLowerCase().includes(q)
      );
    }
    if (filters?.role && filters.role !== 'ALL') {
      list = list.filter((s) => s.role_key === filters.role);
    }
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((s) => s.status === filters.status);
    }

    return { staff: list, totalCount: list.length };
  },

  // --- Get Staff KPIs ---
  async getStaffKpis(): Promise<StaffDirectoryKPIs> {
    const list = cachedStaffList;
    return {
      total_staff: list.length,
      active_staff: list.filter((s) => s.status === 'Active').length,
      pending_invitations: list.filter((s) => s.status === 'Invitation Pending').length,
      suspended_staff: list.filter((s) => s.status === 'Suspended' || s.status === 'Disabled').length,
      mfa_protected: list.filter((s) => s.mfa_enabled).length,
      high_risk_staff: list.filter((s) => s.risk_level === 'CRITICAL' || s.risk_level === 'HIGH').length,
    };
  },

  // --- Roles & Permissions ---
  async getRoles(): Promise<PlatformRoleRecord[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('platform_roles').select('*');
        if (data && !error && data.length > 0) {
          cachedRolesList = data.map((d: any) => ({
            id: d.id,
            role_key: d.role_key,
            display_name: d.display_name,
            description: d.description || '',
            is_system_role: d.is_system_role ?? true,
            hierarchy_level: d.hierarchy_level || 3,
            risk_level: d.risk_level || 'MEDIUM',
            permissions_count: d.role_key === 'SUPER_ADMIN' ? 34 : 16,
            permissions: [],
          }));
        }
      } catch (err) {
        console.warn('[PlatformStaffService] Failed to query platform_roles:', err);
      }
    }
    return cachedRolesList;
  },

  // --- Create / Invite Platform Staff Wizard ---
  async createStaff(payload: {
    first_name: string;
    last_name: string;
    display_name?: string;
    email: string;
    phone?: string;
    job_title: string;
    department: string;
    staff_code?: string;
    role_key: string;
    mfa_enforced?: boolean;
    account_expiry_date?: string;
    scopes?: PlatformStaffScopeItem[];
  }, actorName: string = 'Arun Kumar'): Promise<PlatformStaffRecord> {
    // 1. Validation: Prevent duplicate email
    const existing = cachedStaffList.find((s) => s.email.toLowerCase() === payload.email.toLowerCase());
    if (existing) {
      throw new Error(`Platform staff account with email ${payload.email} already exists.`);
    }

    // 2. Privilege Escalation Guard: Only Super Admin can create/grant Super Admin
    if (payload.role_key === 'SUPER_ADMIN' && actorName !== 'Arun Kumar') {
      throw new Error('403 Forbidden: Privilege escalation violation. Only existing Root Super Admins can grant the Super Admin role.');
    }

    const fullName = payload.display_name || `${payload.first_name} ${payload.last_name}`.trim();
    const roleMeta = cachedRolesList.find((r) => r.role_key === payload.role_key);

    const newRecord: PlatformStaffRecord = {
      id: `stf-${Date.now().toString(36)}`,
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name,
      name: fullName,
      staff_code: payload.staff_code || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
      job_title: payload.job_title || 'Platform Administrator',
      department: payload.department || 'Platform Operations',
      phone: payload.phone || '',
      role_key: payload.role_key,
      role_display_name: roleMeta?.display_name || payload.role_key,
      status: 'Invitation Pending',
      mfa_enforced: payload.mfa_enforced ?? true,
      mfa_enabled: false,
      is_root_superadmin: false,
      account_start_date: new Date().toISOString(),
      account_expiry_date: payload.account_expiry_date,
      active_sessions_count: 0,
      risk_level: roleMeta?.risk_level || 'MEDIUM',
      permissions_count: roleMeta?.permissions_count || 12,
      created_at: new Date().toISOString(),
      scopes: payload.scopes || [],
    };

    if (isSupabaseEnabled) {
      try {
        await supabase.from('platform_staff').insert({
          email: newRecord.email,
          first_name: newRecord.first_name,
          last_name: newRecord.last_name,
          name: newRecord.name,
          staff_code: newRecord.staff_code,
          job_title: newRecord.job_title,
          department: newRecord.department,
          phone: newRecord.phone,
          role: newRecord.role_key,
          status: newRecord.status,
          mfa_enforced: newRecord.mfa_enforced,
          account_expiry_date: newRecord.account_expiry_date,
        });

        // Create Invitation Token
        await supabase.from('platform_staff_invitations').insert({
          email: newRecord.email,
          role_key: newRecord.role_key,
          invitation_token_hash: `tok_${Math.random().toString(36).slice(2)}`,
          status: 'pending',
        });
      } catch (err) {
        console.warn('[PlatformStaffService] Failed to persist new staff in Supabase:', err);
      }
    }

    cachedStaffList = [newRecord, ...cachedStaffList];

    // Forensic Audit Entry
    const auditRecord: AdminActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'staff.created_and_invited',
      resource_type: 'PlatformStaff',
      target_user: newRecord.email,
      target_name: newRecord.name,
      after_state: { role: newRecord.role_key, status: newRecord.status, expiry: newRecord.account_expiry_date },
      reason: `Platform Staff invited with role ${newRecord.role_display_name}`,
      result: 'Success',
      ip_address: '103.21.144.92',
      request_id: `req_${Math.random().toString(36).slice(2, 8)}`,
      risk_level: newRecord.risk_level,
    };
    cachedActivityList = [auditRecord, ...cachedActivityList];

    await platformAuditService.logEvent({
      action: 'staff.created_and_invited',
      category: 'IAM',
      resource_type: 'PlatformStaff',
      resource_id: newRecord.id,
      resource_name: newRecord.name,
      severity: newRecord.risk_level === 'CRITICAL' ? 'Critical' : 'High',
      reason: `Invited new platform staff member ${newRecord.name} (${newRecord.email}) under role ${newRecord.role_display_name}`,
    });

    return newRecord;
  },

  // --- Change Staff Role ---
  async updateStaffRole(
    staffId: string,
    newRoleKey: string,
    reason: string,
    actorName: string = 'Arun Kumar'
  ): Promise<PlatformStaffRecord> {
    const target = cachedStaffList.find((s) => s.id === staffId);
    if (!target) throw new Error('Staff member not found');

    // Last Super Admin Protection
    if (target.role_key === 'SUPER_ADMIN' && newRoleKey !== 'SUPER_ADMIN') {
      const remainingSuperAdmins = cachedStaffList.filter((s) => s.role_key === 'SUPER_ADMIN' && s.status === 'Active' && s.id !== staffId);
      if (remainingSuperAdmins.length === 0) {
        throw new Error('Self-protection violation: Cannot demote the last remaining active Super Admin on the platform.');
      }
    }

    const prevRole = target.role_key;
    const newRoleMeta = cachedRolesList.find((r) => r.role_key === newRoleKey);
    target.role_key = newRoleKey;
    target.role_display_name = newRoleMeta?.display_name || newRoleKey;
    target.risk_level = newRoleMeta?.risk_level || 'MEDIUM';
    target.permissions_count = newRoleMeta?.permissions_count || 12;

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('platform_staff')
          .update({ role: newRoleKey, updated_at: new Date().toISOString() })
          .eq('id', staffId);
      } catch (err) {
        console.warn('[PlatformStaffService] Failed to update staff role in Supabase:', err);
      }
    }

    // Log Activity
    const act: AdminActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'staff.role_changed',
      resource_type: 'PlatformStaff',
      target_user: target.email,
      target_name: target.name,
      before_state: { role: prevRole },
      after_state: { role: newRoleKey },
      reason,
      result: 'Success',
      ip_address: '103.21.144.92',
      request_id: `req_${Math.random().toString(36).slice(2, 8)}`,
      risk_level: 'HIGH',
    };
    cachedActivityList = [act, ...cachedActivityList];

    await platformAuditService.logEvent({
      action: 'staff.role_changed',
      category: 'IAM',
      resource_type: 'PlatformStaff',
      resource_id: target.id,
      resource_name: target.name,
      severity: 'High',
      reason: `Staff role changed from ${prevRole} to ${newRoleKey}: ${reason}`,
    });

    return target;
  },

  // --- Suspend / Disable / Activate Staff ---
  async updateStaffStatus(
    staffId: string,
    newStatus: StaffStatus,
    reason: string,
    actorName: string = 'Arun Kumar'
  ): Promise<PlatformStaffRecord> {
    const target = cachedStaffList.find((s) => s.id === staffId);
    if (!target) throw new Error('Staff member not found');

    // Last Super Admin Protection
    if (target.role_key === 'SUPER_ADMIN' && newStatus !== 'Active') {
      const remainingSuperAdmins = cachedStaffList.filter((s) => s.role_key === 'SUPER_ADMIN' && s.status === 'Active' && s.id !== staffId);
      if (remainingSuperAdmins.length === 0) {
        throw new Error('Self-protection violation: Cannot suspend or disable the last remaining active Super Admin on the platform.');
      }
    }

    const prevStatus = target.status;
    target.status = newStatus;
    if (newStatus === 'Suspended' || newStatus === 'Disabled') {
      target.active_sessions_count = 0;
    }

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('platform_staff')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', staffId);
      } catch (err) {
        console.warn('[PlatformStaffService] Failed to update staff status on Supabase:', err);
      }
    }

    const act: AdminActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: `staff.status_${newStatus.toLowerCase().replace(' ', '_')}`,
      resource_type: 'PlatformStaff',
      target_user: target.email,
      target_name: target.name,
      before_state: { status: prevStatus },
      after_state: { status: newStatus },
      reason,
      result: 'Success',
      ip_address: '103.21.144.92',
      request_id: `req_${Math.random().toString(36).slice(2, 8)}`,
      risk_level: 'HIGH',
    };
    cachedActivityList = [act, ...cachedActivityList];

    await platformAuditService.logEvent({
      action: `staff.status_changed`,
      category: 'IAM',
      resource_type: 'PlatformStaff',
      resource_id: target.id,
      resource_name: target.name,
      severity: newStatus === 'Suspended' || newStatus === 'Disabled' ? 'Critical' : 'Normal',
      reason: `Staff status changed from ${prevStatus} to ${newStatus}: ${reason}`,
    });

    return target;
  },

  // --- Revoke Staff Sessions ---
  async revokeStaffSessions(staffId: string, reason: string, actorName: string = 'Arun Kumar'): Promise<void> {
    const target = cachedStaffList.find((s) => s.id === staffId);
    if (!target) throw new Error('Staff member not found');

    target.active_sessions_count = 0;

    const act: AdminActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'staff.sessions_revoked',
      resource_type: 'PlatformStaff',
      target_user: target.email,
      target_name: target.name,
      reason,
      result: 'Success',
      ip_address: '103.21.144.92',
      request_id: `req_${Math.random().toString(36).slice(2, 8)}`,
      risk_level: 'HIGH',
    };
    cachedActivityList = [act, ...cachedActivityList];

    await platformAuditService.logEvent({
      action: 'staff.sessions_revoked',
      category: 'Security',
      resource_type: 'PlatformStaff',
      resource_id: target.id,
      resource_name: target.name,
      severity: 'High',
      reason: `Revoked all active sessions for ${target.name} (${target.email}): ${reason}`,
    });
  },

  // --- Administrative Activity Log ---
  async getAdministrativeActivity(): Promise<AdminActivityRecord[]> {
    return cachedActivityList;
  },
};
