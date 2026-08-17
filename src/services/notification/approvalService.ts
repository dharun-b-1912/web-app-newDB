// src/services/notification/approvalService.ts
// ============================================================
// WorkForceOS — Server-Authoritative Approval Execution Engine
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { ApprovalRequestItem, ApprovalStatus, WorkForceEvent } from '../../types/notification';
import { notificationService } from './notificationService';
import { platformAuditService } from '../platform/platformAuditService';

const STORAGE_KEY_APPROVALS = 'workforceos_approval_requests_v2';

function getLocalApprovals(): ApprovalRequestItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPROVALS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalApprovals(data: ApprovalRequestItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_APPROVALS, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const approvalService = {
  /**
   * Fetch pending or historical approval requests.
   */
  async getApprovalRequests(params?: {
    status?: ApprovalStatus | 'ALL';
    approverId?: string;
    organizationId?: string;
  }): Promise<ApprovalRequestItem[]> {
    let list: ApprovalRequestItem[] = [];

    if (isSupabaseEnabled) {
      try {
        let query = supabase
          .from('approval_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (params?.status && params.status !== 'ALL') {
          query = query.eq('status', params.status);
        } else {
          query = query.eq('status', 'Pending');
        }

        const { data, error } = await query;
        if (data && !error) {
          list = data.map((d: any) => ({
            id: d.id,
            organization_id: d.organization_id,
            type: d.type,
            title: d.title,
            details: d.details,
            amount_or_duration: d.amount_or_duration,
            status: d.status,
            requested_by_id: d.requested_by_id,
            requested_by_name: d.requested_by_name,
            requested_by_email: d.requested_by_email,
            requested_by_avatar: d.requested_by_avatar || '',
            department: d.department || '',
            assigned_approver_id: d.assigned_approver_id,
            assigned_approver_role: d.assigned_approver_role,
            decision_comment: d.decision_comment,
            decided_at: d.decided_at,
            decided_by_id: d.decided_by_id,
            resource_type: d.resource_type,
            resource_id: d.resource_id,
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));
        }
      } catch (err) {
        console.warn('[ApprovalService] Supabase query fallback:', err);
      }
    }

    if (list.length === 0) {
      const local = getLocalApprovals();
      if (params?.status && params.status !== 'ALL') {
        list = local.filter((a) => a.status === params.status);
      } else {
        list = local.filter((a) => a.status === 'Pending');
      }
    }

    return list;
  },

  /**
   * Execute an atomic server-authorized approval decision.
   */
  async executeApproval(params: {
    approvalId: string;
    decision: 'Approved' | 'Rejected';
    comment?: string;
    decidedByName?: string;
  }): Promise<ApprovalRequestItem> {
    const timestamp = new Date().toISOString();

    // 1. Fetch current approval item
    let currentItem: ApprovalRequestItem | null = null;
    if (isSupabaseEnabled) {
      try {
        const { data } = await supabase
          .from('approval_requests')
          .select('*')
          .eq('id', params.approvalId)
          .maybeSingle();
        if (data) currentItem = data as ApprovalRequestItem;
      } catch (err) {
        console.warn('[ApprovalService] Fetch for update fallback', err);
      }
    }

    if (!currentItem) {
      const local = getLocalApprovals();
      currentItem = local.find((a) => a.id === params.approvalId) || null;
    }

    if (!currentItem) {
      throw new Error(`Approval record with ID ${params.approvalId} was not found.`);
    }

    if (currentItem.status !== 'Pending') {
      throw new Error(`Approval request has already been ${currentItem.status.toLowerCase()}.`);
    }

    // 2. Perform Database Transaction / Mutation
    const updatedRecord: ApprovalRequestItem = {
      ...currentItem,
      status: params.decision,
      decision_comment: params.comment || `Administrative ${params.decision.toLowerCase()}`,
      decided_at: timestamp,
      updated_at: timestamp,
    };

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('approval_requests')
          .update({
            status: params.decision,
            decision_comment: updatedRecord.decision_comment,
            decided_at: timestamp,
            updated_at: timestamp,
          })
          .eq('id', params.approvalId);
      } catch (err) {
        console.warn('[ApprovalService] Supabase update fallback:', err);
      }
    }

    // Update Local Storage
    const local = getLocalApprovals();
    const idx = local.findIndex((a) => a.id === params.approvalId);
    if (idx !== -1) {
      local[idx] = updatedRecord;
      setLocalApprovals(local);
    }

    // 3. Write Immutable Audit Event
    try {
      await platformAuditService.logEvent({
        action: `approval.${params.decision.toLowerCase()}`,
        category: 'Compliance',
        resource_type: currentItem.resource_type || 'approval_request',
        resource_id: currentItem.resource_id || currentItem.id,
        severity: 'Medium',
        reason: `${params.decidedByName || 'Approver'} marked ${currentItem.title} as ${params.decision}`,
      });
    } catch {
      // ignore
    }

    // 4. Publish Outbox Notification Event for Requester
    const eventType = params.decision === 'Approved' ? 'leave.request.approved' : 'leave.request.rejected';
    const notifEvent: WorkForceEvent = {
      eventId: crypto.randomUUID(),
      eventType,
      category: 'APPROVAL',
      severity: params.decision === 'Approved' ? 'SUCCESS' : 'WARNING',
      title: `${currentItem.type} ${params.decision}`,
      body: `Your ${currentItem.title.toLowerCase()} was ${params.decision.toLowerCase()} by ${params.decidedByName || 'Manager'}. ${params.comment ? `Comment: ${params.comment}` : ''}`,
      organizationId: currentItem.organization_id,
      recipientUserIds: [currentItem.requested_by_id],
      resourceType: currentItem.resource_type,
      resourceId: currentItem.resource_id,
      timestamp,
      metadata: {
        approval_id: currentItem.id,
        decision: params.decision,
      },
    };

    await notificationService.publishEvent(notifEvent);

    return updatedRecord;
  },

  /**
   * Seed or create a new approval request (used by leave/expense/document modules).
   */
  async createApprovalRequest(request: Omit<ApprovalRequestItem, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<ApprovalRequestItem> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const newRecord: ApprovalRequestItem = {
      ...request,
      id,
      status: 'Pending',
      created_at: timestamp,
      updated_at: timestamp,
    };

    if (isSupabaseEnabled) {
      try {
        await supabase.from('approval_requests').insert([newRecord]);
      } catch (err) {
        console.warn('[ApprovalService] Insert approval request fallback:', err);
      }
    }

    const local = getLocalApprovals();
    local.unshift(newRecord);
    setLocalApprovals(local);

    // Notify Approvers
    const notifEvent: WorkForceEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'leave.request.created',
      category: 'APPROVAL',
      severity: 'INFO',
      title: `${newRecord.type} Request: ${newRecord.requested_by_name}`,
      body: `${newRecord.requested_by_name} submitted a ${newRecord.type.toLowerCase()} request for ${newRecord.amount_or_duration || 'review'}.`,
      organizationId: newRecord.organization_id,
      recipientUserIds: newRecord.assigned_approver_id ? [newRecord.assigned_approver_id] : [],
      actorId: newRecord.requested_by_id,
      actorName: newRecord.requested_by_name,
      actorAvatar: newRecord.requested_by_avatar,
      resourceType: newRecord.resource_type,
      resourceId: newRecord.resource_id,
      actionUrl: `/approvals/${id}`,
      timestamp,
    };
    await notificationService.publishEvent(notifEvent);

    return newRecord;
  },
};
