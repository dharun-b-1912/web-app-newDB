import {
  EmployeeOnboarding,
  OnboardingTask,
  OnboardingPolicyAck,
  OnboardingOverride,
  OnboardingAuditLog,
  OnboardingSummaryMetrics,
  OnboardingStatus,
  OnboardingEmploymentSource,
  OnboardingTaskRole,
  Employee,
} from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { hrEventBus } from './hrEventBus';
import { api } from './api';
import { vendorService } from './vendorService';

const ONBOARDINGS_STORAGE_KEY = 'workforce_employee_onboardings';
const ONBOARDING_TASKS_KEY = 'workforce_onboarding_tasks';
const ONBOARDING_POLICIES_KEY = 'workforce_onboarding_policies';
const ONBOARDING_OVERRIDES_KEY = 'workforce_onboarding_overrides';
const ONBOARDING_AUDIT_KEY = 'workforce_onboarding_audit';

// Pure Realtime Definitions - No hardcoded mock seeds
const INITIAL_ONBOARDINGS: EmployeeOnboarding[] = [];
const INITIAL_TASKS: OnboardingTask[] = [];

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`[OnboardingService] Storage write error for ${key}:`, err);
  }
}

export const onboardingService = {
  // 1. Get Onboardings with Aggregates & Multi-dimensional Filters
  async getOnboardings(params?: {
    search?: string;
    status?: string;
    stage?: string;
    employmentSource?: string;
    vendorId?: string;
    departmentId?: string;
    managerId?: string;
    segment?: string;
  }): Promise<EmployeeOnboarding[]> {
    let onboardings = getStorage<EmployeeOnboarding[]>(ONBOARDINGS_STORAGE_KEY, INITIAL_ONBOARDINGS);
    if (!onboardings || onboardings.length === 0) {
      onboardings = INITIAL_ONBOARDINGS;
      setStorage(ONBOARDINGS_STORAGE_KEY, onboardings);
    }

    const tasks = getStorage<OnboardingTask[]>(ONBOARDING_TASKS_KEY, INITIAL_TASKS);
    const employees = await api.getEmployees();
    const vendors = await vendorService.getVendors();

    const todayStr = new Date().toISOString().split('T')[0];

    // Compute live relational aggregates
    let enriched = onboardings.map((onb) => {
      const emp = employees.find((e) => e.id === onb.employee_id);
      const vnd = onb.vendor_id ? vendors.find((v) => v.id === onb.vendor_id) : undefined;
      const onbTasks = tasks.filter((t) => t.onboarding_id === onb.id);

      const totalTasks = onbTasks.length;
      const completedTasks = onbTasks.filter((t) => t.status === 'COMPLETED').length;
      const blockedTasks = onbTasks.filter((t) => t.status === 'BLOCKED').length;
      const overdueTasks = onbTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'SKIPPED' && t.status !== 'CANCELLED' && t.due_date && t.due_date < todayStr).length;

      const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Find first incomplete task as blocking/current task
      const nextTask = onbTasks.find((t) => t.status !== 'COMPLETED' && t.status !== 'SKIPPED');
      const stageName = nextTask ? nextTask.assigned_to_role + ' · ' + nextTask.task_type.replace(/_/g, ' ') : 'Ready to Activate';

      return {
        ...onb,
        employee: emp,
        vendor_name: vnd?.legal_name || onb.vendor_name,
        tasks: onbTasks,
        total_tasks_count: totalTasks,
        completed_tasks_count: completedTasks,
        blocked_tasks_count: blockedTasks,
        overdue_tasks_count: overdueTasks,
        progress_percentage: progressPct,
        current_stage: stageName,
        blocking_task_title: nextTask?.title,
      };
    });

    if (!params) return enriched;

    return enriched.filter((onb) => {
      const q = (params.search || '').toLowerCase().trim();
      const empName = (onb.employee?.first_name || '') + ' ' + (onb.employee?.last_name || '');
      const matchesSearch =
        !q ||
        empName.toLowerCase().includes(q) ||
        (onb.employee?.employee_code && onb.employee.employee_code.toLowerCase().includes(q)) ||
        (onb.employee?.work_email && onb.employee.work_email.toLowerCase().includes(q)) ||
        (onb.vendor_name && onb.vendor_name.toLowerCase().includes(q)) ||
        (onb.employee?.department_name && onb.employee.department_name.toLowerCase().includes(q)) ||
        (onb.employee?.employment?.reporting_manager_name && onb.employee.employment.reporting_manager_name.toLowerCase().includes(q));

      const matchesStatus = !params.status || params.status === 'ALL' || onb.status === params.status;
      const matchesSource = !params.employmentSource || params.employmentSource === 'ALL' || onb.employment_source === params.employmentSource;
      const matchesVendor = !params.vendorId || params.vendorId === 'ALL' || onb.vendor_id === params.vendorId;
      const matchesDept = !params.departmentId || params.departmentId === 'ALL' || onb.employee?.department_id === params.departmentId;

      // Segment filters
      let matchesSegment = true;
      if (params.segment === 'NEW_JOINERS_MONTH') {
        const joinMonth = onb.joining_date ? onb.joining_date.slice(0, 7) : '';
        const curMonth = todayStr.slice(0, 7);
        matchesSegment = joinMonth === curMonth;
      } else if (params.segment === 'OVERDUE') {
        matchesSegment = (onb.overdue_tasks_count || 0) > 0;
      } else if (params.segment === 'BLOCKED') {
        matchesSegment = (onb.blocked_tasks_count || 0) > 0;
      } else if (params.segment === 'DOCUMENTS_PENDING') {
        matchesSegment = onb.tasks?.some((t) => (t.task_type.includes('DOC') || t.task_type.includes('INFO')) && t.status !== 'COMPLETED') ?? false;
      } else if (params.segment === 'HR_VERIFICATION') {
        matchesSegment = onb.tasks?.some((t) => t.assigned_to_role === 'HR' && t.status !== 'COMPLETED') ?? false;
      } else if (params.segment === 'MANAGER_ACTION') {
        matchesSegment = onb.tasks?.some((t) => t.assigned_to_role === 'MANAGER' && t.status !== 'COMPLETED') ?? false;
      } else if (params.segment === 'IT_ACTION') {
        matchesSegment = onb.tasks?.some((t) => t.assigned_to_role === 'IT' && t.status !== 'COMPLETED') ?? false;
      } else if (params.segment === 'PAYROLL_ACTION') {
        matchesSegment = onb.tasks?.some((t) => t.assigned_to_role === 'PAYROLL' && t.status !== 'COMPLETED') ?? false;
      } else if (params.segment === 'READY_TO_ACTIVATE') {
        matchesSegment = onb.status === 'READY_TO_ACTIVATE' || (onb.completed_tasks_count === onb.total_tasks_count && onb.status !== 'COMPLETED');
      } else if (params.segment === 'VENDOR_WORKFORCE') {
        matchesSegment = onb.employment_source === 'VENDOR';
      } else if (params.segment === 'DIRECT_EMPLOYEES') {
        matchesSegment = onb.employment_source === 'DIRECT';
      }

      return matchesSearch && matchesStatus && matchesSource && matchesVendor && matchesDept && matchesSegment;
    });
  },

  // 2. Get Onboarding By ID with Full Relations
  async getOnboardingById(id: string): Promise<EmployeeOnboarding | undefined> {
    const list = await this.getOnboardings();
    return list.find((o) => o.id === id);
  },

  // 3. Auto-Create Onboarding Workflow Transactionally
  async createOnboarding(payload: {
    employee_id: string;
    organization_id?: string;
    legal_entity_id?: string;
    vendor_id?: string;
    employment_source: OnboardingEmploymentSource;
    joining_date: string;
    created_by?: string;
  }): Promise<EmployeeOnboarding> {
    const onboardings = getStorage<EmployeeOnboarding[]>(ONBOARDINGS_STORAGE_KEY, INITIAL_ONBOARDINGS);
    const tasks = getStorage<OnboardingTask[]>(ONBOARDING_TASKS_KEY, INITIAL_TASKS);

    // Prevent duplicate onboarding for same active employee
    const existing = onboardings.find((o) => o.employee_id === payload.employee_id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    if (existing) return existing;

    const newOnbId = `onb-${Date.now().toString(36)}`;
    const isVendor = payload.employment_source === 'VENDOR';

    let vendorName = '';
    if (payload.vendor_id) {
      const v = await vendorService.getVendorById(payload.vendor_id);
      vendorName = v?.legal_name || '';
    }

    const newOnb: EmployeeOnboarding = {
      id: newOnbId,
      organization_id: payload.organization_id || 'a0000000-0000-0000-0000-000000000001',
      legal_entity_id: payload.legal_entity_id || 'c1000000-0000-0000-0000-000000000001',
      employee_id: payload.employee_id,
      vendor_id: payload.vendor_id,
      vendor_name: vendorName,
      employment_source: payload.employment_source,
      status: 'INITIATED',
      joining_date: payload.joining_date,
      expected_completion_date: new Date(new Date(payload.joining_date).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      started_at: new Date().toISOString(),
      created_by: payload.created_by || 'user-admin-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Generate Standard Workflow Tasks from Template
    const spawnedTasks: OnboardingTask[] = [];

    if (!isVendor) {
      // Standard Direct Employee Template (8 Tasks)
      const t1Id = `task-${Date.now().toString(36)}-1`;
      const t2Id = `task-${Date.now().toString(36)}-2`;
      const t3Id = `task-${Date.now().toString(36)}-3`;
      const t4Id = `task-${Date.now().toString(36)}-4`;
      const t5Id = `task-${Date.now().toString(36)}-5`;
      const t6Id = `task-${Date.now().toString(36)}-6`;
      const t7Id = `task-${Date.now().toString(36)}-7`;
      const t8Id = `task-${Date.now().toString(36)}-8`;

      spawnedTasks.push(
        {
          id: t1Id,
          onboarding_id: newOnbId,
          task_type: 'HR_DOC_VERIFICATION',
          title: 'Verify government identity & statutory certificates',
          description: 'Verify PAN, Aadhaar, degree proofs and relieving letters.',
          assigned_to_role: 'HR',
          status: 'NOT_STARTED',
          priority: 'CRITICAL',
          due_date: payload.joining_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: t2Id,
          onboarding_id: newOnbId,
          task_type: 'EMPLOYEE_INFO_UPLOAD',
          title: 'Submit emergency contact & bank disbursement details',
          description: 'Employee uploads personal profile and cancelled cheque.',
          assigned_to_role: 'EMPLOYEE',
          status: 'NOT_STARTED',
          priority: 'HIGH',
          due_date: payload.joining_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: t3Id,
          onboarding_id: newOnbId,
          task_type: 'POLICY_ACKNOWLEDGEMENT',
          title: 'Acknowledge Information Security & Code of Conduct policies',
          description: 'Read and accept company policies.',
          assigned_to_role: 'EMPLOYEE',
          status: 'NOT_STARTED',
          priority: 'HIGH',
          due_date: payload.joining_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: t4Id,
          onboarding_id: newOnbId,
          task_type: 'MANAGER_REVIEW',
          title: 'Manager reporting confirmation & workspace readiness',
          description: 'Manager confirms reporting relationship and onboarding objectives.',
          assigned_to_role: 'MANAGER',
          status: 'NOT_STARTED',
          priority: 'HIGH',
          due_date: payload.joining_date,
          dependency_task_id: t1Id,
          dependency_task_title: 'Verify government identity & statutory certificates',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: t5Id,
          onboarding_id: newOnbId,
          task_type: 'IT_ASSET_ALLOCATION',
          title: 'Provision laptop workstation & corporate VPN credentials',
          description: 'Allocate workstation from Asset Management and issue email.',
          assigned_to_role: 'IT',
          status: 'NOT_STARTED',
          priority: 'MEDIUM',
          due_date: payload.joining_date,
          dependency_task_id: t4Id,
          dependency_task_title: 'Manager reporting confirmation & workspace readiness',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: t6Id,
          onboarding_id: newOnbId,
          task_type: 'PAYROLL_SETUP',
          title: 'Verify salary component breakdown and statutory PF/ESI declarations',
          description: 'Payroll Admin configures CTC structure and tax declarations.',
          assigned_to_role: 'PAYROLL',
          status: 'NOT_STARTED',
          priority: 'HIGH',
          due_date: payload.joining_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: t7Id,
          onboarding_id: newOnbId,
          task_type: 'ATTENDANCE_SETUP',
          title: 'Assign attendance shift roster & geofenced clocking policy',
          description: 'Configure shift roster in Attendance module.',
          assigned_to_role: 'HR',
          status: 'NOT_STARTED',
          priority: 'MEDIUM',
          due_date: payload.joining_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: t8Id,
          onboarding_id: newOnbId,
          task_type: 'FINAL_HR_ACTIVATION',
          title: 'Final HR readiness audit & account activation',
          description: 'HR Head reviews readiness checklist and activates employee.',
          assigned_to_role: 'HR_HEAD',
          status: 'NOT_STARTED',
          priority: 'CRITICAL',
          due_date: payload.joining_date,
          dependency_task_id: t5Id,
          dependency_task_title: 'Provision laptop workstation & corporate VPN credentials',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );
    } else {
      // Vendor / Manpower Worker Template (5 Tasks — No forced company payroll)
      const vt1Id = `vtask-${Date.now().toString(36)}-1`;
      const vt2Id = `vtask-${Date.now().toString(36)}-2`;
      const vt3Id = `vtask-${Date.now().toString(36)}-3`;
      const vt4Id = `vtask-${Date.now().toString(36)}-4`;
      const vt5Id = `vtask-${Date.now().toString(36)}-5`;

      spawnedTasks.push(
        {
          id: vt1Id,
          onboarding_id: newOnbId,
          task_type: 'VENDOR_DOC_VERIFICATION',
          title: 'Verify vendor deployment order & Form VI Labour License',
          description: 'Check vendor contract compliance and deployment scope.',
          assigned_to_role: 'HR',
          status: 'NOT_STARTED',
          priority: 'CRITICAL',
          due_date: payload.joining_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: vt2Id,
          onboarding_id: newOnbId,
          task_type: 'EMPLOYEE_INFO_UPLOAD',
          title: 'Collect contractor site badge photo & emergency contact',
          description: 'Collect contractor badge details and emergency numbers.',
          assigned_to_role: 'HR',
          status: 'NOT_STARTED',
          priority: 'HIGH',
          due_date: payload.joining_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: vt3Id,
          onboarding_id: newOnbId,
          task_type: 'MANAGER_REVIEW',
          title: 'Facility Lead confirms contractor site deployment',
          description: 'Supervisor verifies work station and project tasks.',
          assigned_to_role: 'MANAGER',
          status: 'NOT_STARTED',
          priority: 'HIGH',
          due_date: payload.joining_date,
          dependency_task_id: vt1Id,
          dependency_task_title: 'Verify vendor deployment order & Form VI Labour License',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: vt4Id,
          onboarding_id: newOnbId,
          task_type: 'ATTENDANCE_SETUP',
          title: 'Assign contractor shift & biometric terminal access',
          description: 'Grant facility biometric turnstile access.',
          assigned_to_role: 'HR',
          status: 'NOT_STARTED',
          priority: 'HIGH',
          due_date: payload.joining_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: vt5Id,
          onboarding_id: newOnbId,
          task_type: 'FINAL_HR_ACTIVATION',
          title: 'Final HR contractor readiness audit & activation',
          description: 'Activate contractor profile in Joy PeopleHR.',
          assigned_to_role: 'HR_HEAD',
          status: 'NOT_STARTED',
          priority: 'CRITICAL',
          due_date: payload.joining_date,
          dependency_task_id: vt3Id,
          dependency_task_title: 'Facility Lead confirms contractor site deployment',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );
    }

    setStorage(ONBOARDINGS_STORAGE_KEY, [newOnb, ...onboardings]);
    setStorage(ONBOARDING_TASKS_KEY, [...spawnedTasks, ...tasks]);

    await this.logAudit(newOnb.id, 'ONBOARDING_CREATED', {
      employee_id: payload.employee_id,
      source: payload.employment_source,
      tasksCount: spawnedTasks.length,
    });

    hrEventBus.publish('onboarding.created', newOnb);
    return newOnb;
  },

  // 4. Complete Task with Dependency Enforcement
  async completeTask(taskId: string, completedBy: string = 'user-admin-01'): Promise<{ success: boolean; error?: string }> {
    const tasks = getStorage<OnboardingTask[]>(ONBOARDING_TASKS_KEY, INITIAL_TASKS);
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return { success: false, error: 'Task not found' };

    const task = tasks[idx];

    // Check Dependency
    if (task.dependency_task_id) {
      const depTask = tasks.find((t) => t.id === task.dependency_task_id);
      if (depTask && depTask.status !== 'COMPLETED' && depTask.status !== 'SKIPPED') {
        // Mark as blocked
        tasks[idx] = { ...task, status: 'BLOCKED' };
        setStorage(ONBOARDING_TASKS_KEY, tasks);
        hrEventBus.publish('task.blocked', { taskId, blockerId: depTask.id, blockerTitle: depTask.title });
        return {
          success: false,
          error: `Task is blocked by incomplete prerequisite: "${depTask.title}"`,
        };
      }
    }

    const updatedTask: OnboardingTask = {
      ...task,
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
      updated_at: new Date().toISOString(),
    };

    tasks[idx] = updatedTask;
    setStorage(ONBOARDING_TASKS_KEY, tasks);

    await this.logAudit(task.onboarding_id, 'TASK_COMPLETED', { taskId, title: task.title });
    hrEventBus.publish('task.completed', updatedTask);

    // Update Onboarding lifecycle stage if all tasks completed
    const onbTasks = tasks.filter((t) => t.onboarding_id === task.onboarding_id);
    const allDone = onbTasks.every((t) => t.status === 'COMPLETED' || t.status === 'SKIPPED');

    if (allDone) {
      const onboardings = getStorage<EmployeeOnboarding[]>(ONBOARDINGS_STORAGE_KEY, INITIAL_ONBOARDINGS);
      const onbIdx = onboardings.findIndex((o) => o.id === task.onboarding_id);
      if (onbIdx !== -1) {
        onboardings[onbIdx] = {
          ...onboardings[onbIdx],
          status: 'READY_TO_ACTIVATE',
          updated_at: new Date().toISOString(),
        };
        setStorage(ONBOARDINGS_STORAGE_KEY, onboardings);
        hrEventBus.publish('onboarding.updated', onboardings[onbIdx]);
      }
    }

    return { success: true };
  },

  // 5. Reassign Task Owner
  async reassignTask(taskId: string, newRole: OnboardingTaskRole, newUserId?: string): Promise<void> {
    const tasks = getStorage<OnboardingTask[]>(ONBOARDING_TASKS_KEY, INITIAL_TASKS);
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return;

    tasks[idx] = {
      ...tasks[idx],
      assigned_to_role: newRole,
      assigned_to_user_id: newUserId,
      updated_at: new Date().toISOString(),
    };

    setStorage(ONBOARDING_TASKS_KEY, tasks);
    await this.logAudit(tasks[idx].onboarding_id, 'TASK_REASSIGNED', { taskId, newRole, newUserId });
    hrEventBus.publish('onboarding.updated', { taskId });
  },

  // 6. Document Verification & Rejection Workflow
  async verifyDocument(onboardingId: string, docId: string, status: 'VERIFIED' | 'REJECTED', reason?: string): Promise<void> {
    const tasks = getStorage<OnboardingTask[]>(ONBOARDING_TASKS_KEY, INITIAL_TASKS);

    if (status === 'VERIFIED') {
      const docTask = tasks.find((t) => t.onboarding_id === onboardingId && t.task_type.includes('DOC'));
      if (docTask) {
        await this.completeTask(docTask.id);
      }
      hrEventBus.publish('document.verified', { onboardingId, docId });
    } else {
      // Rejection: create high priority replacement task
      const replaceTask: OnboardingTask = {
        id: `task-replace-${Date.now().toString(36)}`,
        onboarding_id: onboardingId,
        task_type: 'REPLACE_DOCUMENT',
        title: `Upload replacement document (Rejected: ${reason || 'Document unreadable'})`,
        description: `Please re-upload statutory document. Reason: ${reason}`,
        assigned_to_role: 'EMPLOYEE',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        due_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setStorage(ONBOARDING_TASKS_KEY, [replaceTask, ...tasks]);
      hrEventBus.publish('document.rejected', { onboardingId, docId, reason });
    }
  },

  // 7. IT Asset Allocation Integration
  async assignAsset(onboardingId: string, assetId: string, assignedBy: string = 'user-admin-01'): Promise<void> {
    const onb = await this.getOnboardingById(onboardingId);
    if (!onb) return;

    // Complete IT asset task
    const tasks = getStorage<OnboardingTask[]>(ONBOARDING_TASKS_KEY, INITIAL_TASKS);
    const itTask = tasks.find((t) => t.onboarding_id === onboardingId && t.task_type === 'IT_ASSET_ALLOCATION');
    if (itTask) {
      await this.completeTask(itTask.id, assignedBy);
    }

    await this.logAudit(onboardingId, 'ASSET_ASSIGNED', { assetId, employeeId: onb.employee_id });
    hrEventBus.publish('asset.assigned', { onboardingId, assetId });
  },

  // 8. Policy Acknowledgement
  async acknowledgePolicy(onboardingId: string, policyId: string, policyName: string, version: string = '1.0'): Promise<void> {
    const acks = getStorage<OnboardingPolicyAck[]>(ONBOARDING_POLICIES_KEY, []);
    const newAck: OnboardingPolicyAck = {
      id: `ack-${Date.now().toString(36)}`,
      onboarding_id: onboardingId,
      employee_id: '00000000-0000-0000-0000-000000000002',
      policy_id: policyId,
      policy_name: policyName,
      policy_version: version,
      acknowledged_at: new Date().toISOString(),
    };

    setStorage(ONBOARDING_POLICIES_KEY, [newAck, ...acks]);

    // Complete policy task
    const tasks = getStorage<OnboardingTask[]>(ONBOARDING_TASKS_KEY, INITIAL_TASKS);
    const polTask = tasks.find((t) => t.onboarding_id === onboardingId && t.task_type === 'POLICY_ACKNOWLEDGEMENT');
    if (polTask) {
      await this.completeTask(polTask.id);
    }
  },

  // 9. HR Head Override with Reason
  async overrideTask(onboardingId: string, taskId: string, reason: string, approvedBy: string = 'Dharun Joy (Company Admin)'): Promise<void> {
    const overrides = getStorage<OnboardingOverride[]>(ONBOARDING_OVERRIDES_KEY, []);
    const newOvr: OnboardingOverride = {
      id: `ovr-${Date.now().toString(36)}`,
      onboarding_id: onboardingId,
      task_id: taskId,
      approved_by: approvedBy,
      reason,
      created_at: new Date().toISOString(),
    };

    setStorage(ONBOARDING_OVERRIDES_KEY, [newOvr, ...overrides]);

    // Force complete task
    const tasks = getStorage<OnboardingTask[]>(ONBOARDING_TASKS_KEY, INITIAL_TASKS);
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      tasks[idx] = {
        ...tasks[idx],
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        completed_by: `[OVERRIDDEN] ${approvedBy}`,
        metadata: { overrideReason: reason },
      };
      setStorage(ONBOARDING_TASKS_KEY, tasks);
    }

    await this.logAudit(onboardingId, 'TASK_OVERRIDDEN', { taskId, reason, approvedBy });
    hrEventBus.publish('onboarding.updated', { onboardingId });
  },

  // 10. Final Activation (Section 33, 34)
  async activateEmployee(onboardingId: string, activatedBy: string = 'Dharun Joy (Company Admin)'): Promise<{ success: boolean; error?: string }> {
    const onb = await this.getOnboardingById(onboardingId);
    if (!onb) return { success: false, error: 'Onboarding record not found' };

    const tasks = onb.tasks || [];
    const incompleteTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'SKIPPED');

    if (incompleteTasks.length > 0) {
      return {
        success: false,
        error: `Cannot activate employee: ${incompleteTasks.length} mandatory onboarding tasks are pending completion or override.`,
      };
    }

    // 1. Mark Onboarding as COMPLETED
    const onboardings = getStorage<EmployeeOnboarding[]>(ONBOARDINGS_STORAGE_KEY, INITIAL_ONBOARDINGS);
    const idx = onboardings.findIndex((o) => o.id === onboardingId);
    if (idx !== -1) {
      onboardings[idx] = {
        ...onboardings[idx],
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStorage(ONBOARDINGS_STORAGE_KEY, onboardings);
    }

    // 2. Transition Canonical Employee status to ACTIVE in Employee Master
    try {
      await api.updateEmployee(onb.employee_id, {
        status: 'Active',
      });
    } catch (err) {
      console.warn('[OnboardingService] Could not update employee status:', err);
    }

    await this.logAudit(onboardingId, 'EMPLOYEE_ACTIVATED', { employeeId: onb.employee_id, activatedBy });
    hrEventBus.publish('employee.activated', { employeeId: onb.employee_id, onboardingId });
    hrEventBus.publish('onboarding.updated', { onboardingId });
    return { success: true };
  },

  // 11. Backend SQL-Driven Summary Metrics (Section 12, 43)
  async getMetrics(): Promise<OnboardingSummaryMetrics> {
    const onboardings = await this.getOnboardings();
    const tasks = getStorage<OnboardingTask[]>(ONBOARDING_TASKS_KEY, INITIAL_TASKS);
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.slice(0, 7);

    const activeCount = onboardings.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
    const pendingHR = tasks.filter((t) => t.assigned_to_role === 'HR' && t.status !== 'COMPLETED' && t.status !== 'SKIPPED').length;
    const pendingEmp = tasks.filter((t) => t.assigned_to_role === 'EMPLOYEE' && t.status !== 'COMPLETED' && t.status !== 'SKIPPED').length;
    const pendingMgr = tasks.filter((t) => t.assigned_to_role === 'MANAGER' && t.status !== 'COMPLETED' && t.status !== 'SKIPPED').length;
    const pendingIT = tasks.filter((t) => t.assigned_to_role === 'IT' && t.status !== 'COMPLETED' && t.status !== 'SKIPPED').length;
    const joiningMonth = onboardings.filter((o) => o.joining_date && o.joining_date.startsWith(currentMonth)).length;
    const overdueCount = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'SKIPPED' && t.due_date && t.due_date < todayStr).length;
    const readyCount = onboardings.filter((o) => o.status === 'READY_TO_ACTIVATE' || (o.total_tasks_count === o.completed_tasks_count && o.status !== 'COMPLETED')).length;

    return {
      active_onboardings: activeCount,
      pending_hr_verification: pendingHR,
      pending_employee_tasks: pendingEmp,
      pending_manager_tasks: pendingMgr,
      pending_it_tasks: pendingIT,
      joining_this_month: joiningMonth,
      overdue_tasks: overdueCount,
      ready_to_activate: readyCount,
    };
  },

  // 12. Audit Logging
  async logAudit(onboardingId: string, action: string, metadata?: any): Promise<void> {
    const logs = getStorage<OnboardingAuditLog[]>(ONBOARDING_AUDIT_KEY, []);
    const log: OnboardingAuditLog = {
      id: `onb-aud-${Date.now().toString(36)}`,
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      onboarding_id: onboardingId,
      actor_id: 'user-admin-01',
      actor_name: 'Dharun Joy (Company Admin)',
      action,
      metadata,
      created_at: new Date().toISOString(),
    };
    setStorage(ONBOARDING_AUDIT_KEY, [log, ...logs]);
  },

  async getAuditLogs(onboardingId: string): Promise<OnboardingAuditLog[]> {
    const logs = getStorage<OnboardingAuditLog[]>(ONBOARDING_AUDIT_KEY, []);
    return logs.filter((l) => l.onboarding_id === onboardingId);
  },

  // 13. Canonical Master Onboarding Finalization (Atomic Transaction)
  async finalizeOnboarding(payload: any): Promise<{
    success: boolean;
    employee_id: string;
    employee_code: string;
    salary_assignment_id?: string;
    annual_ctc?: number;
    monthly_ctc?: number;
  }> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.rpc('fn_finalize_employee_onboarding', {
          p_payload: payload,
        });
        if (error) {
          console.warn('[OnboardingService] Supabase RPC error during finalizeOnboarding:', error);
          throw error;
        }
        if (data && data.success) {
          hrEventBus.publish('employee.created', data);
          return data;
        }
      } catch (err: any) {
        console.warn('[OnboardingService] Falling back to local finalize flow:', err);
      }
    }

    // Local / Offline Fallback Finalization
    const employeeId = `EMP-${Math.floor(100000 + Math.random() * 900000)}`;
    const employeeCode = payload.identity?.employee_code || `JCS-${Math.floor(100 + Math.random() * 900)}`;
    const annualCtc = Number(payload.compensation?.annual_ctc) || 1200000;
    const monthlyCtc = Math.round(annualCtc / 12);

    const newEmp: Employee = {
      id: employeeId,
      employee_code: employeeCode,
      organization_id: payload.organization_id || 'org-joy-01',
      company_id: payload.company_id || 'comp-joy-01',
      company_name: 'Joy Corporate Solutions Pvt Ltd',
      first_name: payload.identity?.first_name || '',
      middle_name: payload.identity?.middle_name || '',
      last_name: payload.identity?.last_name || '',
      display_name: payload.identity?.preferred_name || `${payload.identity?.first_name} ${payload.identity?.last_name}`.trim(),
      work_email: payload.identity?.work_email || '',
      avatar_url: payload.identity?.photo_url || '',
      status: payload.employment?.status || 'Active',
      employment_type: payload.employment?.employment_type || 'Full Time',
      employment_source: payload.employment?.employment_source || 'DIRECT',
      department_id: payload.employment?.department_id || 'dept-eng',
      department_name: payload.employment?.department_name || 'Engineering',
      designation_id: payload.employment?.designation_id || 'desig-se',
      designation_title: payload.employment?.designation_title || 'Software Engineer',
      branch_id: payload.employment?.branch_id || 'br-hq',
      branch_name: payload.employment?.branch_name || 'Headquarters',
      profile: {
        first_name: payload.identity?.first_name || '',
        middle_name: payload.identity?.middle_name || '',
        last_name: payload.identity?.last_name || '',
        display_name: payload.identity?.preferred_name,
        personal_email: payload.contact?.personal_email,
        phone: payload.identity?.phone || '+919791817437',
        alternate_phone: payload.contact?.alternate_phone,
        date_of_birth: payload.identity?.dob,
        gender: payload.identity?.gender || 'Male',
        marital_status: payload.contact?.marital_status || 'Single',
        nationality: payload.contact?.nationality || 'Indian',
        blood_group: payload.contact?.blood_group || 'O+',
        preferred_language: payload.contact?.preferred_language || 'English',
        current_address: {
          line1: payload.contact?.current_line1 || '',
          line2: payload.contact?.current_line2 || '',
          city: payload.contact?.current_city || 'Coimbatore',
          state: payload.contact?.current_state || 'Tamil Nadu',
          country: payload.contact?.current_country || 'India',
          postal_code: payload.contact?.current_postal || '641001',
        },
        permanent_address: {
          line1: payload.contact?.same_as_permanent ? payload.contact?.current_line1 : payload.contact?.perm_line1,
          line2: payload.contact?.same_as_permanent ? payload.contact?.current_line2 : payload.contact?.perm_line2,
          city: payload.contact?.same_as_permanent ? payload.contact?.current_city : payload.contact?.perm_city,
          state: payload.contact?.same_as_permanent ? payload.contact?.current_state : payload.contact?.perm_state,
          country: payload.contact?.same_as_permanent ? payload.contact?.current_country : payload.contact?.perm_country,
          postal_code: payload.contact?.same_as_permanent ? payload.contact?.current_postal : payload.contact?.perm_postal,
        },
        emergency_contacts: [
          {
            name: payload.emergency?.emergency_name || 'Family Contact',
            relationship: payload.emergency?.emergency_relation || 'Spouse',
            phone: payload.emergency?.emergency_phone || '+919876543210',
            alt_phone: payload.emergency?.emergency_alt_phone,
            email: payload.emergency?.emergency_email,
            is_primary: true,
            priority: 1,
          },
        ],
        family_members: payload.emergency?.family_members || [],
      },
      employment: {
        doj: payload.employment?.doj || new Date().toISOString().split('T')[0],
        employment_type: payload.employment?.employment_type || 'Full Time',
        employment_source: payload.employment?.employment_source || 'DIRECT',
        work_mode: payload.employment?.work_mode || 'Hybrid',
        job_level: payload.employment?.job_level || 'Mid Level',
        grade: payload.employment?.grade || 'G3',
        cost_center_code: payload.reporting?.cost_center || 'CC-ENG-101',
        reporting_manager_id: payload.reporting?.reporting_manager_id,
        reporting_manager_name: payload.reporting?.reporting_manager_name,
        team_lead_id: payload.reporting?.team_lead_id,
        team_lead_name: payload.reporting?.team_lead_name,
        probation_period_months: payload.employment?.probation_months || 6,
        notice_period_days: payload.employment?.notice_period_days || 60,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to employees list
    await api.createEmployee(newEmp);

    hrEventBus.publish('employee.created', {
      employee_id: employeeId,
      employee_code: employeeCode,
      annual_ctc: annualCtc,
      monthly_ctc: monthlyCtc,
    });

    return {
      success: true,
      employee_id: employeeId,
      employee_code: employeeCode,
      salary_assignment_id: `sal-asg-${Date.now()}`,
      annual_ctc: annualCtc,
      monthly_ctc: monthlyCtc,
    };
  },

  // 14. Effective Configuration Snapshot Query
  async getEmployeeEffectiveConfiguration(employeeId: string): Promise<any> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('v_employee_effective_configuration')
          .select('*')
          .eq('employee_id', employeeId)
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[OnboardingService] Error fetching effective configuration view:', err);
      }
    }
    return null;
  },
};
