// src/services/copilot/copilotNotificationTools.ts
// ============================================================
// WorkForceOS Copilot — Notification & Approval Tools
// ============================================================

import { notificationService } from '../notification/notificationService';
import { approvalService } from '../notification/approvalService';

export const copilotNotificationTools = {
  /**
   * Get unread notifications for copilot contextual analysis.
   */
  async get_unread_notifications(params?: { limit?: number }) {
    const { items, unreadCount } = await notificationService.getNotifications({
      unreadOnly: true,
      limit: params?.limit || 10,
    });
    return {
      unread_count: unreadCount,
      notifications: items.map((i) => ({
        id: i.id,
        category: i.category,
        severity: i.severity,
        title: i.title,
        body: i.body,
        created_at: i.createdAt,
      })),
    };
  },

  /**
   * Get pending approvals requiring decision.
   */
  async get_pending_approvals() {
    const approvals = await approvalService.getApprovalRequests({ status: 'Pending' });
    return {
      pending_count: approvals.length,
      approvals: approvals.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        requested_by: a.requested_by_name,
        department: a.department,
        amount_or_duration: a.amount_or_duration,
        created_at: a.created_at,
      })),
    };
  },

  /**
   * Get critical platform security and integration alerts.
   */
  async get_security_and_integration_alerts() {
    const { items } = await notificationService.getNotifications({ limit: 20 });
    const alerts = items.filter(
      (i) =>
        (i.category === 'SECURITY' || i.category === 'INTEGRATION' || i.category === 'PLATFORM') &&
        (i.severity === 'CRITICAL' || i.severity === 'ERROR' || i.severity === 'WARNING')
    );
    return {
      alert_count: alerts.length,
      alerts: alerts.map((a) => ({
        id: a.id,
        category: a.category,
        severity: a.severity,
        title: a.title,
        body: a.body,
        created_at: a.createdAt,
      })),
    };
  },
};
