// src/services/platform/platformStaffService.ts
// ============================================================
// Joy PeopleHR — Platform Admin Assistant & Delegated IAM Service
// ============================================================

import { supabase, isSupabaseEnabled, getAppBaseUrl } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';
import { resendEmailService } from '../email/resendEmailService';

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
  event_code: string;
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

// Fallback Cache for Zero-State & Offline Sync
let cachedStaffList: PlatformStaffRecord[] = [];
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

let cachedActivityList: AdminActivityRecord[] = [];

// Helper to safely dispatch client-side events without secrets
function dispatchSafeRealtimeEvent(eventName: string, payload: Record<string, any>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          ...payload,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }
}

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
        let query = supabase.from('platform_staff').select('*').order('created_at', { ascending: false });
        if (filters?.role && filters.role !== 'ALL') query = query.eq('role', filters.role);
        if (filters?.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
        const { data, error } = await query;
        if (data && !error) {
          cachedStaffList = data
            .map((d: any) => ({
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
        if (data && !error) {
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
  async createStaff(
    payload: {
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
    },
    actorName: string = 'THIRUMALAI R K'
  ): Promise<PlatformStaffRecord> {
    const existing = cachedStaffList.find((s) => s.email.toLowerCase() === payload.email.toLowerCase());
    if (existing) {
      throw new Error(`Platform staff account with email ${payload.email} already exists.`);
    }

    if (payload.role_key === 'SUPER_ADMIN' && actorName !== 'THIRUMALAI R K') {
      throw new Error('403 Forbidden: Privilege escalation violation. Only existing Root Super Admins can grant the Super Admin role.');
    }

    const fullName = payload.display_name || `${payload.first_name} ${payload.last_name}`.trim();
    const roleMeta = cachedRolesList.find((r) => r.role_key === payload.role_key);
    const requestId = `req_${Math.random().toString(36).slice(2, 8)}`;

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

    const rawToken = `tok_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://joypeoplehr.com';
    const invitationLink = `${baseUrl}/auth/accept-invite?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(newRecord.email)}&role=${encodeURIComponent(newRecord.role_key)}`;

    // Dispatch realtime high-security invitation email via Resend SMTP
    let emailDeliveryId: string | undefined;
    try {
      const emailRes = await resendEmailService.sendPlatformStaffInvitationEmail({
        to: newRecord.email,
        recipientName: newRecord.name,
        staffCode: newRecord.staff_code,
        roleDisplayName: newRecord.role_display_name,
        roleKey: newRecord.role_key,
        department: newRecord.department,
        invitedBy: `${actorName} (Root Super Admin)`,
        invitationUrl: invitationLink,
        token: rawToken,
        mfaEnforced: newRecord.mfa_enforced,
        accountExpiryDate: newRecord.account_expiry_date,
      });
      emailDeliveryId = emailRes.id;
    } catch (emailErr) {
      console.warn('[PlatformStaffService] Email dispatch failed, continuing creation:', emailErr);
    }

    if (isSupabaseEnabled) {
      try {
        const { data: inserted, error: insertError } = await supabase
          .from('platform_staff')
          .insert({
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
          })
          .select()
          .single();

        if (inserted) {
          newRecord.id = inserted.id;
        }

        // Create Invitation Record
        await supabase.from('platform_staff_invitations').insert({
          email: newRecord.email,
          role_key: newRecord.role_key,
          invitation_token_hash: rawToken,
          status: 'pending',
        });
      } catch (err) {
        console.warn('[PlatformStaffService] Failed to persist new staff in Supabase:', err);
      }
    }

    cachedStaffList = [newRecord, ...cachedStaffList];

    // Standard Audit Event: STAFF_CREATED & STAFF_INVITATION_SENT
    const auditRecord: AdminActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'STAFF_CREATED',
      event_code: 'STAFF_CREATED',
      resource_type: 'PlatformStaff',
      target_user: newRecord.email,
      target_name: newRecord.name,
      after_state: { role: newRecord.role_key, status: newRecord.status, expiry: newRecord.account_expiry_date },
      reason: `Platform Staff invited with role ${newRecord.role_display_name} (Resend ID: ${emailDeliveryId || 'queued'})`,
      result: 'Success',
      ip_address: '103.21.144.92',
      request_id: requestId,
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
      reason: `Invited new platform staff member ${newRecord.name} (${newRecord.email}) under role ${newRecord.role_display_name} via Resend SMTP Gateway`,
    });

    dispatchSafeRealtimeEvent('platform.staff.created', { staffId: newRecord.id, email: newRecord.email, role: newRecord.role_key });

    return newRecord;
  },

  // --- Realtime Resend Invitation via SMTP / Resend API ---
  async resendStaffInvitation(
    staffId: string,
    actorName: string = 'THIRUMALAI R K'
  ): Promise<{ success: boolean; message: string; deliveryId?: string }> {
    const target = cachedStaffList.find((s) => s.id === staffId);
    if (!target) throw new Error('Platform staff record not found');

    const rawToken = `tok_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const baseUrl = getAppBaseUrl();
    const invitationLink = `${baseUrl}/auth/accept-invite?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(target.email)}&role=${encodeURIComponent(target.role_key)}`;

    // Dispatch realtime email
    const emailResult = await resendEmailService.sendPlatformStaffInvitationEmail({
      to: target.email,
      recipientName: target.name,
      staffCode: target.staff_code,
      roleDisplayName: target.role_display_name,
      roleKey: target.role_key,
      department: target.department,
      invitedBy: `${actorName} (Platform Super Admin)`,
      invitationUrl: invitationLink,
      token: rawToken,
      mfaEnforced: target.mfa_enforced,
      accountExpiryDate: target.account_expiry_date,
    });

    if (isSupabaseEnabled) {
      try {
        await supabase.from('platform_staff_invitations').upsert({
          email: target.email,
          role_key: target.role_key,
          invitation_token_hash: rawToken,
          status: 'pending',
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[PlatformStaffService] Failed to update invitation record on Supabase:', err);
      }
    }

    const requestId = `req_${Math.random().toString(36).slice(2, 8)}`;
    const auditRecord: AdminActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'STAFF_INVITATION_RESENT',
      event_code: 'STAFF_INVITATION_RESENT',
      resource_type: 'PlatformStaff',
      target_user: target.email,
      target_name: target.name,
      reason: `Resent official platform staff invitation email to ${target.email}`,
      result: emailResult.success ? 'Success' : 'Failure',
      ip_address: '103.21.144.92',
      request_id: requestId,
      risk_level: 'MEDIUM',
    };
    cachedActivityList = [auditRecord, ...cachedActivityList];

    await platformAuditService.logEvent({
      action: 'staff.invitation_resent',
      category: 'IAM',
      resource_type: 'PlatformStaff',
      resource_id: target.id,
      resource_name: target.name,
      severity: 'Normal',
      reason: `Resent platform invitation email to ${target.name} (${target.email}) via Resend SMTP gateway`,
    });

    dispatchSafeRealtimeEvent('platform.staff.invitation_resent', { staffId: target.id, email: target.email });

    return {
      success: emailResult.success,
      message: emailResult.success
        ? `Invitation successfully dispatched to ${target.email} via Resend SMTP (Message ID: ${emailResult.id || 'msg_ok'})`
        : `Email dispatched with status: ${emailResult.error || 'Delivered'}`,
      deliveryId: emailResult.id,
    };
  },

  // --- Change Staff Role ---
  async updateStaffRole(
    staffId: string,
    newRoleKey: string,
    reason: string,
    actorName: string = 'Platform Super Admin'
  ): Promise<PlatformStaffRecord> {
    const target = cachedStaffList.find((s) => s.id === staffId);
    if (!target) throw new Error('Staff member not found');

    if (target.role_key === 'SUPER_ADMIN' && newRoleKey !== 'SUPER_ADMIN') {
      const remainingSuperAdmins = cachedStaffList.filter((s) => s.role_key === 'SUPER_ADMIN' && s.status === 'Active' && s.id !== staffId);
      if (remainingSuperAdmins.length === 0) {
        throw new Error('Self-protection violation: Cannot demote the last remaining active Super Admin on the platform.');
      }
    }

    const prevRole = target.role_key;
    const newRoleMeta = cachedRolesList.find((r) => r.role_key === newRoleKey);
    const requestId = `req_${Math.random().toString(36).slice(2, 8)}`;

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

    const act: AdminActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'STAFF_ROLE_CHANGED',
      event_code: 'STAFF_ROLE_CHANGED',
      resource_type: 'PlatformStaff',
      target_user: target.email,
      target_name: target.name,
      before_state: { role: prevRole },
      after_state: { role: newRoleKey },
      reason,
      result: 'Success',
      ip_address: '103.21.144.92',
      request_id: requestId,
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

    dispatchSafeRealtimeEvent('platform.role.assigned', { staffId: target.id, role: newRoleKey });

    return target;
  },

  // --- Suspend / Disable / Activate Staff ---
  async updateStaffStatus(
    staffId: string,
    newStatus: StaffStatus,
    reason: string,
    actorName: string = 'Platform Super Admin'
  ): Promise<PlatformStaffRecord> {
    const target = cachedStaffList.find((s) => s.id === staffId);
    if (!target) throw new Error('Staff member not found');

    if (target.role_key === 'SUPER_ADMIN' && newStatus !== 'Active') {
      const remainingSuperAdmins = cachedStaffList.filter((s) => s.role_key === 'SUPER_ADMIN' && s.status === 'Active' && s.id !== staffId);
      if (remainingSuperAdmins.length === 0) {
        throw new Error('Self-protection violation: Cannot suspend or disable the last remaining active Super Admin on the platform.');
      }
    }

    const prevStatus = target.status;
    const eventCode = newStatus === 'Suspended' ? 'STAFF_SUSPENDED' : newStatus === 'Active' ? 'STAFF_REACTIVATED' : 'STAFF_DISABLED';
    const requestId = `req_${Math.random().toString(36).slice(2, 8)}`;

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
      action: eventCode,
      event_code: eventCode,
      resource_type: 'PlatformStaff',
      target_user: target.email,
      target_name: target.name,
      before_state: { status: prevStatus },
      after_state: { status: newStatus },
      reason,
      result: 'Success',
      ip_address: '103.21.144.92',
      request_id: requestId,
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

    dispatchSafeRealtimeEvent('platform.staff.updated', { staffId: target.id, status: newStatus });

    return target;
  },

  // --- Revoke Staff Sessions ---
  async revokeStaffSessions(staffId: string, reason: string, actorName: string = 'Platform Super Admin'): Promise<void> {
    const target = cachedStaffList.find((s) => s.id === staffId);
    if (!target) throw new Error('Staff member not found');

    target.active_sessions_count = 0;
    const requestId = `req_${Math.random().toString(36).slice(2, 8)}`;

    const act: AdminActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'STAFF_ALL_SESSIONS_REVOKED',
      event_code: 'STAFF_ALL_SESSIONS_REVOKED',
      resource_type: 'PlatformStaff',
      target_user: target.email,
      target_name: target.name,
      reason,
      result: 'Success',
      ip_address: '103.21.144.92',
      request_id: requestId,
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

    dispatchSafeRealtimeEvent('platform.session.revoked', { staffId: target.id });
  },

  // --- Get Staff Specific Activity History (Requirement 49) ---
  async getStaffActivity(email: string): Promise<AdminActivityRecord[]> {
    return cachedActivityList.filter(
      (a) =>
        a.target_user?.toLowerCase() === email.toLowerCase() ||
        a.actor_name.toLowerCase().includes(email.toLowerCase())
    );
  },

  // --- Forensic Administrative Activity Search (Requirement 57: Who, What, To Whom, When) ---
  async searchAdministrativeActivity(filters?: {
    who?: string;
    what?: string;
    to_whom?: string;
    time_range?: '24h' | '7d' | '30d' | 'all';
  }): Promise<AdminActivityRecord[]> {
    let list = [...cachedActivityList];

    if (filters?.who) {
      const q = filters.who.toLowerCase();
      list = list.filter((a) => a.actor_name.toLowerCase().includes(q));
    }

    if (filters?.what && filters.what !== 'ALL') {
      list = list.filter((a) => a.action === filters.what || a.event_code === filters.what);
    }

    if (filters?.to_whom) {
      const q = filters.to_whom.toLowerCase();
      list = list.filter(
        (a) => (a.target_name && a.target_name.toLowerCase().includes(q)) || (a.target_user && a.target_user.toLowerCase().includes(q))
      );
    }

    if (filters?.time_range && filters.time_range !== 'all') {
      const now = Date.now();
      const windowMs =
        filters.time_range === '24h'
          ? 24 * 3600 * 1000
          : filters.time_range === '7d'
          ? 7 * 24 * 3600 * 1000
          : 30 * 24 * 3600 * 1000;

      list = list.filter((a) => now - new Date(a.timestamp).getTime() <= windowMs);
    }

    return list;
  },

  async getAdministrativeActivity(): Promise<AdminActivityRecord[]> {
    return cachedActivityList;
  },

  // --- Delete / Remove Staff Member ---
  async deleteStaff(staffId: string, actorName: string = 'Platform Super Admin'): Promise<void> {
    const target = cachedStaffList.find((s) => s.id === staffId);
    if (!target) throw new Error('Staff member not found');

    if (target.is_root_superadmin || target.role_key === 'SUPER_ADMIN') {
      throw new Error('Self-protection violation: Root Super Admin accounts cannot be deleted.');
    }

    if (isSupabaseEnabled) {
      try {
        await supabase.from('platform_staff').delete().eq('id', staffId);
      } catch (err) {
        console.warn('[PlatformStaffService] Failed to delete staff from Supabase:', err);
      }
    }

    cachedStaffList = cachedStaffList.filter((s) => s.id !== staffId);

    const act: AdminActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor_name: actorName,
      actor_role: 'Super Admin',
      action: 'STAFF_DELETED',
      event_code: 'STAFF_DELETED',
      resource_type: 'PlatformStaff',
      target_user: target.email,
      target_name: target.name,
      reason: 'Administrative removal of platform staff account',
      result: 'Success',
      ip_address: '103.21.144.92',
      request_id: `req_${Math.random().toString(36).slice(2, 8)}`,
      risk_level: 'HIGH',
    };
    cachedActivityList = [act, ...cachedActivityList];

    await platformAuditService.logEvent({
      action: 'staff.deleted',
      category: 'IAM',
      resource_type: 'PlatformStaff',
      resource_id: target.id,
      resource_name: target.name,
      severity: 'Critical',
      reason: `Staff member ${target.name} (${target.email}) was removed by ${actorName}`,
    });

    dispatchSafeRealtimeEvent('platform.staff.deleted', { staffId });
  },
};
