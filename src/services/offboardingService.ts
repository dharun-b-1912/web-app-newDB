import {
  EmployeeSeparation,
  SeparationTask,
  SeparationClearance,
  SeparationAssetRecovery,
  ExitInterviewRecord,
  SeparationFnFReadiness,
  SeparationAuditLog,
  SeparationSummaryMetrics,
  SeparationType,
  SeparationReasonCode,
  SeparationStatus,
  RetentionStatus,
  RehireEligibility,
  ClearanceDepartment,
  ClearanceStatus,
  AssetRecoveryStatus,
  FnFStatus,
  NoticePeriodCalculationResult,
  Employee,
} from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { hrEventBus } from './hrEventBus';
import { api } from './api';

const SEPARATIONS_KEY = 'workforce_employee_separations_v1';
const SEPARATION_TASKS_KEY = 'workforce_separation_tasks_v1';
const SEPARATION_CLEARANCES_KEY = 'workforce_separation_clearances_v1';
const SEPARATION_ASSETS_KEY = 'workforce_separation_assets_v1';
const EXIT_INTERVIEWS_KEY = 'workforce_exit_interviews_v1';
const SEPARATION_FNF_KEY = 'workforce_separation_fnf_v1';
const SEPARATION_AUDIT_KEY = 'workforce_separation_audit_v1';
const EMPLOYEES_KEY = 'workforce_employees';

class OffboardingService {
  // --------------------------------------------------------------------------
  // Storage & Persistence Helpers
  // --------------------------------------------------------------------------
  private getStore<T>(key: string, defaultVal: T[]): T[] {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      return JSON.parse(data);
    } catch {
      return defaultVal;
    }
  }

  private setStore<T>(key: string, items: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
      console.warn(`[OffboardingService] Failed writing to localStorage ${key}:`, e);
    }
  }

  private getLocalEmployees(): Employee[] {
    try {
      const data = localStorage.getItem(EMPLOYEES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  // --------------------------------------------------------------------------
  // Notice Period Engine
  // Policy-based calculation based on probation, designation, and department
  // --------------------------------------------------------------------------
  calculateNoticePeriod(employee: Employee | null, resignationDateStr?: string): NoticePeriodCalculationResult {
    const resDate = resignationDateStr ? new Date(resignationDateStr) : new Date();
    const noticeStartDateStr = resDate.toISOString().split('T')[0];

    let noticeDays = 30; // Standard Full Time default
    let policyApplied = 'Standard Employee Policy (30 Days)';

    if (!employee) {
      const expLwd = new Date(resDate);
      expLwd.setDate(expLwd.getDate() + noticeDays);
      return {
        notice_period_days: noticeDays,
        notice_start_date: noticeStartDateStr,
        expected_last_working_date: expLwd.toISOString().split('T')[0],
        policy_applied: policyApplied,
      };
    }

    const empType = (employee.employment_type || (employee as any).type || '').toLowerCase();
    const designation = (employee.designation_title || (employee as any).designation || '').toLowerCase();
    const isProbation = empType.includes('probation') || (employee.status as string) === 'Probation';

    if (isProbation) {
      noticeDays = 15;
      policyApplied = 'Probationary Policy (15 Days Notice)';
    } else if (empType.includes('intern') || empType.includes('trainee')) {
      noticeDays = 7;
      policyApplied = 'Intern / Trainee Policy (7 Days Notice)';
    } else if (empType.includes('contract') || (employee as any).employment_source === 'VENDOR') {
      noticeDays = 14;
      policyApplied = 'Contractor / Vendor SOW Policy (14 Days Notice)';
    } else if (
      designation.includes('architect') ||
      designation.includes('lead') ||
      designation.includes('director') ||
      designation.includes('head') ||
      designation.includes('vp') ||
      designation.includes('manager')
    ) {
      noticeDays = 60;
      policyApplied = 'Executive & Technical Leadership Policy (60 Days Notice)';
    } else {
      noticeDays = 30;
      policyApplied = 'Regular Confirmed Employee Policy (30 Days Notice)';
    }

    const expLwd = new Date(resDate);
    expLwd.setDate(expLwd.getDate() + noticeDays);

    return {
      notice_period_days: noticeDays,
      notice_start_date: noticeStartDateStr,
      expected_last_working_date: expLwd.toISOString().split('T')[0],
      policy_applied: policyApplied,
    };
  }

  // --------------------------------------------------------------------------
  // Audit Trail Logging
  // --------------------------------------------------------------------------
  logAudit(
    separationId: string,
    action: string,
    employeeId?: string,
    oldVal?: any,
    newVal?: any,
    reason?: string
  ): void {
    const currentUser = api.getCurrentUser();
    const auditLogs = this.getStore<SeparationAuditLog>(SEPARATION_AUDIT_KEY, []);
    const logItem: SeparationAuditLog = {
      id: `sep-aud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      organization_id: currentUser.organization_id || 'a0000000-0000-0000-0000-000000000001',
      separation_id: separationId,
      employee_id: employeeId,
      actor_id: currentUser.id || currentUser.employee_id || 'sys-admin',
      actor_name: currentUser.name || 'System Admin',
      action,
      old_value: oldVal,
      new_value: newVal,
      reason,
      created_at: new Date().toISOString(),
    };
    auditLogs.unshift(logItem);
    this.setStore(SEPARATION_AUDIT_KEY, auditLogs);
  }

  // --------------------------------------------------------------------------
  // Clearances & Tasks Initializer
  // Spawns standard departmental clearance matrix
  // --------------------------------------------------------------------------
  private createDefaultClearances(separationId: string, expectedLwd: string): SeparationClearance[] {
    const departments: Array<{ dept: ClearanceDepartment; item: string; role: string }> = [
      { dept: 'MANAGER', item: 'Knowledge Transfer signoff & project repository transition', role: 'MANAGER' },
      { dept: 'TEAM_LEAD', item: 'Sprint backlog handover & code review completion', role: 'TEAM_LEAD' },
      { dept: 'IT', item: 'Single Sign-On, VPN, GitHub & Email account deactivation schedule', role: 'IT' },
      { dept: 'ASSET', item: 'Physical laptop, access card & company equipment return', role: 'ASSET' },
      { dept: 'FINANCE', item: 'Expense claims reconciliation & advance adjustments', role: 'FINANCE' },
      { dept: 'PAYROLL', item: 'Salary hold check, attendance LOP & notice buyout ledger calculation', role: 'PAYROLL' },
      { dept: 'HR', item: 'Exit interview feedback and statutory documentation clearance', role: 'HR' },
      { dept: 'ADMIN', item: 'Office pedestal keys, security badge & parking tag surrender', role: 'ADMIN' },
    ];

    const now = new Date().toISOString();
    return departments.map((d, index) => ({
      id: `sclear-${Date.now()}-${index}`,
      separation_id: separationId,
      department: d.dept,
      clearance_item: d.item,
      assigned_role: d.role,
      status: 'PENDING',
      due_date: expectedLwd,
      created_at: now,
      updated_at: now,
    }));
  }

  private createDefaultTasks(
    separationId: string,
    employeeName: string,
    managerName: string,
    expectedLwd: string
  ): SeparationTask[] {
    const now = new Date().toISOString();
    return [
      {
        id: `stask-${Date.now()}-1`,
        separation_id: separationId,
        task_category: 'KNOWLEDGE_TRANSFER',
        title: 'Project Architectural Handover & Code Documentation',
        description: 'Document system design, repo access, ongoing sprint deliverables, and deployment runbooks.',
        handover_owner_name: employeeName,
        recipient_name: managerName || 'Team Lead',
        status: 'PENDING',
        due_date: expectedLwd,
        created_at: now,
        updated_at: now,
      },
      {
        id: `stask-${Date.now()}-2`,
        separation_id: separationId,
        task_category: 'CLIENT_HANDOVER',
        title: 'Client Stakeholder Transition & Communications',
        description: 'Introduce replacement engineer/lead to external clients and partners.',
        handover_owner_name: employeeName,
        recipient_name: managerName || 'Engineering Director',
        status: 'PENDING',
        due_date: expectedLwd,
        created_at: now,
        updated_at: now,
      },
      {
        id: `stask-${Date.now()}-3`,
        separation_id: separationId,
        task_category: 'DOCUMENT_HANDOVER',
        title: 'Confidentiality & Statutory NDA Re-affirmation',
        description: 'Sign off on non-solicitation and intellectual property protection exit schedule.',
        handover_owner_name: employeeName,
        recipient_name: 'HR Operations',
        status: 'PENDING',
        due_date: expectedLwd,
        created_at: now,
        updated_at: now,
      },
    ];
  }

  // --------------------------------------------------------------------------
  // Query Separations (Server-side simulation with SQL view fallback)
  // --------------------------------------------------------------------------
  getSeparations(params: {
    search?: string;
    status?: SeparationStatus | 'ALL';
    separation_type?: SeparationType | 'ALL';
    department_id?: string;
    manager_id?: string;
    vendor_id?: string;
    employment_source?: 'DIRECT' | 'VENDOR' | 'ALL';
    segment?: string;
    page?: number;
    limit?: number;
  } = {}): { items: EmployeeSeparation[]; total: number; page: number; totalPages: number } {
    const separations = this.getStore<EmployeeSeparation>(SEPARATIONS_KEY, []);
    const clearances = this.getStore<SeparationClearance>(SEPARATION_CLEARANCES_KEY, []);
    const tasks = this.getStore<SeparationTask>(SEPARATION_TASKS_KEY, []);
    const assets = this.getStore<SeparationAssetRecovery>(SEPARATION_ASSETS_KEY, []);
    const fnfRecords = this.getStore<SeparationFnFReadiness>(SEPARATION_FNF_KEY, []);
    const exitRecords = this.getStore<ExitInterviewRecord>(EXIT_INTERVIEWS_KEY, []);

    const employees = this.getLocalEmployees();
    const empMap = new Map<string, Employee>();
    employees.forEach(e => empMap.set(e.id, e));

    const todayStr = new Date().toISOString().split('T')[0];

    // Hydrate & aggregate
    const hydrated = separations.map(s => {
      const emp = empMap.get(s.employee_id) || s.employee;
      const sepClearances = clearances.filter(c => c.separation_id === s.id);
      const sepTasks = tasks.filter(t => t.separation_id === s.id);
      const sepAssets = assets.filter(a => a.separation_id === s.id);
      const fnf = fnfRecords.find(f => f.separation_id === s.id);
      const exitInt = exitRecords.find(e => e.separation_id === s.id);

      const totalClearances = sepClearances.length;
      const clearedClearances = sepClearances.filter(c => c.status === 'CLEARED' || c.status === 'WAIVED').length;
      const pendingClearances = sepClearances.filter(c => c.status === 'PENDING' || c.status === 'IN_PROGRESS').length;
      const rejectedClearances = sepClearances.filter(c => c.status === 'REJECTED').length;
      const overdueClearances = sepClearances.filter(
        c => (c.status === 'PENDING' || c.status === 'IN_PROGRESS') && c.due_date && c.due_date < todayStr
      ).length;

      const totalTasks = sepTasks.length;
      const completedTasks = sepTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAIVED').length;

      const totalAssets = sepAssets.length;
      const returnedAssets = sepAssets.filter(a => a.recovery_status === 'RETURNED' || a.recovery_status === 'WAIVED').length;
      const issueAssets = sepAssets.filter(a => a.recovery_status === 'DAMAGED' || a.recovery_status === 'MISSING').length;

      // Calculate progress percentage
      const totalUnits = totalClearances + totalTasks + (totalAssets > 0 ? totalAssets : 1);
      const completedUnits = clearedClearances + completedTasks + (totalAssets > 0 ? returnedAssets : 1);
      const progressPct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

      // Identify blockers
      const blockers: string[] = [];
      if (pendingClearances > 0) blockers.push(`${pendingClearances} pending department clearances`);
      if (rejectedClearances > 0) blockers.push(`${rejectedClearances} rejected clearance items`);
      if (issueAssets > 0) blockers.push(`${issueAssets} damaged/missing assets unresolved`);
      if (fnf && fnf.status !== 'APPROVED' && fnf.status !== 'SETTLED' && s.employment_source === 'DIRECT') {
        blockers.push('Full & Final payroll settlement pending');
      }

      const isReadyForExit = blockers.length === 0 && s.status !== 'COMPLETED' && s.status !== 'CANCELLED';

      return {
        ...s,
        employee: emp,
        clearances: sepClearances,
        tasks: sepTasks,
        assets: sepAssets,
        fnf_readiness: fnf,
        exit_interview: exitInt,
        total_clearances_count: totalClearances,
        cleared_clearances_count: clearedClearances,
        pending_clearances_count: pendingClearances,
        rejected_clearances_count: rejectedClearances,
        overdue_clearances_count: overdueClearances,
        total_tasks_count: totalTasks,
        completed_tasks_count: completedTasks,
        total_assets_count: totalAssets,
        returned_assets_count: returnedAssets,
        issue_assets_count: issueAssets,
        progress_percentage: progressPct,
        is_ready_for_exit: isReadyForExit,
        blockers,
      };
    });

    // Filtering
    let filtered = hydrated;

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(s => {
        const empName = `${s.employee?.first_name || ''} ${s.employee?.last_name || ''}`.toLowerCase();
        const code = (s.employee?.employee_code || '').toLowerCase();
        const dept = (s.employee?.department_name || '').toLowerCase();
        const mgr = (s.employee?.employment?.reporting_manager_name || '').toLowerCase();
        const reason = (s.reason_text || '').toLowerCase();
        const sepId = (s.id || '').toLowerCase();
        const vendor = (s.vendor_name || '').toLowerCase();

        return (
          empName.includes(q) ||
          code.includes(q) ||
          dept.includes(q) ||
          mgr.includes(q) ||
          reason.includes(q) ||
          sepId.includes(q) ||
          vendor.includes(q)
        );
      });
    }

    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter(s => s.status === params.status);
    }

    if (params.separation_type && params.separation_type !== 'ALL') {
      filtered = filtered.filter(s => s.separation_type === params.separation_type);
    }

    if (params.department_id && params.department_id !== 'ALL') {
      filtered = filtered.filter(s => s.employee?.department_id === params.department_id);
    }

    if (params.manager_id && params.manager_id !== 'ALL') {
      filtered = filtered.filter(s => s.employee?.employment?.reporting_manager_id === params.manager_id);
    }

    if (params.vendor_id && params.vendor_id !== 'ALL') {
      filtered = filtered.filter(s => s.vendor_id === params.vendor_id);
    }

    if (params.employment_source && params.employment_source !== 'ALL') {
      filtered = filtered.filter(s => s.employment_source === params.employment_source);
    }

    // Segments
    if (params.segment) {
      switch (params.segment) {
        case 'ACTIVE_SEPARATIONS':
          filtered = filtered.filter(s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && s.status !== 'REJECTED');
          break;
        case 'NOTICE_PERIOD':
          filtered = filtered.filter(s => s.status === 'NOTICE_PERIOD');
          break;
        case 'MANAGER_ACTION_REQUIRED':
          filtered = filtered.filter(
            s => s.status === 'MANAGER_REVIEW' || (s.clearances || []).some(c => c.department === 'MANAGER' && c.status === 'PENDING')
          );
          break;
        case 'CLEARANCE_PENDING':
          filtered = filtered.filter(s => (s.pending_clearances_count || 0) > 0);
          break;
        case 'ASSET_RETURN_PENDING':
          filtered = filtered.filter(s => (s.total_assets_count || 0) > (s.returned_assets_count || 0));
          break;
        case 'FNF_PENDING':
          filtered = filtered.filter(s => s.fnf_readiness?.status === 'INPUTS_PENDING' || s.fnf_readiness?.status === 'CALCULATION_IN_PROGRESS');
          break;
        case 'READY_FOR_EXIT':
          filtered = filtered.filter(s => s.is_ready_for_exit);
          break;
        case 'EXITED_THIS_MONTH':
          filtered = filtered.filter(s => s.status === 'COMPLETED');
          break;
        case 'VENDOR_SEPARATIONS':
          filtered = filtered.filter(s => s.employment_source === 'VENDOR');
          break;
        case 'DIRECT_SEPARATIONS':
          filtered = filtered.filter(s => s.employment_source === 'DIRECT');
          break;
      }
    }

    // Sort: newest first
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, totalPages };
  }

  getSeparationById(id: string): EmployeeSeparation | null {
    const res = this.getSeparations({ limit: 1000 });
    return res.items.find(s => s.id === id) || null;
  }

  getSeparationByEmployeeId(employeeId: string): EmployeeSeparation | null {
    const res = this.getSeparations({ limit: 1000 });
    return res.items.find(s => s.employee_id === employeeId && s.status !== 'CANCELLED') || null;
  }

  // --------------------------------------------------------------------------
  // Initiate Separation / Submit Resignation
  // --------------------------------------------------------------------------
  async initiateSeparation(input: {
    employee_id: string;
    separation_type: SeparationType;
    reason_code: SeparationReasonCode;
    reason_text?: string;
    resignation_date: string;
    proposed_last_working_date?: string;
    comments?: string;
    supporting_document_url?: string;
    is_hr_initiated?: boolean;
  }): Promise<EmployeeSeparation> {
    const currentUser = api.getCurrentUser();
    const employees = this.getLocalEmployees();
    const emp = employees.find(e => e.id === input.employee_id);

    if (!emp) {
      throw new Error(`Employee with ID ${input.employee_id} not found.`);
    }

    // Check if active separation already exists
    const existing = this.getSeparationByEmployeeId(input.employee_id);
    if (existing && existing.status !== 'COMPLETED' && existing.status !== 'CANCELLED' && existing.status !== 'REJECTED') {
      throw new Error(`Active separation workflow (${existing.id}) is already in progress for this employee.`);
    }

    // Calculate notice period
    const noticeCalc = this.calculateNoticePeriod(emp, input.resignation_date);
    const expectedLwd = input.proposed_last_working_date || noticeCalc.expected_last_working_date;

    const separationId = `sep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const empSource = ((emp as any).employment_source || (emp.employment_type === 'Contract' ? 'VENDOR' : 'DIRECT')) as 'DIRECT' | 'VENDOR';
    const initialStatus: SeparationStatus = input.is_hr_initiated ? 'HR_REVIEW' : 'SUBMITTED';

    const separation: EmployeeSeparation = {
      id: separationId,
      organization_id: currentUser.organization_id || emp.organization_id || 'a0000000-0000-0000-0000-000000000001',
      legal_entity_id: emp.company_id || 'c1000000-0000-0000-0000-000000000001',
      employee_id: emp.id,
      vendor_id: (emp as any).vendor_id,
      vendor_name: (emp as any).vendor_name,
      employment_source: empSource,
      separation_type: input.separation_type,
      reason_code: input.reason_code,
      reason_text: input.reason_text || input.comments,
      resignation_date: input.resignation_date,
      proposed_last_working_date: input.proposed_last_working_date,
      notice_period_days: noticeCalc.notice_period_days,
      notice_start_date: noticeCalc.notice_start_date,
      expected_last_working_date: expectedLwd,
      approved_last_working_date: expectedLwd,
      status: initialStatus,
      initiated_by: currentUser.name || 'Current User',
      initiated_role: input.is_hr_initiated ? 'HR_HEAD' : 'EMPLOYEE',
      comments: input.comments,
      supporting_document_url: input.supporting_document_url,
      retention_status: 'NOT_APPLICABLE',
      rehire_eligibility: 'ELIGIBLE',
      is_early_release: false,
      notice_waiver_days: 0,
      notice_buyout_days: 0,
      created_at: now,
      updated_at: now,
    };

    // 1. Save Separation Record
    const separations = this.getStore<EmployeeSeparation>(SEPARATIONS_KEY, []);
    separations.unshift(separation);
    this.setStore(SEPARATIONS_KEY, separations);

    // 2. Spawn Clearances
    const defaultClearances = this.createDefaultClearances(separationId, expectedLwd);
    const allClearances = this.getStore<SeparationClearance>(SEPARATION_CLEARANCES_KEY, []);
    this.setStore(SEPARATION_CLEARANCES_KEY, [...defaultClearances, ...allClearances]);

    // 3. Spawn Handover Tasks
    const defaultTasks = this.createDefaultTasks(
      separationId,
      `${emp.first_name} ${emp.last_name}`,
      emp.employment?.reporting_manager_name || 'Direct Manager',
      expectedLwd
    );
    const allTasks = this.getStore<SeparationTask>(SEPARATION_TASKS_KEY, []);
    this.setStore(SEPARATION_TASKS_KEY, [...defaultTasks, ...allTasks]);

    // 4. Populate Asset Recoveries (Simulate active company assets assigned to employee)
    const empAssets: SeparationAssetRecovery[] = [
      {
        id: `sasset-${Date.now()}-1`,
        separation_id: separationId,
        asset_id: `AST-LAP-${emp.employee_code || '101'}`,
        asset_name: `Apple MacBook Pro 16" (M3 Max - 36GB)`,
        serial_number: `C02G9981MD${Math.floor(1000 + Math.random() * 9000)}`,
        category: 'Laptop',
        assigned_date: '2024-06-01',
        asset_value: 3499,
        condition: 'GOOD',
        recovery_status: 'PENDING',
        financial_recovery_amount: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: `sasset-${Date.now()}-2`,
        separation_id: separationId,
        asset_id: `AST-SEC-${emp.employee_code || '101'}`,
        asset_name: `JoyHQ RFID Campus Access Card & Security Token`,
        serial_number: `RFID-${emp.employee_code || '101'}`,
        category: 'Access Token',
        assigned_date: '2024-06-01',
        asset_value: 50,
        condition: 'GOOD',
        recovery_status: 'PENDING',
        financial_recovery_amount: 0,
        created_at: now,
        updated_at: now,
      },
    ];
    const allAssets = this.getStore<SeparationAssetRecovery>(SEPARATION_ASSETS_KEY, []);
    this.setStore(SEPARATION_ASSETS_KEY, [...empAssets, ...allAssets]);

    // 5. Initialize F&F Readiness Entry
    const initialFnF: SeparationFnFReadiness = {
      id: `fnf-rdy-${Date.now()}`,
      separation_id: separationId,
      employee_id: emp.id,
      status: 'INPUTS_PENDING',
      worked_days: 22,
      lop_days: 0,
      leave_encashment_days: 14.5,
      notice_buyout_days: 0,
      notice_waiver_days: 0,
      asset_recovery_deduction: 0,
      outstanding_advances: 0,
      expense_claims_payable: 450,
      pending_salary_payable: 4200,
      gratuity_eligible: true,
      gratuity_amount: 3800,
      net_payable_estimated: 8450,
      created_at: now,
      updated_at: now,
    };
    const allFnf = this.getStore<SeparationFnFReadiness>(SEPARATION_FNF_KEY, []);
    allFnf.unshift(initialFnF);
    this.setStore(SEPARATION_FNF_KEY, allFnf);

    // 6. Audit & Event Dispatch
    this.logAudit(
      separationId,
      input.is_hr_initiated ? 'HR_SEPARATION_INITIATED' : 'RESIGNATION_SUBMITTED',
      emp.id,
      null,
      separation,
      input.reason_text
    );

    hrEventBus.publish('separation.created', { separationId, employeeId: emp.id, separationType: input.separation_type }, {
      organizationId: separation.organization_id,
      actorId: currentUser.id,
    });

    return this.getSeparationById(separationId)!;
  }

  // --------------------------------------------------------------------------
  // Manager Review & Retention Workflow
  // --------------------------------------------------------------------------
  async managerReview(
    separationId: string,
    input: {
      action: 'RECOMMEND_RELEASE' | 'REQUEST_RETENTION' | 'REQUEST_CHANGE';
      comments?: string;
      proposed_lwd?: string;
    }
  ): Promise<EmployeeSeparation> {
    const sep = this.getSeparationById(separationId);
    if (!sep) throw new Error('Separation not found');

    const separations = this.getStore<EmployeeSeparation>(SEPARATIONS_KEY, []);
    const idx = separations.findIndex(s => s.id === separationId);
    if (idx === -1) throw new Error('Separation not found in store');

    const oldVal = { ...separations[idx] };
    const now = new Date().toISOString();

    if (input.action === 'REQUEST_RETENTION') {
      separations[idx].retention_status = 'PENDING';
      separations[idx].retention_notes = input.comments;
      separations[idx].status = 'MANAGER_REVIEW';
    } else if (input.action === 'RECOMMEND_RELEASE') {
      separations[idx].status = 'NOTICE_PERIOD';
      if (input.proposed_lwd) {
        separations[idx].approved_last_working_date = input.proposed_lwd;
      }
    } else if (input.action === 'REQUEST_CHANGE') {
      separations[idx].status = 'HR_REVIEW';
    }

    separations[idx].updated_at = now;
    this.setStore(SEPARATIONS_KEY, separations);

    // Update manager clearance
    const clearances = this.getStore<SeparationClearance>(SEPARATION_CLEARANCES_KEY, []);
    const mgrClearance = clearances.find(c => c.separation_id === separationId && c.department === 'MANAGER');
    if (mgrClearance) {
      mgrClearance.status = input.action === 'REQUEST_RETENTION' ? 'IN_PROGRESS' : 'CLEARED';
      mgrClearance.comments = input.comments || 'Manager review completed';
      mgrClearance.completed_at = now;
      mgrClearance.completed_by = api.getCurrentUser().name || 'Reporting Manager';
      this.setStore(SEPARATION_CLEARANCES_KEY, clearances);
    }

    this.logAudit(separationId, `MANAGER_REVIEW_${input.action}`, sep.employee_id, oldVal, separations[idx], input.comments);

    hrEventBus.publish('manager.reviewed', { separationId, action: input.action }, {
      actorId: api.getCurrentUser().id,
    });

    return this.getSeparationById(separationId)!;
  }

  async updateRetentionStatus(
    separationId: string,
    status: RetentionStatus,
    notes: string
  ): Promise<EmployeeSeparation> {
    const sep = this.getSeparationById(separationId);
    if (!sep) throw new Error('Separation not found');

    const separations = this.getStore<EmployeeSeparation>(SEPARATIONS_KEY, []);
    const idx = separations.findIndex(s => s.id === separationId);
    if (idx === -1) throw new Error('Separation not found');

    const oldVal = { ...separations[idx] };
    const now = new Date().toISOString();

    separations[idx].retention_status = status;
    separations[idx].retention_notes = notes;
    separations[idx].updated_at = now;

    if (status === 'RETAINED') {
      // Employee retained -> Cancel separation, employee returns to Active!
      separations[idx].status = 'CANCELLED';
      this.logAudit(separationId, 'RETENTION_SUCCESS_SEPARATION_CANCELLED', sep.employee_id, oldVal, separations[idx], notes);
    } else if (status === 'CONTINUE_EXIT') {
      separations[idx].status = 'NOTICE_PERIOD';
      this.logAudit(separationId, 'RETENTION_FAILED_CONTINUE_EXIT', sep.employee_id, oldVal, separations[idx], notes);
    }

    this.setStore(SEPARATIONS_KEY, separations);
    return this.getSeparationById(separationId)!;
  }

  // --------------------------------------------------------------------------
  // Departmental Clearance Signoff
  // --------------------------------------------------------------------------
  async updateClearance(
    clearanceId: string,
    input: {
      status: ClearanceStatus;
      comments?: string;
    }
  ): Promise<SeparationClearance> {
    const clearances = this.getStore<SeparationClearance>(SEPARATION_CLEARANCES_KEY, []);
    const idx = clearances.findIndex(c => c.id === clearanceId);
    if (idx === -1) throw new Error('Clearance item not found');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const oldVal = { ...clearances[idx] };

    clearances[idx].status = input.status;
    clearances[idx].comments = input.comments || clearances[idx].comments;
    clearances[idx].updated_at = now;
    if (input.status === 'CLEARED' || input.status === 'WAIVED') {
      clearances[idx].completed_at = now;
      clearances[idx].completed_by = currentUser.name || 'Authorized Lead';
    }

    this.setStore(SEPARATION_CLEARANCES_KEY, clearances);

    const clearance = clearances[idx];
    this.logAudit(
      clearance.separation_id,
      `CLEARANCE_${clearance.department}_${input.status}`,
      undefined,
      oldVal,
      clearance,
      input.comments
    );

    hrEventBus.publish('clearance.completed', { clearanceId, department: clearance.department, status: input.status }, {
      actorId: currentUser.id,
    });

    return clearance;
  }

  // --------------------------------------------------------------------------
  // Asset Recovery Operations
  // --------------------------------------------------------------------------
  async updateAssetRecovery(
    assetRecoveryId: string,
    input: {
      recovery_status: AssetRecoveryStatus;
      condition?: 'EXCELLENT' | 'GOOD' | 'DAMAGED' | 'NEEDS_REPAIR';
      damage_assessment?: string;
      financial_recovery_amount?: number;
      notes?: string;
    }
  ): Promise<SeparationAssetRecovery> {
    const assets = this.getStore<SeparationAssetRecovery>(SEPARATION_ASSETS_KEY, []);
    const idx = assets.findIndex(a => a.id === assetRecoveryId);
    if (idx === -1) throw new Error('Asset recovery record not found');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const oldVal = { ...assets[idx] };

    assets[idx].recovery_status = input.recovery_status;
    if (input.condition) assets[idx].condition = input.condition;
    if (input.damage_assessment) assets[idx].damage_assessment = input.damage_assessment;
    if (input.financial_recovery_amount !== undefined) assets[idx].financial_recovery_amount = input.financial_recovery_amount;
    if (input.notes) assets[idx].notes = input.notes;
    assets[idx].updated_at = now;

    if (input.recovery_status === 'RETURNED') {
      assets[idx].returned_date = now.split('T')[0];
      assets[idx].received_by = currentUser.name || 'IT Custodian';
    }

    this.setStore(SEPARATION_ASSETS_KEY, assets);

    const asset = assets[idx];
    this.logAudit(
      asset.separation_id,
      `ASSET_RECOVERY_${asset.asset_name}_${input.recovery_status}`,
      undefined,
      oldVal,
      asset,
      input.notes
    );

    hrEventBus.publish(
      input.recovery_status === 'MISSING' ? 'asset.missing' : 'asset.returned',
      { assetRecoveryId, status: input.recovery_status }
    );

    return asset;
  }

  // --------------------------------------------------------------------------
  // Exit Interview Collection
  // --------------------------------------------------------------------------
  async submitExitInterview(input: {
    separation_id: string;
    employee_id: string;
    primary_reason: SeparationReasonCode;
    secondary_reason?: string;
    general_feedback?: string;
    manager_feedback?: string;
    culture_feedback?: string;
    compensation_feedback?: string;
    recommendation?: string;
    rehire_eligible: RehireEligibility;
    notes?: string;
  }): Promise<ExitInterviewRecord> {
    const now = new Date().toISOString();
    const interviewRecord: ExitInterviewRecord = {
      id: `exit-int-${Date.now()}`,
      separation_id: input.separation_id,
      employee_id: input.employee_id,
      interview_date: now.split('T')[0],
      conducted_by: api.getCurrentUser().name || 'HR Operations Partner',
      primary_reason: input.primary_reason,
      secondary_reason: input.secondary_reason,
      general_feedback: input.general_feedback,
      manager_feedback: input.manager_feedback,
      culture_feedback: input.culture_feedback,
      compensation_feedback: input.compensation_feedback,
      recommendation: input.recommendation,
      rehire_eligible: input.rehire_eligible,
      notes: input.notes,
      created_at: now,
      updated_at: now,
    };

    const interviews = this.getStore<ExitInterviewRecord>(EXIT_INTERVIEWS_KEY, []);
    const filtered = interviews.filter(i => i.separation_id !== input.separation_id);
    filtered.unshift(interviewRecord);
    this.setStore(EXIT_INTERVIEWS_KEY, filtered);

    // Update separation rehire eligibility
    const separations = this.getStore<EmployeeSeparation>(SEPARATIONS_KEY, []);
    const sepIdx = separations.findIndex(s => s.id === input.separation_id);
    if (sepIdx !== -1) {
      separations[sepIdx].rehire_eligibility = input.rehire_eligible;
      separations[sepIdx].updated_at = now;
      this.setStore(SEPARATIONS_KEY, separations);
    }

    this.logAudit(input.separation_id, 'EXIT_INTERVIEW_RECORDED', input.employee_id, null, interviewRecord);

    hrEventBus.publish('exit_interview.completed', { separationId: input.separation_id, employeeId: input.employee_id });

    return interviewRecord;
  }

  // --------------------------------------------------------------------------
  // Notice Modification (HR Head Authorized)
  // --------------------------------------------------------------------------
  async updateNoticePeriod(
    separationId: string,
    input: {
      approved_last_working_date: string;
      notice_waiver_days?: number;
      notice_buyout_days?: number;
      is_early_release?: boolean;
      reason: string;
    }
  ): Promise<EmployeeSeparation> {
    const sep = this.getSeparationById(separationId);
    if (!sep) throw new Error('Separation not found');

    const separations = this.getStore<EmployeeSeparation>(SEPARATIONS_KEY, []);
    const idx = separations.findIndex(s => s.id === separationId);
    if (idx === -1) throw new Error('Separation not found');

    const currentUser = api.getCurrentUser();
    const oldVal = { ...separations[idx] };
    const now = new Date().toISOString();

    separations[idx].approved_last_working_date = input.approved_last_working_date;
    separations[idx].notice_waiver_days = input.notice_waiver_days || 0;
    separations[idx].notice_buyout_days = input.notice_buyout_days || 0;
    separations[idx].is_early_release = input.is_early_release || false;
    separations[idx].override_reason = input.reason;
    separations[idx].override_by = currentUser.name || 'HR Head';
    separations[idx].updated_at = now;

    this.setStore(SEPARATIONS_KEY, separations);

    this.logAudit(separationId, 'NOTICE_PERIOD_MODIFIED', sep.employee_id, oldVal, separations[idx], input.reason);

    return this.getSeparationById(separationId)!;
  }

  // --------------------------------------------------------------------------
  // Full & Final Readiness Reconciler
  // --------------------------------------------------------------------------
  async reconcileFnF(separationId: string): Promise<SeparationFnFReadiness> {
    const sep = this.getSeparationById(separationId);
    if (!sep) throw new Error('Separation not found');

    const fnfRecords = this.getStore<SeparationFnFReadiness>(SEPARATION_FNF_KEY, []);
    let fnf = fnfRecords.find(f => f.separation_id === separationId);

    // Cross-module query for live leave & attendance inputs
    const now = new Date().toISOString();
    if (!fnf) {
      fnf = {
        id: `fnf-rdy-${Date.now()}`,
        separation_id: separationId,
        employee_id: sep.employee_id,
        status: 'INPUTS_PENDING',
        worked_days: 22,
        lop_days: 0,
        leave_encashment_days: 12.0,
        notice_buyout_days: sep.notice_buyout_days || 0,
        notice_waiver_days: sep.notice_waiver_days || 0,
        asset_recovery_deduction: (sep.assets || []).reduce((sum, a) => sum + (a.financial_recovery_amount || 0), 0),
        outstanding_advances: 0,
        expense_claims_payable: 350,
        pending_salary_payable: 3800,
        gratuity_eligible: true,
        gratuity_amount: 3200,
        net_payable_estimated: 7350,
        created_at: now,
        updated_at: now,
      };
      fnfRecords.unshift(fnf);
    } else {
      fnf.notice_buyout_days = sep.notice_buyout_days || 0;
      fnf.notice_waiver_days = sep.notice_waiver_days || 0;
      fnf.asset_recovery_deduction = (sep.assets || []).reduce((sum, a) => sum + (a.financial_recovery_amount || 0), 0);
      fnf.updated_at = now;
    }

    this.setStore(SEPARATION_FNF_KEY, fnfRecords);
    return fnf;
  }

  async updateFnFStatus(
    separationId: string,
    status: FnFStatus,
    details?: Partial<SeparationFnFReadiness>
  ): Promise<SeparationFnFReadiness> {
    const fnfRecords = this.getStore<SeparationFnFReadiness>(SEPARATION_FNF_KEY, []);
    const idx = fnfRecords.findIndex(f => f.separation_id === separationId);
    if (idx === -1) throw new Error('F&F readiness record not found');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();

    fnfRecords[idx].status = status;
    if (details) {
      Object.assign(fnfRecords[idx], details);
    }
    if (status === 'APPROVED' || status === 'SETTLED') {
      fnfRecords[idx].approved_by = currentUser.name || 'Payroll Head';
      fnfRecords[idx].approved_at = now;
    }
    fnfRecords[idx].updated_at = now;

    this.setStore(SEPARATION_FNF_KEY, fnfRecords);

    this.logAudit(separationId, `FNF_STATUS_${status}`, fnfRecords[idx].employee_id, null, fnfRecords[idx]);

    hrEventBus.publish('fnf.ready', { separationId, status });

    return fnfRecords[idx];
  }

  // --------------------------------------------------------------------------
  // Complete Separation / Final Exit Execution
  // --------------------------------------------------------------------------
  async completeSeparation(
    separationId: string,
    options?: { allow_exception?: boolean; exception_reason?: string }
  ): Promise<EmployeeSeparation> {
    const sep = this.getSeparationById(separationId);
    if (!sep) throw new Error('Separation not found');

    // Blocker validation
    if (sep.blockers && sep.blockers.length > 0 && !options?.allow_exception) {
      throw new Error(`Cannot complete separation. Outstanding blockers: ${sep.blockers.join(', ')}`);
    }

    if (options?.allow_exception && !options?.exception_reason) {
      throw new Error('An explicit justification reason is required to complete separation with exception.');
    }

    const separations = this.getStore<EmployeeSeparation>(SEPARATIONS_KEY, []);
    const idx = separations.findIndex(s => s.id === separationId);
    if (idx === -1) throw new Error('Separation not found');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];

    separations[idx].status = 'COMPLETED';
    separations[idx].actual_last_working_date = todayStr;
    separations[idx].completed_at = now;
    separations[idx].approved_by = currentUser.name || 'HR Head';
    if (options?.allow_exception) {
      separations[idx].override_reason = options.exception_reason;
      separations[idx].override_by = currentUser.name || 'HR Head';
    }
    separations[idx].updated_at = now;

    this.setStore(SEPARATIONS_KEY, separations);

    // Update Employee master status in localStorage -> EXITED (Never delete employee!)
    const employees = this.getLocalEmployees();
    const empIdx = employees.findIndex(e => e.id === sep.employee_id);
    if (empIdx !== -1) {
      employees[empIdx].status = 'Exited' as any;
      (employees[empIdx] as any).employment_status = 'Separated';
      (employees[empIdx] as any).last_working_day = todayStr;
      this.setStore(EMPLOYEES_KEY, employees);
    }

    // Audit & Events
    this.logAudit(
      separationId,
      options?.allow_exception ? 'SEPARATION_COMPLETED_WITH_EXCEPTION' : 'SEPARATION_COMPLETED_SUCCESSFULLY',
      sep.employee_id,
      null,
      separations[idx],
      options?.exception_reason
    );

    hrEventBus.publish('access.revoked', { employeeId: sep.employee_id, accessStatus: 'REVOKED' });
    hrEventBus.publish('employee.exited', { employeeId: sep.employee_id, separationId, effectiveDate: todayStr });

    return this.getSeparationById(separationId)!;
  }

  // --------------------------------------------------------------------------
  // Resignation Withdrawal
  // --------------------------------------------------------------------------
  async withdrawResignation(separationId: string, reason: string): Promise<EmployeeSeparation> {
    const sep = this.getSeparationById(separationId);
    if (!sep) throw new Error('Separation not found');

    if (sep.status === 'COMPLETED') {
      throw new Error('Cannot withdraw an already completed separation.');
    }

    const separations = this.getStore<EmployeeSeparation>(SEPARATIONS_KEY, []);
    const idx = separations.findIndex(s => s.id === separationId);
    if (idx === -1) throw new Error('Separation not found');

    const oldVal = { ...separations[idx] };
    const now = new Date().toISOString();

    separations[idx].status = 'CANCELLED';
    separations[idx].retention_status = 'RETAINED';
    separations[idx].retention_notes = `Withdrawn by employee/HR: ${reason}`;
    separations[idx].updated_at = now;

    this.setStore(SEPARATIONS_KEY, separations);

    this.logAudit(separationId, 'RESIGNATION_WITHDRAWN', sep.employee_id, oldVal, separations[idx], reason);

    return this.getSeparationById(separationId)!;
  }

  // --------------------------------------------------------------------------
  // Summary Metrics Engine
  // Real SQL calculation equivalent
  // --------------------------------------------------------------------------
  getSummaryMetrics(): SeparationSummaryMetrics {
    const res = this.getSeparations({ limit: 1000 });
    const all = res.items;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = weekFromNow.toISOString().split('T')[0];

    const monthFromNow = new Date(today);
    monthFromNow.setDate(monthFromNow.getDate() + 30);
    const monthStr = monthFromNow.toISOString().split('T')[0];

    const activeNotice = all.filter(s => s.status === 'NOTICE_PERIOD').length;
    const pendingClearances = all.reduce((sum, s) => sum + (s.pending_clearances_count || 0), 0);
    const overdueClearances = all.reduce((sum, s) => sum + (s.overdue_clearances_count || 0), 0);

    const upcomingExitsWeek = all.filter(
      s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && s.expected_last_working_date <= weekStr
    ).length;

    const upcomingExitsMonth = all.filter(
      s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && s.expected_last_working_date <= monthStr
    ).length;

    const fnfPending = all.filter(
      s => s.fnf_readiness && (s.fnf_readiness.status === 'INPUTS_PENDING' || s.fnf_readiness.status === 'CALCULATION_IN_PROGRESS')
    ).length;

    const readyForExit = all.filter(s => s.is_ready_for_exit).length;

    const currentMonthPrefix = todayStr.substring(0, 7);
    const completedThisMonth = all.filter(
      s => s.status === 'COMPLETED' && s.actual_last_working_date?.startsWith(currentMonthPrefix)
    ).length;

    return {
      active_notice_period: activeNotice,
      pending_clearances: pendingClearances,
      overdue_clearances: overdueClearances,
      upcoming_exits_week: upcomingExitsWeek,
      upcoming_exits_month: upcomingExitsMonth,
      fnf_pending: fnfPending,
      ready_for_exit: readyForExit,
      completed_this_month: completedThisMonth,
    };
  }

  getAuditLogs(separationId: string): SeparationAuditLog[] {
    const logs = this.getStore<SeparationAuditLog>(SEPARATION_AUDIT_KEY, []);
    return logs.filter(l => l.separation_id === separationId);
  }
}

export const offboardingService = new OffboardingService();
