// src/services/whatsapp/whatsappPermissionService.ts
// ============================================================================
// JOY PeopleHR — WhatsApp Enterprise Permission & Authorization Engine
// Dynamic Capability Resolution & Backend Access Enforcement
// Ensures that displayed menus and incoming button payloads are strictly verified.
// ============================================================================

import { WhatsAppPermission, WhatsAppRoleContext, BotSessionContext } from './types';
import { whatsAppLogger } from './whatsappLogger';

export interface AuthorizationCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermission?: WhatsAppPermission;
  organizationId?: string;
}

export class WhatsAppPermissionService {
  private static instance: WhatsAppPermissionService;

  public static getInstance(): WhatsAppPermissionService {
    if (!WhatsAppPermissionService.instance) {
      WhatsAppPermissionService.instance = new WhatsAppPermissionService();
    }
    return WhatsAppPermissionService.instance;
  }

  /**
   * Evaluates whether a session has the required permission for an action.
   * Performs 4-point verification:
   * 1. Session is authenticated & verified
   * 2. Session has not expired
   * 3. Tenant boundaries are respected (organizationId matches)
   * 4. Session permission list contains the required capability
   */
  authorize(params: {
    session: BotSessionContext;
    requiredPermission: WhatsAppPermission;
    targetOrganizationId?: string;
    correlationId?: string;
  }): AuthorizationCheckResult {
    const { session, requiredPermission, targetOrganizationId, correlationId = 'WA-AUTHZ' } = params;

    // 1. Session must be authenticated
    if (session.authStatus !== 'VERIFIED') {
      whatsAppLogger.recordAuditEvent({
        correlationId,
        organizationId: session.organizationId,
        employeeId: session.employeeId,
        eventType: 'WA_PERMISSION_DENIED',
        result: 'DENIED',
        errorCode: 'UNAUTHENTICATED_SESSION',
        metadata: { requiredPermission },
      });
      return { allowed: false, reason: 'Session is not authenticated. Please verify your identity first.' };
    }

    // 2. Check session expiry (24-hour TTL)
    if (session.lastActiveAt) {
      const lastActive = new Date(session.lastActiveAt).getTime();
      const now = Date.now();
      const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
      if (now - lastActive > SESSION_TTL_MS) {
        session.authStatus = 'UNAUTHENTICATED';
        whatsAppLogger.recordAuditEvent({
          correlationId,
          organizationId: session.organizationId,
          employeeId: session.employeeId,
          eventType: 'WA_SESSION_EXPIRED',
          result: 'DENIED',
          metadata: { requiredPermission },
        });
        return { allowed: false, reason: 'Your session has expired. Please verify your mobile number again.' };
      }
    }

    // 3. Multi-Tenant isolation
    if (targetOrganizationId && session.organizationId !== targetOrganizationId) {
      whatsAppLogger.recordAuditEvent({
        correlationId,
        organizationId: session.organizationId,
        employeeId: session.employeeId,
        eventType: 'WA_PERMISSION_DENIED',
        result: 'DENIED',
        errorCode: 'CROSS_TENANT_VIOLATION',
        metadata: {
          sessionOrg: session.organizationId,
          targetOrg: targetOrganizationId,
          requiredPermission,
        },
      });
      return { allowed: false, reason: 'Cross-organization access is strictly prohibited.' };
    }

    // 4. Permission check
    const permissions = session.permissions || [];
    const hasPermission = permissions.includes(requiredPermission);

    if (!hasPermission) {
      whatsAppLogger.recordAuditEvent({
        correlationId,
        organizationId: session.organizationId,
        employeeId: session.employeeId,
        eventType: 'WA_PERMISSION_DENIED',
        result: 'DENIED',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        metadata: {
          requiredPermission,
          roleContext: session.roleContext,
        },
      });
      return {
        allowed: false,
        reason: `Access denied. You do not have the required permission (${requiredPermission}) to perform this action.`,
        requiredPermission,
      };
    }

    // Granted
    whatsAppLogger.recordAuditEvent({
      correlationId,
      organizationId: session.organizationId,
      employeeId: session.employeeId,
      eventType: 'WA_PERMISSION_GRANTED',
      result: 'SUCCESS',
      metadata: { requiredPermission },
    });

    return { allowed: true, requiredPermission, organizationId: session.organizationId };
  }

  /**
   * Generates dynamic role-aware menu items based on actual granted permissions
   */
  generateMenuItems(permissions: WhatsAppPermission[]): Array<{ id: string; title: string; category: string }> {
    const items: Array<{ id: string; title: string; category: string }> = [];

    // Self-Service Capabilities
    if (permissions.includes('attendance.view_self')) {
      items.push({ id: 'MENU_ATTENDANCE', title: '⏰ Attendance & Clock Times', category: 'SELF_SERVICE' });
    }
    if (permissions.includes('leave.view_self')) {
      items.push({ id: 'MENU_LEAVE', title: '🌴 Leave Balance & Request', category: 'SELF_SERVICE' });
    }
    if (permissions.includes('regularization.view_self')) {
      items.push({ id: 'MENU_REGULARIZATION', title: '🕐 Regularize Missed Punch', category: 'SELF_SERVICE' });
    }
    if (permissions.includes('payslip.view_self')) {
      items.push({ id: 'MENU_PAYSLIP', title: '💰 Payslip & Salary History', category: 'SELF_SERVICE' });
    }
    if (permissions.includes('profile.view_self')) {
      items.push({ id: 'MENU_PROFILE', title: '👤 My Employee Profile', category: 'SELF_SERVICE' });
    }
    if (permissions.includes('documents.view_self')) {
      items.push({ id: 'MENU_DOCUMENTS', title: '📁 Official Documents', category: 'SELF_SERVICE' });
    }
    if (permissions.includes('helpdesk.create')) {
      items.push({ id: 'MENU_HELPDESK', title: '🎧 Helpdesk Support Ticket', category: 'SELF_SERVICE' });
    }

    // Team Leader / Manager Capabilities
    if (permissions.includes('team.attendance.view')) {
      items.push({ id: 'MENU_TEAM_ATTENDANCE', title: '👥 Team Today Attendance', category: 'TEAM_MANAGEMENT' });
    }
    if (permissions.includes('leave.approve')) {
      items.push({ id: 'MENU_LEAVE_APPROVALS', title: '📝 Pending Leave Approvals', category: 'TEAM_MANAGEMENT' });
    }
    if (permissions.includes('regularization.approve')) {
      items.push({ id: 'MENU_REG_APPROVALS', title: '⏳ Pending Regularizations', category: 'TEAM_MANAGEMENT' });
    }
    if (permissions.includes('team.members.view')) {
      items.push({ id: 'MENU_TEAM_MEMBERS', title: '📋 Direct Reports & Roster', category: 'TEAM_MANAGEMENT' });
    }

    // HR Operations & Admin Capabilities
    if (permissions.includes('employee.search')) {
      items.push({ id: 'MENU_EMPLOYEE_SEARCH', title: '🔍 Search Employee Directory', category: 'HR_OPERATIONS' });
    }
    if (permissions.includes('reports.view')) {
      items.push({ id: 'MENU_REPORTS', title: '📊 Department & Shift Reports', category: 'HR_OPERATIONS' });
    }
    if (permissions.includes('policy.broadcast')) {
      items.push({ id: 'MENU_BROADCAST', title: '📢 Organization Broadcast', category: 'HR_OPERATIONS' });
    }

    return items;
  }
}

export const whatsAppPermissionService = WhatsAppPermissionService.getInstance();
