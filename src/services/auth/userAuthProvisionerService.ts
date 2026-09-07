// src/services/auth/userAuthProvisionerService.ts
// ============================================================
// Joy PeopleHR Enterprise — Universal Tenant Auth Provisioning Service
// Dispatches server-side GoTrue Auth user creation, role assignment,
// and database profile linkage with temporary password joypeoplehr.
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from '../platform/platformAuditService';

export type ProvisionableRole = 'COMPANY_ADMIN' | 'HR_HEAD' | 'HR_ADMIN' | 'EMPLOYEE' | 'MANAGER';

export interface ProvisionUserParams {
  organizationId: string;
  organizationName?: string;
  companyId?: string;
  email: string;
  fullName: string;
  roleCode: ProvisionableRole;
  employeeId?: string;
  phone?: string;
  department?: string;
  temporaryPassword?: string;
}

export interface ProvisionUserResult {
  success: boolean;
  authUserId?: string;
  userProfileId?: string;
  userProfile?: any;
  roleCode?: string;
  message?: string;
  error?: string;
}

export const userAuthProvisionerService = {
  /**
   * Provision a real Supabase GoTrue Auth user account with canonical role and database linkage.
   * Strictly invokes the server-side employee-auth-provisioner edge function using the caller's active session.
   */
  async provisionUser(params: ProvisionUserParams): Promise<ProvisionUserResult> {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.fullName.trim();
    const tempPassword = params.temporaryPassword || 'joypeoplehr';

    if (!cleanEmail || !params.organizationId || !cleanName) {
      return {
        success: false,
        error: 'Missing required provisioning fields (organizationId, email, fullName).',
      };
    }

    const roleCode = params.roleCode === 'HR_ADMIN' ? 'HR_HEAD' : params.roleCode;

    if (!isSupabaseEnabled) {
      return {
        success: true,
        authUserId: `auth-local-${Date.now()}`,
        roleCode,
        message: `Offline/local mode: Account configured for ${cleanEmail}.`,
      };
    }

    try {
      // 1. Validate caller authentication session
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (sessionErr || !session?.access_token) {
        return {
          success: false,
          error: 'Authentication session required. Please sign in again as an authorized administrator.',
        };
      }

      // 2. Dispatch server-side Edge Function invocation with explicit Authorization Bearer token
      const { data, error } = await supabase.functions.invoke('employee-auth-provisioner', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          organization_id: params.organizationId,
          company_id: params.companyId,
          email: cleanEmail,
          password: tempPassword,
          full_name: cleanName,
          role_code: roleCode,
          employee_id: params.employeeId,
          phone: params.phone,
          department: params.department,
        },
      });

      if (error) {
        // FunctionsHttpError contains the response
        let errorMsg = error.message || 'Server-side provisioning failed.';
        try {
          if ((error as any).context?.json) {
            const body = await (error as any).context.json();
            if (body?.error) errorMsg = body.error;
          }
        } catch (_) {}

        return {
          success: false,
          error: errorMsg,
        };
      }

      if (data && data.success) {
        // 3. Log audit event asynchronously without blocking UI
        platformAuditService.logEvent({
          actor_id: session.user?.id || 'system-provisioner',
          actor_name: session.user?.email || 'Administrator',
          actor_role: 'Company Admin',
          organization_id: params.organizationId,
          organization_name: params.organizationName || 'Organization',
          action: 'USER_PROVISIONED',
          resource_type: 'AuthUser',
          resource_id: data.auth_user_id,
          severity: 'Normal',
          reason: `Successfully provisioned ${roleCode} (${cleanEmail}) with temporary credentials.`,
        }).catch(() => {});

        return {
          success: true,
          authUserId: data.auth_user_id,
          userProfileId: data.user_profile_id,
          userProfile: {
            id: data.user_profile_id,
            auth_user_id: data.auth_user_id,
            email: cleanEmail,
            full_name: cleanName,
            organization_id: params.organizationId,
            company_id: params.companyId,
            role: roleCode,
            status: 'ACTIVE',
          },
          roleCode: data.role_code || roleCode,
          message: data.message || `Account for ${cleanEmail} provisioned successfully with temporary password joypeoplehr.`,
        };
      }

      return {
        success: false,
        error: data?.error || 'Failed to provision user identity.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Provisioning request failed unexpectedly.',
      };
    }
  },
};

