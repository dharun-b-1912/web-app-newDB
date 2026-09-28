// src/services/clientBilling/statutoryReconciliationService.ts
// ============================================================================
// JOY PeopleHR — Statutory Reconciliation & Anomaly Engine
// ============================================================================

import {
  BillingRun,
  ReconciliationExceptionRecord,
} from '../../types/clientBilling';

// ─── In-memory session cache (no localStorage) ───────────────────────────────
const STORAGE_KEYS = {
  EXCEPTIONS: 'statutory_exceptions',
};
const _store = new Map<string, any>();

export class StatutoryReconciliationService {
  private static getStorage<T>(key: string, fallback: T): T {
    return _store.has(key) ? _store.get(key) : fallback;
  }

  private static setStorage<T>(key: string, value: T): void {
    _store.set(key, value);
  }

  public static auditAndReconcileRun(run: BillingRun): {
    exceptions: ReconciliationExceptionRecord[];
    isCompliant: boolean;
    headcountMatchPct: number;
    pfVarianceAmt: number;
    esiVarianceAmt: number;
  } {
    const existingExceptions = this.getExceptionsForRun(run.id);
    const newExceptions: ReconciliationExceptionRecord[] = [];

    const {
      payroll_employee_count,
      billed_employee_count,
      payroll_employer_pf,
      billed_employer_pf,
      payroll_employer_esi,
      billed_employer_esi,
    } = run.reconciliation;

    // 1. Headcount Check
    if (payroll_employee_count !== billed_employee_count) {
      newExceptions.push({
        id: `exc-hc-${run.id}`,
        tenant_id: run.tenant_id,
        billing_run_id: run.id,
        exception_type: 'HEADCOUNT_MISMATCH',
        severity: 'CRITICAL',
        description: `Payroll headcount (${payroll_employee_count}) does not match billed headcount (${billed_employee_count})`,
        payroll_value: payroll_employee_count,
        billed_value: billed_employee_count,
        variance_amount: Math.abs(payroll_employee_count - billed_employee_count),
        status: 'OPEN',
        created_at: new Date().toISOString(),
      });
    }

    // 2. PF Variance Check (> ₹5 variance considered mismatch)
    const pfDiff = Math.abs(payroll_employer_pf - billed_employer_pf);
    if (pfDiff > 5) {
      newExceptions.push({
        id: `exc-pf-${run.id}`,
        tenant_id: run.tenant_id,
        billing_run_id: run.id,
        exception_type: 'PF_DISCREPANCY',
        severity: pfDiff > 100 ? 'CRITICAL' : 'WARNING',
        description: `Employer PF payroll ledger (₹${payroll_employer_pf}) differs from billed PF (₹${billed_employer_pf}) by ₹${pfDiff}`,
        payroll_value: payroll_employer_pf,
        billed_value: billed_employer_pf,
        variance_amount: pfDiff,
        status: 'OPEN',
        created_at: new Date().toISOString(),
      });
    }

    // 3. ESI Variance Check (> ₹5 variance considered mismatch)
    const esiDiff = Math.abs(payroll_employer_esi - billed_employer_esi);
    if (esiDiff > 5) {
      newExceptions.push({
        id: `exc-esi-${run.id}`,
        tenant_id: run.tenant_id,
        billing_run_id: run.id,
        exception_type: 'ESI_DISCREPANCY',
        severity: 'WARNING',
        description: `Employer ESI payroll ledger (₹${payroll_employer_esi}) differs from billed ESI (₹${billed_employer_esi}) by ₹${esiDiff}`,
        payroll_value: payroll_employer_esi,
        billed_value: billed_employer_esi,
        variance_amount: esiDiff,
        status: 'OPEN',
        created_at: new Date().toISOString(),
      });
    }

    // Merge with existing exceptions while preserving resolution notes
    const merged = newExceptions.map((ne) => {
      const found = existingExceptions.find((ee) => ee.id === ne.id);
      return found ? found : ne;
    });

    this.saveExceptionsForRun(run.id, merged);

    const openCritical = merged.filter((e) => e.severity === 'CRITICAL' && e.status === 'OPEN');
    const headcountMatchPct = payroll_employee_count > 0
      ? Math.round((Math.min(payroll_employee_count, billed_employee_count) / Math.max(payroll_employee_count, billed_employee_count)) * 100)
      : 100;

    return {
      exceptions: merged,
      isCompliant: openCritical.length === 0,
      headcountMatchPct,
      pfVarianceAmt: pfDiff,
      esiVarianceAmt: esiDiff,
    };
  }

  public static getExceptionsForRun(runId: string): ReconciliationExceptionRecord[] {
    const all = this.getStorage<ReconciliationExceptionRecord[]>(STORAGE_KEYS.EXCEPTIONS, []);
    return all.filter((e) => e.billing_run_id === runId);
  }

  public static saveExceptionsForRun(runId: string, exceptions: ReconciliationExceptionRecord[]): void {
    const all = this.getStorage<ReconciliationExceptionRecord[]>(STORAGE_KEYS.EXCEPTIONS, []);
    const others = all.filter((e) => e.billing_run_id !== runId);
    this.setStorage(STORAGE_KEYS.EXCEPTIONS, [...others, ...exceptions]);
  }

  public static resolveException(
    exceptionId: string,
    resolutionNotes: string,
    action: 'RESOLVED' | 'OVERRIDDEN',
    author: string
  ): void {
    const all = this.getStorage<ReconciliationExceptionRecord[]>(STORAGE_KEYS.EXCEPTIONS, []);
    const updated = all.map((e) => {
      if (e.id === exceptionId) {
        return {
          ...e,
          status: action,
          resolution_notes: resolutionNotes,
          resolved_by: author,
          resolved_at: new Date().toISOString(),
        };
      }
      return e;
    });
    this.setStorage(STORAGE_KEYS.EXCEPTIONS, updated);
  }
}
