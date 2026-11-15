// src/services/platform/platformUserManagementService.ts
// ============================================================================
// Joy PeopleHR — Global Cross-Tenant User Management & Directory Service
// Platform Super Admin Control Plane for SaaS Users, Memberships, & Lifecycle
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';
import { api } from '../api';

export interface PlatformUserRecord {
  user_id: string;
  auth_user_id?: string | null;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DEACTIVATED';
  created_at: string;
  organization_id: string;
  organization_name: string;
  role_code: string;
  membership_status?: string;
  employee_code?: string | null;
}

export interface PlatformUserFilterParams {
  search?: string;
  organization_id?: string;
  role?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface PlatformUserDirectoryResponse {
  users: PlatformUserRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

class PlatformUserManagementService {
  private _cachedUsers: PlatformUserRecord[] = [];
  private _lastFetchTime = 0;

  /**
   * Fetch cross-tenant users via RPC or direct join query.
   */
  async getPlatformUsers(
    params: PlatformUserFilterParams = {},
    forceRefresh = false
  ): Promise<PlatformUserDirectoryResponse> {
    const page = params.page || 1;
    const page_size = params.page_size || 25;
    const offset = (page - 1) * page_size;

    if (isSupabaseEnabled) {
      try {
        // 1. Try authoritative RPC
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_platform_user_directory', {
          p_search: params.search || null,
          p_org_id: params.organization_id || null,
          p_role: params.role || null,
          p_status: params.status || null,
          p_limit: page_size,
          p_offset: offset,
        });

        if (!rpcErr && rpcData && typeof rpcData === 'object') {
          const list: PlatformUserRecord[] = (rpcData.users || []).map((u: any) => ({
            user_id: u.user_id,
            auth_user_id: u.auth_user_id,
            email: u.email,
            full_name: u.full_name || u.email,
            phone: u.phone,
            avatar_url: u.avatar_url,
            status: (u.status || 'ACTIVE').toUpperCase(),
            created_at: u.created_at || new Date().toISOString(),
            organization_id: u.organization_id || 'unassigned',
            organization_name: u.organization_name || 'Enterprise Workplace',
            role_code: u.role_code || 'EMPLOYEE',
            membership_status: u.membership_status,
            employee_code: u.employee_code,
          }));

          const total = Number(rpcData.total) || list.length;
          return {
            users: list,
            total,
            page,
            page_size,
            total_pages: Math.ceil(total / page_size) || 1,
          };
        }
      } catch (err) {
        console.warn('[PlatformUserManagement] RPC fallback to direct query:', err);
      }

      // 2. Direct fallback query via Supabase tables
      try {
        let q = supabase
          .from('user_profiles')
          .select('id, auth_user_id, email, full_name, phone, avatar_url, status, created_at, organization_id, role', { count: 'exact' });

        if (params.search) {
          q = q.or(`email.ilike.%${params.search}%,full_name.ilike.%${params.search}%`);
        }
        if (params.organization_id && params.organization_id !== 'all') {
          q = q.eq('organization_id', params.organization_id);
        }
        if (params.status && params.status !== 'all') {
          q = q.ilike('status', params.status);
        }

        const { data, count, error } = await q
          .order('created_at', { ascending: false })
          .range(offset, offset + page_size - 1);

        if (!error && data) {
          // Resolve organization names
          const orgIds = [...new Set(data.map((d: any) => d.organization_id).filter(Boolean))];
          let orgMap = new Map<string, string>();
          if (orgIds.length > 0) {
            const { data: orgRows } = await supabase
              .from('organizations')
              .select('id, display_name, legal_name, name')
              .in('id', orgIds);
            orgRows?.forEach((o: any) => {
              orgMap.set(o.id, o.display_name || o.legal_name || o.name);
            });
          }

          const mapped: PlatformUserRecord[] = data.map((d: any) => ({
            user_id: d.id,
            auth_user_id: d.auth_user_id,
            email: d.email,
            full_name: d.full_name || d.email,
            phone: d.phone,
            avatar_url: d.avatar_url,
            status: (d.status || 'ACTIVE').toUpperCase(),
            created_at: d.created_at,
            organization_id: d.organization_id,
            organization_name: orgMap.get(d.organization_id) || 'Enterprise Workplace',
            role_code: d.role || 'EMPLOYEE',
          }));

          const total = count || mapped.length;
          return {
            users: mapped,
            total,
            page,
            page_size,
            total_pages: Math.ceil(total / page_size) || 1,
          };
        }
      } catch (err) {
        console.warn('[PlatformUserManagement] Direct table query error:', err);
      }
    }

    // 3. In-memory / offline mock fallback
    return {
      users: [],
      total: 0,
      page: 1,
      page_size,
      total_pages: 1,
    };
  }

  /**
   * Suspend, Activate, or Deactivate user across tenant.
   */
  async updateUserStatus(
    userId: string,
    newStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED',
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    if (!userId) throw new Error('User ID is required');
    if (!reason || reason.trim().length < 5) {
      throw new Error('A detailed reason (at least 5 characters) is required for audit compliance.');
    }

    if (isSupabaseEnabled) {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        throw new Error(error.message);
      }
    }

    await platformAuditService.recordEvent({
      action: 'USER_STATUS_CHANGE',
      actor_name: api.getCurrentUser()?.name || 'Platform Admin',
      actor_role: 'Super Admin',
      category: 'IAM',
      resource_id: userId,
      resource_type: 'USER',
      severity: 'WARN',
      status: 'SUCCESS',
      description: `User ${userId} status changed to ${newStatus}. Reason: ${reason}`,
      context: { newStatus, reason },
    });

    return { success: true, message: `User status successfully updated to ${newStatus}` };
  }

  /**
   * Safe Password Reset Trigger via Supabase Auth
   */
  async triggerPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    if (!email) throw new Error('Email is required');

    if (isSupabaseEnabled) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'https://app.joypeoplehr.com'}/auth/reset-password`,
      });
      if (error) throw new Error(error.message);
    }

    await platformAuditService.recordEvent({
      action: 'USER_PASSWORD_RESET_DISPATCHED',
      actor_name: api.getCurrentUser()?.name || 'Platform Admin',
      actor_role: 'Super Admin',
      category: 'IAM',
      resource_id: email,
      resource_type: 'USER',
      severity: 'INFO',
      status: 'SUCCESS',
      description: `Password reset dispatched to ${email}`,
    });

    return { success: true, message: `Password reset instructions dispatched to ${email}` };
  }

  /**
   * Organization Lifecycle State Transition
   */
  async transitionOrganizationStatus(
    orgId: string,
    newStatus: 'Trial' | 'Active' | 'Suspended' | 'Locked' | 'Archived' | 'Cancelled' | string,
    reason: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!orgId) throw new Error('Organization ID is required');
    if (!reason || reason.trim().length < 5) throw new Error('A detailed reason (min 5 characters) is required for lifecycle actions');

    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.rpc('transition_organization_lifecycle', {
          p_organization_id: orgId,
          p_new_status: newStatus,
          p_reason: reason,
        });

        if (error) throw error;
      } catch (err: any) {
        console.warn('[PlatformUserManagement] RPC error, falling back to direct update:', err);
        const { error: patchErr } = await supabase
          .from('organizations')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', orgId);

        if (patchErr) throw new Error(patchErr.message);
      }
    }

    await platformAuditService.recordEvent({
      action: 'ORGANIZATION_LIFECYCLE_TRANSITION',
      actor_name: api.getCurrentUser()?.name || 'Platform Admin',
      actor_role: 'Super Admin',
      category: 'TENANT',
      resource_id: orgId,
      resource_type: 'ORGANIZATION',
      severity: newStatus === 'Suspended' || newStatus === 'Archived' ? 'CRITICAL' : 'INFO',
      status: 'SUCCESS',
      description: `Organization ${orgId} transitioned to ${newStatus}. Reason: ${reason}`,
      context: { orgId, newStatus, reason },
    });

    return { success: true, message: `Organization status updated to ${newStatus}` };
  }
}

export const platformUserManagementService = new PlatformUserManagementService();
