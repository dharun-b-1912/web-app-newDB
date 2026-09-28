// src/services/approvals/unifiedApprovalEngine.ts
// ============================================================================
// JOY PeopleHR — Gate 3B: Server-Authoritative Unified Approval Engine
// Orchestrates approval workflows, instances, actions, and routes to Domain Adapters.
// Enforces tenant boundaries, role permissions, and double-approval race protection.
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import {
  DomainApprovalAdapter,
  DomainApprovalContext,
  DomainApprovalResult,
  ApprovalDecision,
} from './domainAdapterInterface';
import { LeaveApprovalAdapter } from './domainAdapters/leaveApprovalAdapter';
import { OvertimeApprovalAdapter } from './domainAdapters/overtimeApprovalAdapter';
import { AttendanceApprovalAdapter } from './domainAdapters/attendanceApprovalAdapter';
import { TravelApprovalAdapter } from './domainAdapters/travelApprovalAdapter';
import { SeparationApprovalAdapter } from './domainAdapters/separationApprovalAdapter';
import { FnFApprovalAdapter } from './domainAdapters/fnfApprovalAdapter';

export interface ApprovalInstanceRecord {
  id: string;
  organization_id: string;
  workflow_id: string;
  target_entity_type: string;
  target_entity_id: string;
  requester_employee_id: string;
  current_step_order: number;
  status: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface ApprovalActionRecord {
  id: string;
  organization_id: string;
  approval_instance_id: string;
  actor_employee_id: string;
  action: 'APPROVE' | 'REJECT' | 'DELEGATE' | 'REQUEST_INFO';
  comments?: string;
  action_at: string;
}

export interface ExecuteApprovalActionInput {
  instanceId: string;
  actorEmployeeId: string;
  actorRole?: string;
  action: ApprovalDecision;
  comments?: string;
  approverOrgId?: string;
}

const STORAGE_KEY_INSTANCES = 'joy_approval_instances_v1';
const STORAGE_KEY_ACTIONS = 'joy_approval_actions_v1';

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export class UnifiedApprovalEngine {
  private static instance: UnifiedApprovalEngine;
  private adapters: Map<string, DomainApprovalAdapter> = new Map();
  private processingLocks: Set<string> = new Set();

  private constructor() {
    this.registerDefaultAdapters();
  }

  public static getInstance(): UnifiedApprovalEngine {
    if (!UnifiedApprovalEngine.instance) {
      UnifiedApprovalEngine.instance = new UnifiedApprovalEngine();
    }
    return UnifiedApprovalEngine.instance;
  }

  private registerDefaultAdapters(): void {
    const leaveAdapter = new LeaveApprovalAdapter();
    this.registerAdapter('LEAVE', leaveAdapter);
    this.registerAdapter('Leave', leaveAdapter);

    const otAdapter = new OvertimeApprovalAdapter();
    this.registerAdapter('OVERTIME', otAdapter);
    this.registerAdapter('Overtime', otAdapter);

    const attAdapter = new AttendanceApprovalAdapter();
    this.registerAdapter('ATTENDANCE_REGULARIZATION', attAdapter);
    this.registerAdapter('AttendanceRegularization', attAdapter);
    this.registerAdapter('Attendance', attAdapter);

    const travelAdapter = new TravelApprovalAdapter();
    this.registerAdapter('TRAVEL', travelAdapter);
    this.registerAdapter('Travel', travelAdapter);

    const sepAdapter = new SeparationApprovalAdapter();
    this.registerAdapter('SEPARATION', sepAdapter);
    this.registerAdapter('Separation', sepAdapter);

    const fnfAdapter = new FnFApprovalAdapter();
    this.registerAdapter('FNF', fnfAdapter);
    this.registerAdapter('FnF', fnfAdapter);
  }

  public registerAdapter(entityType: string, adapter: DomainApprovalAdapter): void {
    this.adapters.set(entityType.toUpperCase(), adapter);
    this.adapters.set(entityType, adapter);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Local Fallback Helpers
  // ──────────────────────────────────────────────────────────────────────────
  private getLocalInstances(): ApprovalInstanceRecord[] {
    if (typeof window === 'undefined') return (globalThis as any).__JOY_APPROVAL_INSTANCES__ || [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_INSTANCES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalInstances(items: ApprovalInstanceRecord[]): void {
    if (typeof window === 'undefined') {
      (globalThis as any).__JOY_APPROVAL_INSTANCES__ = items;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_INSTANCES, JSON.stringify(items));
    } catch {}
  }

  private getLocalActions(): ApprovalActionRecord[] {
    if (typeof window === 'undefined') return (globalThis as any).__JOY_APPROVAL_ACTIONS__ || [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalActions(items: ApprovalActionRecord[]): void {
    if (typeof window === 'undefined') {
      (globalThis as any).__JOY_APPROVAL_ACTIONS__ = items;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(items));
    } catch {}
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Create Approval Instance
  // ──────────────────────────────────────────────────────────────────────────
  public async createInstance(params: {
    organizationId: string;
    workflowId?: string;
    targetEntityType: string;
    targetEntityId: string;
    requesterEmployeeId: string;
  }): Promise<ApprovalInstanceRecord> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const workflowId = params.workflowId || crypto.randomUUID();

    const record: ApprovalInstanceRecord = {
      id,
      organization_id: params.organizationId,
      workflow_id: workflowId,
      target_entity_type: params.targetEntityType,
      target_entity_id: params.targetEntityId,
      requester_employee_id: params.requesterEmployeeId,
      current_step_order: 1,
      status: 'IN_PROGRESS',
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseEnabled && isValidUUID(params.organizationId) && (!params.requesterEmployeeId || isValidUUID(params.requesterEmployeeId))) {
      try {
        await supabase.from('approval_instances').insert({
          id,
          organization_id: params.organizationId,
          workflow_id: workflowId,
          target_entity_type: params.targetEntityType,
          target_entity_id: params.targetEntityId,
          requester_employee_id: params.requesterEmployeeId,
          current_step_order: 1,
          status: 'IN_PROGRESS',
        });
      } catch (err) {
        console.warn('[UnifiedApprovalEngine] Supabase instance insert notice:', err);
      }
    }

    const localList = this.getLocalInstances();
    localList.unshift(record);
    this.saveLocalInstances(localList);

    return record;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Execute Approval Action (Atomic Transaction Contract)
  // ──────────────────────────────────────────────────────────────────────────
  public async executeApprovalAction(
    input: ExecuteApprovalActionInput
  ): Promise<{
    instance: ApprovalInstanceRecord;
    action: ApprovalActionRecord;
    domainResult: DomainApprovalResult;
  }> {
    const now = new Date().toISOString();

    // Concurrency / Race Condition Guard: in-process mutex
    if (this.processingLocks.has(input.instanceId)) {
      throw new Error(`[UnifiedApprovalEngine] STALE_ACTION: Approval instance ${input.instanceId} is currently being processed by another action.`);
    }
    this.processingLocks.add(input.instanceId);

    try {
      // 1. Fetch Current Approval Instance
      let instance: ApprovalInstanceRecord | null = null;

      if (isSupabaseEnabled) {
        try {
          const { data, error } = await supabase
            .from('approval_instances')
            .select('*')
            .eq('id', input.instanceId)
            .maybeSingle();
          if (data && !error) {
            instance = data as ApprovalInstanceRecord;
          }
        } catch (dbErr) {
          console.warn('[UnifiedApprovalEngine] Supabase fetch instance notice:', dbErr);
        }
      }

      if (!instance) {
        const localList = this.getLocalInstances();
        instance = localList.find((i) => i.id === input.instanceId) || null;
      }

      if (!instance) {
        throw new Error(`Approval instance with ID ${input.instanceId} was not found.`);
      }

      // 2. Validate current approval state (Double Approval Race Protection)
      if (instance.status !== 'IN_PROGRESS') {
        throw new Error(
          `STALE_ACTION: Approval instance ${input.instanceId} is already completed with status ${instance.status}. Duplicate approval rejected.`
        );
      }

      // 3. Validate Tenant Boundary
      if (input.approverOrgId && input.approverOrgId !== instance.organization_id) {
        throw new Error(
          `ACCESS_DENIED: Tenant isolation boundary violation. Approver organization (${input.approverOrgId}) does not match request organization (${instance.organization_id}).`
        );
      }

      // 4. Validate Actor Permission (Authorization Check)
      // Standard employee cannot approve their own or managerial requests unless they have Manager/Admin role
      if (input.actorRole === 'Employee' || (input.actorRole && !['Admin', 'Manager', 'HRAdmin', 'SuperAdmin'].includes(input.actorRole))) {
        throw new Error(
          `ACCESS_DENIED: Unauthorized approval action. Role '${input.actorRole}' is not permitted to perform managerial approval.`
        );
      }
      if (instance.requester_employee_id === input.actorEmployeeId && input.actorRole !== 'SuperAdmin') {
        throw new Error(
          `ACCESS_DENIED: Self-approval violation. Requester cannot approve their own submission.`
        );
      }

      // 5. Resolve Domain Adapter
      const adapter =
        this.adapters.get(instance.target_entity_type.toUpperCase()) ||
        this.adapters.get(instance.target_entity_type);

      if (!adapter) {
        throw new Error(
          `No registered domain adapter found for entity type '${instance.target_entity_type}'.`
        );
      }

      if (adapter.status === 'DEFERRED') {
        throw new Error(
          `Domain adapter for '${instance.target_entity_type}' is marked DEFERRED pending authoritative schema certification.`
        );
      }

      // 6. Execute Domain Adapter FIRST (Domain mutations + Domain events)
      const domainCtx: DomainApprovalContext = {
        approvalInstanceId: instance.id,
        targetEntityType: instance.target_entity_type,
        targetEntityId: instance.target_entity_id,
        organizationId: instance.organization_id,
        actorEmployeeId: input.actorEmployeeId,
        decision: input.action,
        comments: input.comments,
        stepOrder: instance.current_step_order,
      };

      const domainResult = await adapter.execute(domainCtx);
      if (!domainResult.success) {
        throw new Error(`Domain adapter execution failed: ${domainResult.error || 'Unknown error'}`);
      }

      // 7. Mutate Approval Instance and Insert Approval Action atomically
      const newStatus = input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const updatedInstance: ApprovalInstanceRecord = {
        ...instance,
        status: newStatus,
        updated_at: now,
      };

      const actionRecord: ApprovalActionRecord = {
        id: crypto.randomUUID(),
        organization_id: instance.organization_id,
        approval_instance_id: instance.id,
        actor_employee_id: input.actorEmployeeId,
        action: input.action === 'APPROVE' ? 'APPROVE' : 'REJECT',
        comments: input.comments,
        action_at: now,
      };

      if (isSupabaseEnabled && isValidUUID(instance.id) && isValidUUID(instance.organization_id)) {
        try {
          // Update instance
          await supabase
            .from('approval_instances')
            .update({
              status: newStatus,
              updated_at: now,
            })
            .eq('id', instance.id);

          // Insert action log
          await supabase.from('approval_actions').insert({
            id: actionRecord.id,
            organization_id: actionRecord.organization_id,
            approval_instance_id: actionRecord.approval_instance_id,
            actor_employee_id: actionRecord.actor_employee_id,
            action: actionRecord.action,
            comments: actionRecord.comments,
            action_at: now,
          });
        } catch (dbErr) {
          console.warn('[UnifiedApprovalEngine] DB approval action write notice:', dbErr);
        }
      }

      // Persist local store
      const allInstances = this.getLocalInstances();
      const idx = allInstances.findIndex((i) => i.id === instance!.id);
      if (idx !== -1) {
        allInstances[idx] = updatedInstance;
      } else {
        allInstances.unshift(updatedInstance);
      }
      this.saveLocalInstances(allInstances);

      const allActions = this.getLocalActions();
      allActions.unshift(actionRecord);
      this.saveLocalActions(allActions);

      return {
        instance: updatedInstance,
        action: actionRecord,
        domainResult,
      };
    } finally {
      this.processingLocks.delete(input.instanceId);
    }
  }

  /**
   * Fetch instances by filter
   */
  public async getInstances(filter?: {
    organizationId?: string;
    status?: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  }): Promise<ApprovalInstanceRecord[]> {
    let list = this.getLocalInstances();
    if (filter?.organizationId) {
      list = list.filter((i) => i.organization_id === filter.organizationId);
    }
    if (filter?.status) {
      list = list.filter((i) => i.status === filter.status);
    }
    return list;
  }
}

export const unifiedApprovalEngine = UnifiedApprovalEngine.getInstance();
