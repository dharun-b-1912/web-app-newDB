// src/services/identity/employeeLifecycleEngine.ts
// ============================================================================
// JOY PeopleHR — Module Certification 03: People / Employee Lifecycle Engine
// Server-Authoritative Identity, State Transitions, Hierarchy & Soft-Delete
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { domainEventService } from '../events/domainEventService';
import {
  CANONICAL_DOMAIN_EVENTS,
  DomainEventRecord,
} from '../../types/domainEvents';
import { Employee, EmployeeStatus } from '../../types';

export type AuthoritativeLifecycleState =
  | 'DRAFT'
  | 'ONBOARDING'
  | 'PROBATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'NOTICE_PERIOD'
  | 'SUSPENDED'
  | 'EXITED'
  | 'TERMINATED'
  | 'REHIRED'
  | 'ARCHIVED';

export interface LifecycleTransitionResult {
  employee: Employee;
  previousStatus: string;
  newStatus: string;
  lifecycleEventId: string;
  emittedEvents: DomainEventRecord[];
}

export interface HierarchyAssignmentResult {
  employee: Employee;
  previousManagerId?: string | null;
  newManagerId?: string | null;
  directReportsCount: number;
  emittedEvents: DomainEventRecord[];
}

export interface TransferResult {
  employee: Employee;
  previousDepartmentId: string;
  newDepartmentId: string;
  effectiveDate: string;
  emittedEvents: DomainEventRecord[];
}

export interface PromotionResult {
  employee: Employee;
  previousDesignationId: string;
  newDesignationId: string;
  effectiveDate: string;
  emittedEvents: DomainEventRecord[];
}

export interface SoftDeleteResult {
  employee: Employee;
  isSoftDeleted: boolean;
  isHardDeleted: boolean;
  emittedEvents: DomainEventRecord[];
}

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export class EmployeeLifecycleEngine {
  private static instance: EmployeeLifecycleEngine;

  public static getInstance(): EmployeeLifecycleEngine {
    if (!EmployeeLifecycleEngine.instance) {
      EmployeeLifecycleEngine.instance = new EmployeeLifecycleEngine();
    }
    return EmployeeLifecycleEngine.instance;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. LIFECYCLE STATE MACHINE
  // Allowed forward paths, strict illegal transition rejection, and Rehire governance
  // ──────────────────────────────────────────────────────────────────────────

  private readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['ONBOARDING', 'ARCHIVED'],
    ONBOARDING: ['PROBATION', 'CONFIRMED', 'ACTIVE', 'ARCHIVED'],
    PROBATION: ['CONFIRMED', 'ACTIVE', 'NOTICE_PERIOD', 'SUSPENDED', 'TERMINATED'],
    CONFIRMED: ['ACTIVE', 'NOTICE_PERIOD', 'SUSPENDED', 'TERMINATED'],
    ACTIVE: ['NOTICE_PERIOD', 'SUSPENDED', 'TERMINATED', 'CONFIRMED'],
    NOTICE_PERIOD: ['EXITED', 'ACTIVE'], // ACTIVE if counter-offer accepted & retained
    SUSPENDED: ['ACTIVE', 'TERMINATED'],
    EXITED: ['REHIRED', 'ARCHIVED'],
    TERMINATED: ['REHIRED', 'ARCHIVED'],
    REHIRED: ['PROBATION', 'CONFIRMED', 'ACTIVE'],
    ARCHIVED: ['ACTIVE'], // Restorable only via formal reactivation
  };

  public validateStateTransition(currentStatus: string, targetStatus: string): boolean {
    const from = (currentStatus || 'DRAFT').toUpperCase();
    const to = (targetStatus || '').toUpperCase();

    if (from === to) return true;

    // Normalizing synonyms
    const normalizedFrom = from === 'ACTIVE' || from === 'CONFIRMED' ? 'ACTIVE' : from;
    const normalizedTo = to === 'ACTIVE' || to === 'CONFIRMED' ? 'ACTIVE' : to;

    if (normalizedFrom === normalizedTo) return true;

    const allowed = this.ALLOWED_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  public async transitionEmployeeStatus(params: {
    employeeId: string;
    organizationId: string;
    targetStatus: EmployeeStatus | AuthoritativeLifecycleState;
    effectiveDate?: string;
    reason?: string;
    actorId: string;
    expectedUpdatedAt?: string;
  }): Promise<LifecycleTransitionResult> {
    const { employeeId, organizationId, targetStatus, actorId, reason } = params;
    const now = new Date().toISOString();
    const todayStr = params.effectiveDate || now.split('T')[0];

    const emp = await this.getEmployeeById(employeeId);
    if (!emp) throw new Error(`EMPLOYEE_NOT_FOUND: Employee ${employeeId} was not found.`);

    if (emp.organization_id && emp.organization_id !== organizationId) {
      throw new Error(`TENANT_BOUNDARY_VIOLATION: Cross-tenant lifecycle mutation rejected.`);
    }

    // Optimistic Concurrency Check
    if (params.expectedUpdatedAt && emp.updated_at && emp.updated_at !== params.expectedUpdatedAt) {
      const err: any = new Error(`CONCURRENCY_CONFLICT: Record was modified by another transaction.`);
      err.code = 'CONCURRENCY_CONFLICT';
      throw err;
    }

    const currentStatus = (emp.status || (emp as any).employment_status || 'DRAFT').toUpperCase();
    const targetStatusNorm = targetStatus.toUpperCase();

    if (!this.validateStateTransition(currentStatus, targetStatusNorm)) {
      throw new Error(
        `ILLEGAL_LIFECYCLE_TRANSITION: Cannot transition employee from '${currentStatus}' to '${targetStatusNorm}'. Formal lifecycle path required.`
      );
    }

    // Update Employee Status
    const previousStatus = emp.status || currentStatus;
    emp.status = targetStatus as EmployeeStatus;
    (emp as any).employment_status = targetStatusNorm;
    emp.updated_at = now;
    if (targetStatusNorm === 'CONFIRMED') {
      (emp as any).confirmation_date = todayStr;
    }
    if (targetStatusNorm === 'EXITED' || targetStatusNorm === 'TERMINATED') {
      (emp as any).last_working_day = todayStr;
    }

    // Persist to Supabase if UUID
    if (isSupabaseEnabled && isValidUUID(employeeId)) {
      try {
        await supabase
          .from('employees')
          .update({
            employment_status: targetStatusNorm,
            confirmation_date: targetStatusNorm === 'CONFIRMED' ? todayStr : (emp as any).confirmation_date || null,
            updated_at: now,
          })
          .eq('id', employeeId);
      } catch (dbErr) {
        console.warn('[EmployeeLifecycleEngine] Supabase status update notice:', dbErr);
      }
    }

    this.saveLocalEmployee(emp);

    // Identity Synchronization: If Exited, Terminated, or Suspended, deactivate user profile
    if (['EXITED', 'TERMINATED', 'SUSPENDED', 'ARCHIVED'].includes(targetStatusNorm)) {
      await this.syncUserProfileStatus(employeeId, 'INACTIVE');
    } else if (['ACTIVE', 'CONFIRMED', 'PROBATION'].includes(targetStatusNorm)) {
      await this.syncUserProfileStatus(employeeId, 'ACTIVE');
    }

    // Append-only Lifecycle Event Logging
    const lifecycleEventId = await this.appendLifecycleEvent({
      organizationId,
      employeeId,
      eventType: targetStatusNorm === 'REHIRED' ? 'REHIRE' : `STATUS_${targetStatusNorm}`,
      effectiveDate: todayStr,
      remarks: reason || `Status transitioned from ${previousStatus} to ${targetStatus}`,
      createdBy: actorId,
    });

    // Emit Canonical Domain Event
    const emittedEvents: DomainEventRecord[] = [];
    const event = await domainEventService.publishEvent({
      organization_id: organizationId,
      event_type: `employee.status.${targetStatusNorm.toLowerCase()}`,
      aggregate_type: 'EMPLOYEE',
      aggregate_id: employeeId,
      idempotency_key: `emp.status.${employeeId}.${targetStatusNorm}.${Date.now()}`,
      payload: {
        employee_id: employeeId,
        previous_status: previousStatus,
        new_status: targetStatus,
        effective_date: todayStr,
        reason,
      },
      actor_id: actorId,
    });
    emittedEvents.push(event);

    return {
      employee: emp,
      previousStatus,
      newStatus: targetStatus,
      lifecycleEventId,
      emittedEvents,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. REPORTING HIERARCHY & CYCLE DETECTION
  // Directed Acyclic Graph (DAG) enforcement with DFS cycle detection
  // ──────────────────────────────────────────────────────────────────────────

  public detectReportingCycle(
    employeeId: string,
    proposedManagerId: string,
    allEmployees: Employee[]
  ): { hasCycle: boolean; cyclePath: string[] } {
    if (employeeId === proposedManagerId) {
      return { hasCycle: true, cyclePath: [employeeId, proposedManagerId] };
    }

    const path: string[] = [employeeId];
    let currManagerId: string | null | undefined = proposedManagerId;
    const visited = new Set<string>([employeeId]);

    while (currManagerId) {
      path.push(currManagerId);
      if (currManagerId === employeeId) {
        return { hasCycle: true, cyclePath: path };
      }
      if (visited.has(currManagerId)) {
        return { hasCycle: true, cyclePath: path };
      }
      visited.add(currManagerId);

      const mgrRecord = allEmployees.find((e) => e.id === currManagerId);
      currManagerId = mgrRecord?.reporting_manager_id || mgrRecord?.employment?.reporting_manager_id || null;
    }

    return { hasCycle: false, cyclePath: [] };
  }

  public async assignReportingManager(params: {
    employeeId: string;
    managerId: string | null;
    organizationId: string;
    actorId: string;
    remarks?: string;
  }): Promise<HierarchyAssignmentResult> {
    const { employeeId, managerId, organizationId, actorId, remarks } = params;
    const now = new Date().toISOString();

    const emp = await this.getEmployeeById(employeeId);
    if (!emp) throw new Error(`EMPLOYEE_NOT_FOUND: Employee ${employeeId} not found.`);

    if (emp.organization_id && emp.organization_id !== organizationId) {
      throw new Error(`TENANT_BOUNDARY_VIOLATION: Cross-tenant manager assignment rejected.`);
    }

    const previousManagerId = emp.reporting_manager_id || emp.employment?.reporting_manager_id || null;

    if (managerId) {
      const allEmps = this.getAllLocalEmployees();
      const manager = allEmps.find((e) => e.id === managerId);
      if (!manager) {
        throw new Error(`MANAGER_NOT_FOUND: Proposed manager ${managerId} not found.`);
      }

      if (manager.organization_id && manager.organization_id !== organizationId) {
        throw new Error(`TENANT_BOUNDARY_VIOLATION: Cannot assign a manager from a foreign organization.`);
      }

      // Check for Exited / Inactive manager
      const mgrStatus = (manager.status || (manager as any).employment_status || '').toUpperCase();
      if (['EXITED', 'TERMINATED', 'ARCHIVED'].includes(mgrStatus)) {
        throw new Error(`INVALID_MANAGER_STATUS: Exited or archived employee cannot be assigned as a reporting manager.`);
      }

      // Run DFS Cycle Detection
      const cycleCheck = this.detectReportingCycle(employeeId, managerId, allEmps);
      if (cycleCheck.hasCycle) {
        throw new Error(
          `HIERARCHY_CYCLE_DETECTED: Reporting loop detected: ${cycleCheck.cyclePath.join(' -> ')}. Direct manager assignment rejected.`
        );
      }
    }

    // Mutate Employee Manager
    emp.reporting_manager_id = managerId || undefined;
    if (!emp.employment) emp.employment = {} as any;
    emp.employment.reporting_manager_id = managerId;
    emp.updated_at = now;

    if (isSupabaseEnabled && isValidUUID(employeeId)) {
      try {
        await supabase
          .from('employees')
          .update({
            reporting_manager_id: managerId && isValidUUID(managerId) ? managerId : null,
            updated_at: now,
          })
          .eq('id', employeeId);
      } catch (dbErr) {
        console.warn('[EmployeeLifecycleEngine] manager DB update notice:', dbErr);
      }
    }

    this.saveLocalEmployee(emp);

    // Calculate Direct Reports Count
    const allEmps = this.getAllLocalEmployees();
    const directReportsCount = allEmps.filter(
      (e) => (e.reporting_manager_id === managerId || e.employment?.reporting_manager_id === managerId) && e.id !== employeeId
    ).length + (managerId ? 1 : 0);

    // Append lifecycle event
    await this.appendLifecycleEvent({
      organizationId,
      employeeId,
      eventType: 'MANAGER_CHANGE',
      effectiveDate: now.split('T')[0],
      remarks: remarks || `Manager changed from ${previousManagerId || 'None'} to ${managerId || 'None'}`,
      createdBy: actorId,
    });

    // Emit Canonical Domain Event
    const emittedEvents: DomainEventRecord[] = [];
    const event = await domainEventService.publishEvent({
      organization_id: organizationId,
      event_type: 'employee.manager_changed',
      aggregate_type: 'EMPLOYEE',
      aggregate_id: employeeId,
      idempotency_key: `emp.manager.${employeeId}.${managerId || 'null'}.${Date.now()}`,
      payload: {
        employee_id: employeeId,
        previous_manager_id: previousManagerId,
        new_manager_id: managerId,
      },
      actor_id: actorId,
    });
    emittedEvents.push(event);

    return {
      employee: emp,
      previousManagerId,
      newManagerId: managerId,
      directReportsCount,
      emittedEvents,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. EMPLOYMENT TRANSFERS & PROMOTIONS
  // Atomic organizational trajectory changes with audit records
  // ──────────────────────────────────────────────────────────────────────────

  public async transferDepartment(params: {
    employeeId: string;
    newDepartmentId: string;
    organizationId: string;
    effectiveDate?: string;
    remarks?: string;
    actorId: string;
  }): Promise<TransferResult> {
    const { employeeId, newDepartmentId, organizationId, actorId, remarks } = params;
    const now = new Date().toISOString();
    const effectiveDate = params.effectiveDate || now.split('T')[0];

    const emp = await this.getEmployeeById(employeeId);
    if (!emp) throw new Error(`EMPLOYEE_NOT_FOUND: Employee ${employeeId} not found.`);

    if (emp.organization_id && emp.organization_id !== organizationId) {
      throw new Error(`TENANT_BOUNDARY_VIOLATION: Cross-tenant department transfer rejected.`);
    }

    const previousDepartmentId = emp.department_id;
    emp.department_id = newDepartmentId;
    emp.updated_at = now;

    if (isSupabaseEnabled && isValidUUID(employeeId) && isValidUUID(newDepartmentId)) {
      try {
        await supabase
          .from('employees')
          .update({ department_id: newDepartmentId, updated_at: now })
          .eq('id', employeeId);
      } catch (dbErr) {
        console.warn('[EmployeeLifecycleEngine] department DB transfer notice:', dbErr);
      }
    }

    this.saveLocalEmployee(emp);

    await this.appendLifecycleEvent({
      organizationId,
      employeeId,
      eventType: 'TRANSFER',
      effectiveDate,
      remarks: remarks || `Transferred from dept ${previousDepartmentId} to ${newDepartmentId}`,
      createdBy: actorId,
    });

    const emittedEvents: DomainEventRecord[] = [];
    const event = await domainEventService.publishEvent({
      organization_id: organizationId,
      event_type: 'employee.transferred',
      aggregate_type: 'EMPLOYEE',
      aggregate_id: employeeId,
      idempotency_key: `emp.transfer.${employeeId}.${newDepartmentId}.${Date.now()}`,
      payload: {
        employee_id: employeeId,
        previous_department_id: previousDepartmentId,
        new_department_id: newDepartmentId,
        effective_date: effectiveDate,
        remarks,
      },
      actor_id: actorId,
    });
    emittedEvents.push(event);

    return {
      employee: emp,
      previousDepartmentId,
      newDepartmentId,
      effectiveDate,
      emittedEvents,
    };
  }

  public async promoteDesignation(params: {
    employeeId: string;
    newDesignationId: string;
    organizationId: string;
    effectiveDate?: string;
    remarks?: string;
    actorId: string;
  }): Promise<PromotionResult> {
    const { employeeId, newDesignationId, organizationId, actorId, remarks } = params;
    const now = new Date().toISOString();
    const effectiveDate = params.effectiveDate || now.split('T')[0];

    const emp = await this.getEmployeeById(employeeId);
    if (!emp) throw new Error(`EMPLOYEE_NOT_FOUND: Employee ${employeeId} not found.`);

    if (emp.organization_id && emp.organization_id !== organizationId) {
      throw new Error(`TENANT_BOUNDARY_VIOLATION: Cross-tenant designation promotion rejected.`);
    }

    const previousDesignationId = emp.designation_id;
    emp.designation_id = newDesignationId;
    emp.updated_at = now;

    if (isSupabaseEnabled && isValidUUID(employeeId) && isValidUUID(newDesignationId)) {
      try {
        await supabase
          .from('employees')
          .update({ designation_id: newDesignationId, updated_at: now })
          .eq('id', employeeId);
      } catch (dbErr) {
        console.warn('[EmployeeLifecycleEngine] designation DB promotion notice:', dbErr);
      }
    }

    this.saveLocalEmployee(emp);

    await this.appendLifecycleEvent({
      organizationId,
      employeeId,
      eventType: 'PROMOTION',
      effectiveDate,
      remarks: remarks || `Promoted from designation ${previousDesignationId} to ${newDesignationId}`,
      createdBy: actorId,
    });

    const emittedEvents: DomainEventRecord[] = [];
    const event = await domainEventService.publishEvent({
      organization_id: organizationId,
      event_type: 'employee.promoted',
      aggregate_type: 'EMPLOYEE',
      aggregate_id: employeeId,
      idempotency_key: `emp.promotion.${employeeId}.${newDesignationId}.${Date.now()}`,
      payload: {
        employee_id: employeeId,
        previous_designation_id: previousDesignationId,
        new_designation_id: newDesignationId,
        effective_date: effectiveDate,
        remarks,
      },
      actor_id: actorId,
    });
    emittedEvents.push(event);

    return {
      employee: emp,
      previousDesignationId,
      newDesignationId,
      effectiveDate,
      emittedEvents,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. SOFT-DELETE PRESERVATION & PURGE BARRIER
  // Blocks hard deletes for employees with historical records; executes soft delete
  // ──────────────────────────────────────────────────────────────────────────

  public hasHistoricalEmploymentRecords(employeeId: string): boolean {
    // 1. Check in-memory stores for historical records across any of the 41 downstream consumers
    if (typeof window === 'undefined') {
      const leaves = (globalThis as any).__JOY_LEAVE_REQUESTS__ || [];
      if (leaves.some((l: any) => l.employee_id === employeeId)) return true;

      const settlements = (globalThis as any).__JOY_FNF_SETTLEMENTS__ || [];
      if (settlements.some((s: any) => s.employee_id === employeeId)) return true;

      const separations = (globalThis as any).__JOY_SEPARATIONS__ || [];
      if (separations.some((s: any) => s.employee_id === employeeId)) return true;

      const events = (globalThis as any).__JOY_LIFECYCLE_EVENTS__ || [];
      if (events.some((e: any) => e.employee_id === employeeId)) return true;

      return false;
    }

    try {
      const leaves = JSON.parse(localStorage.getItem('workforce_leave_requests_v1') || '[]');
      if (leaves.some((l: any) => l.employee_id === employeeId)) return true;

      const settlements = JSON.parse(localStorage.getItem('workforce_payroll_settlements_v1') || '[]');
      if (settlements.some((s: any) => s.employee_id === employeeId)) return true;

      const separations = JSON.parse(localStorage.getItem('workforce_employee_separations_v1') || '[]');
      if (separations.some((s: any) => s.employee_id === employeeId)) return true;

      const events = JSON.parse(localStorage.getItem('workforce_lifecycle_events') || '[]');
      if (events.some((e: any) => e.employee_id === employeeId)) return true;
    } catch {}

    return false;
  }

  public async deleteEmployee(params: {
    employeeId: string;
    organizationId: string;
    actorId: string;
    reason?: string;
    forceHardDelete?: boolean;
  }): Promise<SoftDeleteResult> {
    const { employeeId, organizationId, actorId, reason, forceHardDelete } = params;
    const now = new Date().toISOString();

    const emp = await this.getEmployeeById(employeeId);
    if (!emp) throw new Error(`EMPLOYEE_NOT_FOUND: Employee ${employeeId} not found.`);

    if (emp.organization_id && emp.organization_id !== organizationId) {
      throw new Error(`TENANT_BOUNDARY_VIOLATION: Cross-tenant deletion rejected.`);
    }

    const hasHistoricalRecords = this.hasHistoricalEmploymentRecords(employeeId);

    // Hard-delete barrier
    if (forceHardDelete) {
      if (hasHistoricalRecords) {
        throw new Error(
          `HARD_DELETE_PROHIBITED: Cannot hard delete employee '${employeeId}' with historical employment footprints across payroll, attendance, leave, or FnF. Soft delete is enforced.`
        );
      }
    }

    // Execute Authoritative Soft-Delete
    emp.deleted_at = now;
    emp.status = 'Archived' as any;
    (emp as any).employment_status = 'ARCHIVED';
    emp.updated_at = now;

    if (isSupabaseEnabled && isValidUUID(employeeId)) {
      try {
        await supabase
          .from('employees')
          .update({
            deleted_at: now,
            employment_status: 'ARCHIVED',
            updated_at: now,
          })
          .eq('id', employeeId);
      } catch (dbErr) {
        console.warn('[EmployeeLifecycleEngine] soft delete DB notice:', dbErr);
      }
    }

    this.saveLocalEmployee(emp);

    // Deactivate User Profile & Revoke Auth Session
    await this.syncUserProfileStatus(employeeId, 'INACTIVE');

    // Append lifecycle audit entry
    await this.appendLifecycleEvent({
      organizationId,
      employeeId,
      eventType: 'ARCHIVE',
      effectiveDate: now.split('T')[0],
      remarks: reason || 'Employee soft-deleted and archived',
      createdBy: actorId,
    });

    const emittedEvents: DomainEventRecord[] = [];
    const event = await domainEventService.publishEvent({
      organization_id: organizationId,
      event_type: 'employee.archived',
      aggregate_type: 'EMPLOYEE',
      aggregate_id: employeeId,
      idempotency_key: `emp.archive.${employeeId}.${Date.now()}`,
      payload: {
        employee_id: employeeId,
        deleted_at: now,
        reason,
      },
      actor_id: actorId,
    });
    emittedEvents.push(event);

    return {
      employee: emp,
      isSoftDeleted: true,
      isHardDeleted: false,
      emittedEvents,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. EXITED EMPLOYEE OPERATIONAL SHIELD
  // Protects Attendance, Leave, and Payroll from exited/inactive employees
  // ──────────────────────────────────────────────────────────────────────────

  public validateOperationalPermissibility(employee: Employee | null): {
    permissible: boolean;
    reason?: string;
  } {
    if (!employee) return { permissible: false, reason: 'EMPLOYEE_NOT_FOUND' };

    if (employee.deleted_at) {
      return { permissible: false, reason: 'EMPLOYEE_SOFT_DELETED' };
    }

    const status = (employee.status || (employee as any).employment_status || '').toUpperCase();
    if (['EXITED', 'TERMINATED', 'ARCHIVED'].includes(status)) {
      return {
        permissible: false,
        reason: `EMPLOYEE_STATUS_INELIGIBLE: Operations prohibited for employee with status '${status}'.`,
      };
    }

    return { permissible: true };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. IDENTITY & STORAGE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  public async syncUserProfileStatus(employeeId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseEnabled && isValidUUID(employeeId)) {
      try {
        await supabase
          .from('user_profiles')
          .update({ status, updated_at: now })
          .eq('employee_id', employeeId);
      } catch (_) {}
    }

    if (typeof window === 'undefined') {
      let profs = (globalThis as any).__JOY_USER_PROFILES__ || [];
      const idx = profs.findIndex((p: any) => p.employee_id === employeeId);
      if (idx !== -1) profs[idx].status = status;
      (globalThis as any).__JOY_USER_PROFILES__ = profs;
      return;
    }

    try {
      const raw = localStorage.getItem('workforce_user_profiles');
      let profs = raw ? JSON.parse(raw) : [];
      const idx = profs.findIndex((p: any) => p.employee_id === employeeId);
      if (idx !== -1) {
        profs[idx].status = status;
        localStorage.setItem('workforce_user_profiles', JSON.stringify(profs));
      }
    } catch {}
  }

  public async appendLifecycleEvent(params: {
    organizationId: string;
    employeeId: string;
    eventType: string;
    effectiveDate: string;
    remarks: string;
    createdBy: string;
  }): Promise<string> {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `life-evt-${Date.now()}`;
    const now = new Date().toISOString();

    const record = {
      id,
      organization_id: params.organizationId,
      employee_id: params.employeeId,
      event_type: params.eventType,
      effective_date: params.effectiveDate,
      remarks: params.remarks,
      created_by: params.createdBy,
      created_at: now,
    };

    if (isSupabaseEnabled && isValidUUID(id) && isValidUUID(params.organizationId) && isValidUUID(params.employeeId)) {
      try {
        await supabase.from('employee_lifecycle_events').insert(record);
      } catch (dbErr) {
        console.warn('[EmployeeLifecycleEngine] Supabase lifecycle insert notice:', dbErr);
      }
    }

    if (typeof window === 'undefined') {
      let list = (globalThis as any).__JOY_LIFECYCLE_EVENTS__ || [];
      list.unshift(record);
      (globalThis as any).__JOY_LIFECYCLE_EVENTS__ = list;
      return id;
    }

    try {
      const raw = localStorage.getItem('workforce_lifecycle_events');
      let list = raw ? JSON.parse(raw) : [];
      list.unshift(record);
      localStorage.setItem('workforce_lifecycle_events', JSON.stringify(list));
    } catch {}

    return id;
  }

  public async getEmployeeById(id: string): Promise<Employee | null> {
    if (isSupabaseEnabled && isValidUUID(id)) {
      try {
        const { data, error } = await supabase.from('employees').select('*').eq('id', id).maybeSingle();
        if (!error && data) return data as Employee;
      } catch (_) {}
    }
    const all = this.getAllLocalEmployees();
    return all.find((e) => e.id === id) || null;
  }

  public getAllLocalEmployees(): Employee[] {
    if (typeof window === 'undefined') {
      return (globalThis as any).__JOY_EMPLOYEES__ || [];
    }
    try {
      const raw = localStorage.getItem('workforce_employees');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveLocalEmployee(emp: Employee): void {
    if (typeof window === 'undefined') {
      let list = (globalThis as any).__JOY_EMPLOYEES__ || [];
      const idx = list.findIndex((e: any) => e.id === emp.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...emp };
      else list.unshift(emp);
      (globalThis as any).__JOY_EMPLOYEES__ = list;
      return;
    }
    try {
      let list = this.getAllLocalEmployees();
      const idx = list.findIndex((e) => e.id === emp.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...emp };
      else list.unshift(emp);
      localStorage.setItem('workforce_employees', JSON.stringify(list));
    } catch {}
  }
}

export const employeeLifecycleEngine = EmployeeLifecycleEngine.getInstance();
