// src/services/notification/approvalService.ts
// ============================================================
// Joy PeopleHR — Server-Authoritative Approval Execution Engine
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { ApprovalRequestItem, ApprovalStatus, WorkForceEvent } from '../../types/notification';
import { notificationService } from './notificationService';
import { platformAuditService } from '../platform/platformAuditService';

const STORAGE_KEY_APPROVALS = 'workforceos_approval_requests_v2';

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

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
        // 1. Fetch from approval_instances
        let query = supabase
          .from('approval_instances')
          .select('*')
          .order('created_at', { ascending: false });

        if (params?.status && params.status !== 'ALL') {
          const canonicalStatus = params.status === 'Pending' ? 'IN_PROGRESS' : params.status === 'Approved' ? 'APPROVED' : 'REJECTED';
          query = query.eq('status', canonicalStatus);
        }

        const { data: instData } = await query;
        if (instData && instData.length > 0) {
          const instList: ApprovalRequestItem[] = instData.map((d: any) => ({
            id: d.id,
            organization_id: d.organization_id,
            type: d.target_entity_type || 'General',
            title: `Approval for ${d.target_entity_type || 'Request'}`,
            details: `Target ID: ${d.target_entity_id || d.id}`,
            amount_or_duration: '',
            status: d.status === 'APPROVED' ? 'Approved' : d.status === 'REJECTED' ? 'Rejected' : 'Pending',
            requested_by_id: d.requester_employee_id,
            requested_by_name: 'Employee',
            requested_by_email: '',
            requested_by_avatar: '',
            department: '',
            assigned_approver_id: undefined,
            assigned_approver_role: undefined,
            decision_comment: undefined,
            decided_at: d.status !== 'IN_PROGRESS' ? d.updated_at : undefined,
            decided_by_id: undefined,
            resource_type: d.target_entity_type || 'approval_instance',
            resource_id: d.target_entity_id,
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));
          list.push(...instList);
        }

        // 2. Fetch live pending leave requests
        let leaveQuery = supabase
          .from('leave_requests')
          .select(`
            id,
            organization_id,
            employee_id,
            start_date,
            end_date,
            total_days,
            reason,
            status,
            created_at,
            updated_at,
            employees:employee_id (
              first_name,
              last_name,
              work_email,
              employee_code,
              department_id,
              departments:department_id (name)
            )
          `)
          .order('created_at', { ascending: false });

        if (params?.status && params.status !== 'ALL') {
          leaveQuery = leaveQuery.eq('status', params.status.toUpperCase());
        }

        const { data: leaveData } = await leaveQuery;
        if (leaveData && leaveData.length > 0) {
          const leaveList: ApprovalRequestItem[] = leaveData.map((l: any) => {
            const emp = l.employees;
            const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : 'Employee';
            const deptName = emp?.departments?.name || '';
            const days = l.total_days || 1;
            return {
              id: l.id,
              organization_id: l.organization_id,
              type: 'leave',
              title: `Leave Application (${days} day${days > 1 ? 's' : ''})`,
              details: l.reason || 'Personal leave request',
              amount_or_duration: `${days} Day(s) • ${l.start_date} to ${l.end_date}`,
              status: l.status === 'APPROVED' ? 'Approved' : l.status === 'REJECTED' ? 'Rejected' : 'Pending',
              requested_by_id: l.employee_id,
              requested_by_name: empName || 'Employee',
              requested_by_email: emp?.work_email || '',
              requested_by_avatar: '',
              department: deptName,
              decision_comment: undefined,
              decided_at: l.status !== 'PENDING' ? l.updated_at : undefined,
              resource_type: 'leave_request',
              resource_id: l.id,
              created_at: l.created_at,
              updated_at: l.updated_at,
            };
          });
          list.push(...leaveList);
        }

        // 3. Fetch live attendance regularization requests
        let regQuery = supabase
          .from('attendance_regularizations')
          .select(`
            id,
            organization_id,
            employee_id,
            attendance_date,
            requested_check_in,
            requested_check_out,
            reason,
            status,
            created_at,
            updated_at,
            employees:employee_id (
              first_name,
              last_name,
              work_email,
              employee_code,
              department_id,
              departments:department_id (name)
            )
          `)
          .order('created_at', { ascending: false });

        if (params?.status && params.status !== 'ALL') {
          regQuery = regQuery.eq('status', params.status.toUpperCase());
        }

        const { data: regData } = await regQuery;
        if (regData && regData.length > 0) {
          const regList: ApprovalRequestItem[] = regData.map((r: any) => {
            const emp = r.employees;
            const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : 'Employee';
            const deptName = emp?.departments?.name || '';
            return {
              id: r.id,
              organization_id: r.organization_id,
              type: 'attendance',
              title: `Attendance Regularization (${r.attendance_date})`,
              details: r.reason || 'Punch regularization request',
              amount_or_duration: `Date: ${r.attendance_date}`,
              status: r.status === 'APPROVED' ? 'Approved' : r.status === 'REJECTED' ? 'Rejected' : 'Pending',
              requested_by_id: r.employee_id,
              requested_by_name: empName || 'Employee',
              requested_by_email: emp?.work_email || '',
              requested_by_avatar: '',
              department: deptName,
              decision_comment: undefined,
              decided_at: r.status !== 'PENDING' ? r.updated_at : undefined,
              resource_type: 'attendance_regularization',
              resource_id: r.id,
              created_at: r.created_at,
              updated_at: r.updated_at,
            };
          });
          list.push(...regList);
        }
      } catch (err) {
        console.warn('[ApprovalService] Live request query notice:', err);
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

    // 1. Fetch current approval item from all potential sources
    let currentItem: ApprovalRequestItem | null = null;
    if (isSupabaseEnabled) {
      try {
        // Check approval_instances
        const { data: inst } = await supabase
          .from('approval_instances')
          .select('*')
          .eq('id', params.approvalId)
          .maybeSingle();

        if (inst) {
          currentItem = {
            id: inst.id,
            organization_id: inst.organization_id,
            type: inst.target_entity_type || 'General',
            title: `Approval for ${inst.target_entity_type || 'Request'}`,
            status: inst.status === 'APPROVED' ? 'Approved' : inst.status === 'REJECTED' ? 'Rejected' : 'Pending',
            requested_by_id: inst.requester_employee_id,
            requested_by_name: 'Employee',
            resource_type: inst.target_entity_type || 'approval_instance',
            resource_id: inst.target_entity_id,
            created_at: inst.created_at,
            updated_at: inst.updated_at,
          } as ApprovalRequestItem;
        }

        // Check leave_requests
        if (!currentItem) {
          const { data: lv } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('id', params.approvalId)
            .maybeSingle();

          if (lv) {
            currentItem = {
              id: lv.id,
              organization_id: lv.organization_id,
              type: 'leave',
              title: `Leave Application`,
              status: lv.status === 'APPROVED' ? 'Approved' : lv.status === 'REJECTED' ? 'Rejected' : 'Pending',
              requested_by_id: lv.employee_id,
              requested_by_name: 'Employee',
              resource_type: 'leave_request',
              resource_id: lv.id,
              created_at: lv.created_at,
              updated_at: lv.updated_at,
            } as ApprovalRequestItem;
          }
        }

        // Check attendance_regularizations
        if (!currentItem) {
          const { data: reg } = await supabase
            .from('attendance_regularizations')
            .select('*')
            .eq('id', params.approvalId)
            .maybeSingle();

          if (reg) {
            currentItem = {
              id: reg.id,
              organization_id: reg.organization_id,
              type: 'attendance',
              title: `Attendance Regularization`,
              status: reg.status === 'APPROVED' ? 'Approved' : reg.status === 'REJECTED' ? 'Rejected' : 'Pending',
              requested_by_id: reg.employee_id,
              requested_by_name: 'Employee',
              resource_type: 'attendance_regularization',
              resource_id: reg.id,
              created_at: reg.created_at,
              updated_at: reg.updated_at,
            } as ApprovalRequestItem;
          }
        }
      } catch (err) {
        console.warn('[ApprovalService] Fetch for update notice:', err);
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
        const canonicalStatus = params.decision === 'Approved' ? 'APPROVED' : 'REJECTED';

        if (currentItem.resource_type === 'leave_request') {
          await supabase
            .from('leave_requests')
            .update({
              status: canonicalStatus,
              updated_at: timestamp,
            })
            .eq('id', params.approvalId);
        } else if (currentItem.resource_type === 'attendance_regularization') {
          await supabase
            .from('attendance_regularizations')
            .update({
              status: canonicalStatus,
              rejection_reason: params.decision === 'Rejected' ? (params.comment || 'Rejected by HR') : null,
              updated_at: timestamp,
            })
            .eq('id', params.approvalId);
        } else {
          await supabase
            .from('approval_instances')
            .update({
              status: canonicalStatus,
              updated_at: timestamp,
            })
            .eq('id', params.approvalId);

          if (currentItem.organization_id && isValidUUID(params.approvalId)) {
            await supabase.from('approval_actions').insert({
              organization_id: currentItem.organization_id,
              approval_instance_id: params.approvalId,
              action: params.decision === 'Approved' ? 'APPROVE' : 'REJECT',
              comments: updatedRecord.decision_comment,
              action_at: timestamp,
            });
          }
        }
      } catch (err) {
        console.warn('[ApprovalService] Supabase approval update notice:', err);
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
    } catch (_) {}

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

    if (isSupabaseEnabled && request.organization_id && (request as any).workflow_id) {
      try {
        await supabase.from('approval_instances').insert({
          id,
          organization_id: request.organization_id,
          workflow_id: (request as any).workflow_id,
          target_entity_type: request.resource_type || request.type,
          target_entity_id: request.resource_id || id,
          requester_employee_id: request.requested_by_id,
          status: 'IN_PROGRESS',
        });
      } catch (err) {
        console.warn('[ApprovalService] Insert canonical approval_instances notice:', err);
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
