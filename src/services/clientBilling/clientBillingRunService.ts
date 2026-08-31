// src/services/clientBilling/clientBillingRunService.ts
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — Client Billing Run Service
// ============================================================================

import {
  BillingRun,
  BillingRunStatus,
} from '../../types/clientBilling';
import {
  ClientBillingEngine,
  EmployeeAttendanceInput,
  EmployeeSalaryMasterInput,
} from './clientBillingEngine';
import { ClientMasterService } from './clientMasterService';
import { api } from '../api';
import { payrollApi } from '../payrollApi';

const STORAGE_KEY = 'joy_client_billing_runs_list';
const INVOICE_SEQ_KEY = 'joy_client_invoice_sequence_counter';

export class ClientBillingRunService {
  private static getStorageRuns(): BillingRun[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static setStorageRuns(runs: BillingRun[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    } catch (_) {}
  }

  /**
   * Get all client billing runs, optionally filtered by client, contract or period
   */
  public static async getBillingRuns(params?: {
    clientId?: string;
    contractId?: string;
    period?: string;
    status?: BillingRunStatus;
  }): Promise<BillingRun[]> {
    let runs = this.getStorageRuns();

    // If initial run list is empty, initialize default seed runs for active contracts
    if (runs.length === 0) {
      const clients = ClientMasterService.getClients();
      const contracts = ClientMasterService.getContracts();

      if (clients.length > 0 && contracts.length > 0) {
        const initialRun = await this.createAndCalculateRun(
          clients[0].id,
          contracts[0].id,
          'August 2026',
          '2026-08-01',
          '2026-08-31'
        );
        runs = [initialRun];
      }
    }

    if (params?.clientId) {
      runs = runs.filter((r) => r.client_id === params.clientId);
    }
    if (params?.contractId) {
      runs = runs.filter((r) => r.contract_id === params.contractId);
    }
    if (params?.period) {
      runs = runs.filter((r) => r.period === params.period);
    }
    if (params?.status) {
      runs = runs.filter((r) => r.status === params.status);
    }

    return runs;
  }

  public static async getBillingRunById(runId: string): Promise<BillingRun | undefined> {
    const runs = await this.getBillingRuns();
    return runs.find((r) => r.id === runId);
  }

  /**
   * Create and immediately calculate a Billing Run for a Client & Contract
   */
  public static async createAndCalculateRun(
    clientId: string,
    contractId: string,
    period: string = 'August 2026',
    startDate: string = '2026-08-01',
    endDate: string = '2026-08-31'
  ): Promise<BillingRun> {
    const client = ClientMasterService.getClientById(clientId);
    if (!client) throw new Error(`Client with ID ${clientId} not found`);

    const contract = ClientMasterService.getContractById(contractId);
    if (!contract) throw new Error(`Contract with ID ${contractId} not found`);

    const policy = ClientMasterService.getBillingPolicy(clientId, contractId);
    const rules = ClientMasterService.getBillingRules(contractId);
    const deployments = await ClientMasterService.getDeployments(contractId);

    // Fetch actual database employees to build attendance and salary inputs
    const attendanceMap = new Map<string, EmployeeAttendanceInput>();
    const salaryMap = new Map<string, EmployeeSalaryMasterInput>();

    try {
      const emps = await api.getEmployees();
      const runs = payrollApi.getPayrollRuns();
      const matchedRun = runs.find((r) => r.pay_period === period);
      const payrollRecords = matchedRun?.employee_records || [];

      for (let i = 0; i < deployments.length; i++) {
        const dep = deployments[i];
        const empRec = emps.find((e) => e.id === dep.employee_id);
        const payRec = payrollRecords.find((p) => p.employee_id === dep.employee_id);

        // Derive Attendance from actual payroll records or standard full month
        const calendarDays = 31;
        const presentDays = payRec ? payRec.present_days ?? 26 : 25 + (i % 3);
        const paidLeaves = payRec ? payRec.paid_leave_days ?? 1 : 1;
        const paidHolidays = 1;
        const weeklyOffs = 4;
        const lopDays = payRec ? payRec.lop_days ?? 0 : (i % 5 === 0 ? 1 : 0);
        const otHours = payRec ? payRec.overtime_hours ?? 0 : (i % 2 === 0 ? 16 : 8);

        attendanceMap.set(dep.employee_id, {
          employee_id: dep.employee_id,
          calendar_days: calendarDays,
          present_days: presentDays,
          paid_leaves: paidLeaves,
          paid_holidays: paidHolidays,
          weekly_offs: weeklyOffs,
          lop_days: lopDays,
          ot_hours: otHours,
        });

        // Derive Salary Master details
        const baseSalary = dep.monthly_fixed_wage || empRec?.employment?.monthly_ctc || (empRec?.employment?.annual_ctc ? Math.round(empRec.employment.annual_ctc / 12) : 19500);
        salaryMap.set(dep.employee_id, {
          employee_id: dep.employee_id,
          monthly_ctc: baseSalary,
          monthly_basic: Math.round(baseSalary * 0.5),
          monthly_da: Math.round(baseSalary * 0.1),
          monthly_hra: Math.round(baseSalary * 0.2),
          monthly_special_allowance: Math.round(baseSalary * 0.2),
          attendance_bonus_threshold_days: 26,
          attendance_bonus_amount: 1000,
          incentive_amount: i % 3 === 0 ? 1500 : 0,
          arrears_amount: 0,
          advance_deduction: i % 4 === 0 ? 1000 : 0,
          canteen_deduction: contract.canteen_rate_per_employee || 600,
          uniform_deduction: 0,
          tds_deduction: 0,
        });
      }
    } catch (_) {}

    // Execute Pure Calculation
    const calcResult = ClientBillingEngine.calculateBillingRun(
      client,
      contract,
      policy,
      rules,
      deployments,
      attendanceMap,
      salaryMap
    );

    const runNumber = `RUN-${Date.now().toString().slice(-6)}`;
    const newRun: BillingRun = {
      id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      tenant_id: 'org-joy-01',
      run_number: runNumber,
      client_id: client.id,
      client_name: client.legal_name,
      contract_id: contract.id,
      contract_number: contract.contract_number,
      contract_name: contract.contract_name,
      period: period,
      period_start_date: startDate,
      period_end_date: endDate,
      status: 'CALCULATED',

      active_employee_count: calcResult.active_employee_count,
      total_payable_days: calcResult.total_payable_days,
      total_ot_hours: calcResult.total_ot_hours,

      total_employee_gross_earnings: calcResult.total_employee_gross_earnings,
      total_employee_recoveries: calcResult.total_employee_recoveries,
      total_employee_net_salary: calcResult.total_employee_net_salary,

      total_gross_billable_wages: calcResult.total_gross_billable_wages,
      total_employer_pf: calcResult.total_employer_pf,
      total_employer_esi: calcResult.total_employer_esi,
      total_employer_statutory: calcResult.total_employer_statutory,

      total_service_charges: calcResult.total_service_charges,
      total_transport_charges: calcResult.total_transport_charges,
      total_other_charges: calcResult.total_other_charges,
      total_canteen_recoveries: calcResult.total_canteen_recoveries,

      taxable_amount: calcResult.taxable_amount,
      tax_summary: calcResult.tax_summary,

      line_items: calcResult.line_items,
      employee_results: calcResult.employee_results,
      reconciliation: calcResult.reconciliation,
      validation: calcResult.validation,
      explainability: calcResult.explainability,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const runs = this.getStorageRuns();
    runs.unshift(newRun);
    this.setStorageRuns(runs);

    return newRun;
  }

  /**
   * Recalculate an existing Billing Run
   */
  public static async recalculateRun(runId: string): Promise<BillingRun> {
    const existing = await this.getBillingRunById(runId);
    if (!existing) throw new Error(`Billing Run ${runId} not found`);

    if (existing.status === 'APPROVED' || existing.status === 'INVOICE_GENERATED' || existing.status === 'PAID') {
      throw new Error(`Cannot recalculate locked / approved billing run (${existing.status}). Historical snapshot is frozen.`);
    }

    const calculated = await this.createAndCalculateRun(
      existing.client_id,
      existing.contract_id,
      existing.period,
      existing.period_start_date,
      existing.period_end_date
    );

    // Keep the same ID and Run Number
    const updated: BillingRun = {
      ...calculated,
      id: existing.id,
      run_number: existing.run_number,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };

    const runs = this.getStorageRuns().map((r) => (r.id === existing.id ? updated : r));
    this.setStorageRuns(runs);

    return updated;
  }

  /**
   * Generate Next Sequence Invoice Number
   */
  public static generateNextInvoiceNumber(clientCode: string, prefix: string = 'JCS/2026-27/'): string {
    let currentSeq = 1;
    try {
      const stored = localStorage.getItem(INVOICE_SEQ_KEY);
      if (stored) currentSeq = parseInt(stored, 10) + 1;
      localStorage.setItem(INVOICE_SEQ_KEY, currentSeq.toString());
    } catch (_) {}

    const padded = String(currentSeq).padStart(3, '0');
    return `${prefix}${padded}`;
  }

  /**
   * Approve Billing Run, lock calculations, and generate Official Tax Invoice
   */
  public static async approveAndGenerateInvoice(
    runId: string,
    approvedBy: string = 'Finance Manager'
  ): Promise<BillingRun> {
    const run = await this.getBillingRunById(runId);
    if (!run) throw new Error(`Billing Run ${runId} not found`);

    if (!run.validation.is_valid) {
      throw new Error('Cannot approve billing run with unresolved pre-invoice validation errors.');
    }

    const client = ClientMasterService.getClientById(run.client_id);
    const policy = ClientMasterService.getBillingPolicy(run.client_id, run.contract_id);
    const invoiceNumber = this.generateNextInvoiceNumber(
      client?.client_code || 'CLI',
      policy.invoice_prefix || 'JCS/2026-27/'
    );

    const now = new Date().toISOString();
    const dueDate = new Date(Date.now() + (client?.credit_period_days || 30) * 86400000).toISOString().split('T')[0];

    // Freeze complete calculation snapshot
    const frozenSnapshot = JSON.stringify({
      run_number: run.run_number,
      client: client,
      tax_summary: run.tax_summary,
      line_items: run.line_items,
      employee_results: run.employee_results,
      reconciliation: run.reconciliation,
      explainability: run.explainability,
      snapshot_timestamp: now,
    });

    const updated: BillingRun = {
      ...run,
      status: 'APPROVED',
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: dueDate,
      approved_by: approvedBy,
      approved_at: now,
      billing_snapshot_data: frozenSnapshot,
      updated_at: now,
    };

    const runs = this.getStorageRuns().map((r) => (r.id === runId ? updated : r));
    this.setStorageRuns(runs);

    return updated;
  }

  /**
   * Update Status of a Billing Run (e.g. DRAFT -> AUDIT_REVIEW -> FINANCE_REVIEW)
   */
  public static async updateRunStatus(runId: string, newStatus: BillingRunStatus): Promise<BillingRun> {
    const run = await this.getBillingRunById(runId);
    if (!run) throw new Error(`Billing Run ${runId} not found`);

    const updated: BillingRun = {
      ...run,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const runs = this.getStorageRuns().map((r) => (r.id === runId ? updated : r));
    this.setStorageRuns(runs);

    return updated;
  }

  /**
   * Delete Draft Billing Run
   */
  public static async deleteBillingRun(runId: string): Promise<void> {
    const run = await this.getBillingRunById(runId);
    if (!run) return;

    if (run.status === 'APPROVED' || run.status === 'INVOICE_GENERATED' || run.status === 'PAID') {
      throw new Error(`Cannot delete an approved/invoiced billing run for audit compliance.`);
    }

    const runs = this.getStorageRuns().filter((r) => r.id !== runId);
    this.setStorageRuns(runs);
  }
}
