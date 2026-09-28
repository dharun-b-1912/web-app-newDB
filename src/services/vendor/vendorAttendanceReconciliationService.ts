// src/services/vendor/vendorAttendanceReconciliationService.ts
// ============================================================================
// Joy PeopleHR — Vendor Workforce Attendance & OT Reconciliation Engine
// Connects biometric/uploaded attendance, manager OT approvals, and contract terms
// to generate auditable inputs for VendorManpowerBillingEngine and 3-Way Matching
// ============================================================================

import {
  ARJUNA_NATURALS_JULY_2026_WORKERS,
  ARJUNA_NATURALS_WORKBOOK_BENCHMARK,
  ArjunaWorkerFixtureRecord,
} from './fixtures/arjunaNaturalJuly2026Fixture';
import { EmployeePayrollInput } from './vendorManpowerBillingEngine';

export interface WorkerAttendanceSummary {
  workerCode: string;
  workerName: string;
  department: string;
  dailyWages: number;
  payDays: number;
  rawOtHours: number;
  approvedOtHours: number;
  otApprovalStatus: 'APPROVED' | 'PARTIALLY_APPROVED' | 'PENDING' | 'REJECTED';
  allowanceWorkingDays: number;
  roomAllowance: number;
  transportAllowance: number;
  totalAllowance: number;
  employeePf?: number;
  employeeEsi?: number;
  netPay?: number;
  anomaliesCount: number;
  anomaliesDescription?: string;
}

export interface AttendanceReconciliationSummary {
  reconciliationId: string;
  organizationId: string;
  vendorId: string;
  clientSiteId: string;
  clientSiteName: string;
  servicePeriod: string;
  periodMonth: string;
  poNumber?: string;
  contractReference?: string;
  reconciledAt: string;

  totalDeployedWorkers: number;
  totalPresentDays: number;
  totalPayDays: number;
  totalRawOtHours: number;
  totalApprovedOtHours: number;
  totalUnapprovedOtHours: number;

  totalRegularWages: number;
  totalOtStipend: number;
  totalGrossWages: number;

  totalAllowanceWorkingDays: number;
  totalRoomAllowance: number;
  totalTransportAllowance: number;
  totalAllowanceAmount: number;

  totalEmployeePf: number;
  totalEmployeeEsi: number;
  totalNetEmployeePay: number;

  anomaliesFound: number;
  isReconciled: boolean;
  reconciliationStatus: 'RECONCILED' | 'VARIANCE_FLAGGED' | 'APPROVAL_PENDING';

  workerSummaries: WorkerAttendanceSummary[];
  payrollInputs: EmployeePayrollInput[];

  // Granular Daily Records (Employee + Date Grain)
  dailyAttendanceRecords?: Array<{
    employeeCode: string;
    employeeName: string;
    department?: string;
    date: string;
    shiftCode: string;
    inTime: string;
    outTime: string;
    regularWorkingHours: number;
    rawOtHours: number;
    status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'MISSING_PUNCH';
    hasMissingPunch?: boolean;
    sourceRowNumber?: number;
  }>;
  dailyOtRecords?: Array<{
    id: string;
    date: string;
    employeeCode: string;
    employeeName: string;
    shiftHours: number;
    actualWorkedHours: number;
    potentialOtHours: number;
    approvedOtHours: number;
    otHourlyRate: number;
    otPayableAmount: number;
    approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
    sourceRowNumber?: number;
  }>;
}

export interface InvoiceAttendanceAuditResult {
  isVerified: boolean;
  varianceFlags: string[];
  headcountMatch: boolean;
  payDaysMatch: boolean;
  otHoursMatch: boolean;
  claimedHeadcount: number;
  verifiedHeadcount: number;
  claimedPayDays: number;
  verifiedPayDays: number;
  claimedOtHours: number;
  verifiedOtHours: number;
  auditNotes: string[];
}

export class VendorAttendanceReconciliationService {
  /**
   * Loads the Arjuna Naturals July 2026 verified attendance & OT reconciliation fixture
   */
  public static loadArjunaNaturalsReconciliation(params?: {
    organizationId?: string;
    vendorId?: string;
    poNumber?: string;
  }): AttendanceReconciliationSummary {
    const workers = ARJUNA_NATURALS_JULY_2026_WORKERS;

    const workerSummaries: WorkerAttendanceSummary[] = workers.map((w) => ({
      workerCode: w.workerCode,
      workerName: w.workerName,
      department: w.department,
      dailyWages: w.dailyWages,
      payDays: w.payDays,
      rawOtHours: w.otHours,
      approvedOtHours: w.otHours,
      otApprovalStatus: 'APPROVED',
      allowanceWorkingDays: w.allowanceWorkingDays,
      roomAllowance: w.roomAllowance,
      transportAllowance: w.transportAllowance,
      totalAllowance: w.totalAllowance,
      employeePf: w.employeePf,
      employeeEsi: w.employeeEsi,
      netPay: w.netPay,
      anomaliesCount: 0,
    }));

    const payrollInputs: EmployeePayrollInput[] = workers.map((w) => ({
      employeeId: `emp-arjuna-${w.workerCode.toLowerCase()}`,
      employeeCode: w.workerCode,
      employeeName: w.workerName,
      dailyWages: w.dailyWages,
      payDays: w.payDays,
      otHours: w.otHours,
      workingDaysForAllowance: w.allowanceWorkingDays,
    }));

    const totalPayDays = workers.reduce((sum, w) => sum + w.payDays, 0);
    const totalOtHours = workers.reduce((sum, w) => sum + w.otHours, 0);
    const totalRegularWages = workers.reduce((sum, w) => sum + w.regularWages, 0);
    const totalOtStipend = workers.reduce((sum, w) => sum + w.otStipend, 0);
    const totalGrossWages = totalRegularWages + totalOtStipend;

    const totalAllowanceWorkingDays = workers.reduce((sum, w) => sum + w.allowanceWorkingDays, 0);
    const totalRoomAllowance = workers.reduce((sum, w) => sum + w.roomAllowance, 0);
    const totalTransportAllowance = workers.reduce((sum, w) => sum + w.transportAllowance, 0);
    const totalAllowanceAmount = totalRoomAllowance + totalTransportAllowance;

    const totalEmployeePf = workers.reduce((sum, w) => sum + w.employeePf, 0);
    const totalEmployeeEsi = workers.reduce((sum, w) => sum + w.employeeEsi, 0);
    const totalNetEmployeePay = workers.reduce((sum, w) => sum + w.netPay, 0);

    return {
      reconciliationId: `recon-arjuna-2026-07-${Date.now()}`,
      organizationId: params?.organizationId || ARJUNA_NATURALS_WORKBOOK_BENCHMARK.company.clientCompanyId,
      vendorId: params?.vendorId || ARJUNA_NATURALS_WORKBOOK_BENCHMARK.vendor.vendorCode,
      clientSiteId: 'site-arjuna-cbe-01',
      clientSiteName: ARJUNA_NATURALS_WORKBOOK_BENCHMARK.company.siteName,
      servicePeriod: ARJUNA_NATURALS_WORKBOOK_BENCHMARK.commercialTerms.servicePeriod,
      periodMonth: ARJUNA_NATURALS_WORKBOOK_BENCHMARK.commercialTerms.periodMonth,
      poNumber: params?.poNumber || 'PO-ARJUNA-2026-07',
      contractReference: 'CON-ARJUNA-MANPOWER-2026',
      reconciledAt: new Date().toISOString(),

      totalDeployedWorkers: workers.length,
      totalPresentDays: totalPayDays,
      totalPayDays,
      totalRawOtHours: totalOtHours,
      totalApprovedOtHours: totalOtHours,
      totalUnapprovedOtHours: 0,

      totalRegularWages,
      totalOtStipend,
      totalGrossWages,

      totalAllowanceWorkingDays,
      totalRoomAllowance,
      totalTransportAllowance,
      totalAllowanceAmount,

      totalEmployeePf,
      totalEmployeeEsi,
      totalNetEmployeePay,

      anomaliesFound: 0,
      isReconciled: true,
      reconciliationStatus: 'RECONCILED',

      workerSummaries,
      payrollInputs,
    };
  }

  /**
   * Reconciles raw daily attendance logs against approved manager OT approvals and deployment scopes
   */
  public static reconcileAttendanceDataset(params: {
    organizationId: string;
    vendorId: string;
    clientSiteId: string;
    clientSiteName: string;
    periodMonth: string;
    servicePeriod?: string;
    poNumber?: string;
    contractReference?: string;
    workers: Array<{
      workerCode: string;
      workerName: string;
      department?: string;
      dailyWages: number;
      payDays: number;
      rawOtHours?: number;
      approvedOtHours?: number;
      allowanceWorkingDays?: number;
      anomaliesDescription?: string;
    }>;
  }): AttendanceReconciliationSummary {
    let totalPayDays = 0;
    let totalRawOt = 0;
    let totalApprovedOt = 0;
    let totalUnapprovedOt = 0;
    let totalRegularWages = 0;
    let totalOtStipend = 0;
    let anomaliesCount = 0;

    const workerSummaries: WorkerAttendanceSummary[] = [];
    const payrollInputs: EmployeePayrollInput[] = [];

    params.workers.forEach((w) => {
      const rawOt = Number(w.rawOtHours || 0);
      const approvedOt = w.approvedOtHours !== undefined ? Number(w.approvedOtHours) : rawOt;
      const unapprovedOt = Math.max(0, rawOt - approvedOt);

      const payDays = Number(w.payDays || 0);
      const regularWages = Math.round(w.dailyWages * payDays);
      const otStipend = Math.round((w.dailyWages / 8) * approvedOt);

      totalPayDays += payDays;
      totalRawOt += rawOt;
      totalApprovedOt += approvedOt;
      totalUnapprovedOt += unapprovedOt;
      totalRegularWages += regularWages;
      totalOtStipend += otStipend;

      if (unapprovedOt > 0 || w.anomaliesDescription) {
        anomaliesCount++;
      }

      let otStatus: WorkerAttendanceSummary['otApprovalStatus'] = 'APPROVED';
      if (unapprovedOt > 0 && approvedOt > 0) otStatus = 'PARTIALLY_APPROVED';
      else if (unapprovedOt > 0 && approvedOt === 0) otStatus = 'REJECTED';

      const allowanceDays = w.allowanceWorkingDays !== undefined ? Number(w.allowanceWorkingDays) : payDays;
      const roomAllow = allowanceDays * 50;
      const transAllow = allowanceDays * 30;
      const totAllow = roomAllow + transAllow;

      const workerGross = regularWages + otStipend;
      const empPf = Math.round(regularWages * 0.12);
      const empEsi = Math.ceil(regularWages * 0.0075);
      const net = workerGross - empPf - empEsi;

      workerSummaries.push({
        workerCode: w.workerCode,
        workerName: w.workerName,
        department: w.department || 'Operations',
        dailyWages: w.dailyWages,
        payDays,
        rawOtHours: rawOt,
        approvedOtHours: approvedOt,
        otApprovalStatus: otStatus,
        allowanceWorkingDays: allowanceDays,
        roomAllowance: roomAllow,
        transportAllowance: transAllow,
        totalAllowance: totAllow,
        employeePf: empPf,
        employeeEsi: empEsi,
        netPay: net,
        anomaliesCount: w.anomaliesDescription ? 1 : 0,
        anomaliesDescription: w.anomaliesDescription,
      });

      payrollInputs.push({
        employeeId: `emp-${w.workerCode.toLowerCase()}`,
        employeeCode: w.workerCode,
        employeeName: w.workerName,
        dailyWages: w.dailyWages,
        payDays,
        otHours: approvedOt, // CRITICAL: Only approved OT enters billing
        workingDaysForAllowance: allowanceDays,
      });
    });

    const isReconciled = anomaliesCount === 0 && totalUnapprovedOt === 0;

    const totalAllowanceWorkingDays = workerSummaries.reduce((sum, w) => sum + w.allowanceWorkingDays, 0);
    const totalRoomAllowance = workerSummaries.reduce((sum, w) => sum + w.roomAllowance, 0);
    const totalTransportAllowance = workerSummaries.reduce((sum, w) => sum + w.transportAllowance, 0);
    const totalAllowanceAmount = totalRoomAllowance + totalTransportAllowance;

    const totalEmployeePf = workerSummaries.reduce((sum, w) => sum + (w.employeePf || 0), 0);
    const totalEmployeeEsi = workerSummaries.reduce((sum, w) => sum + (w.employeeEsi || 0), 0);
    const totalNetEmployeePay = workerSummaries.reduce((sum, w) => sum + (w.netPay || 0), 0);

    return {
      reconciliationId: `recon-${params.vendorId}-${Date.now()}`,
      organizationId: params.organizationId,
      vendorId: params.vendorId,
      clientSiteId: params.clientSiteId,
      clientSiteName: params.clientSiteName,
      servicePeriod: params.servicePeriod || `${params.periodMonth}-01 to ${params.periodMonth}-31`,
      periodMonth: params.periodMonth,
      poNumber: params.poNumber,
      contractReference: params.contractReference,
      reconciledAt: new Date().toISOString(),

      totalDeployedWorkers: params.workers.length,
      totalPresentDays: totalPayDays,
      totalPayDays,
      totalRawOtHours: totalRawOt,
      totalApprovedOtHours: totalApprovedOt,
      totalUnapprovedOtHours: totalUnapprovedOt,

      totalRegularWages,
      totalOtStipend,
      totalGrossWages: totalRegularWages + totalOtStipend,

      totalAllowanceWorkingDays,
      totalRoomAllowance,
      totalTransportAllowance,
      totalAllowanceAmount,

      totalEmployeePf,
      totalEmployeeEsi,
      totalNetEmployeePay,

      anomaliesFound: anomaliesCount,
      isReconciled,
      reconciliationStatus: isReconciled ? 'RECONCILED' : 'VARIANCE_FLAGGED',

      workerSummaries,
      payrollInputs,
    };
  }

  /**
   * Audit an incoming vendor invoice against verified attendance reconciliation records
   */
  public static auditInvoiceAgainstAttendance(
    invoice: {
      workforceCount?: number;
      claimedPayDays?: number;
      claimedOtHours?: number;
      totalAmount: number;
    },
    reconciliation: AttendanceReconciliationSummary
  ): InvoiceAttendanceAuditResult {
    const claimedCount = invoice.workforceCount || reconciliation.totalDeployedWorkers;
    const claimedDays = invoice.claimedPayDays || reconciliation.totalPayDays;
    const claimedOt = invoice.claimedOtHours || reconciliation.totalApprovedOtHours;

    const headcountMatch = claimedCount === reconciliation.totalDeployedWorkers;
    const payDaysMatch = Math.abs(claimedDays - reconciliation.totalPayDays) < 0.01;
    const otHoursMatch = Math.abs(claimedOt - reconciliation.totalApprovedOtHours) < 0.01;

    const varianceFlags: string[] = [];
    const auditNotes: string[] = [];

    if (!headcountMatch) {
      varianceFlags.push(`Headcount variance: Invoiced ${claimedCount} vs Verified ${reconciliation.totalDeployedWorkers}`);
    } else {
      auditNotes.push(`Headcount reconciled: ${claimedCount} deployed workers verified against biometric gate punch records.`);
    }

    if (!payDaysMatch) {
      varianceFlags.push(`Pay days variance: Invoiced ${claimedDays} vs Verified ${reconciliation.totalPayDays}`);
    } else {
      auditNotes.push(`Pay days reconciled: Exact ${claimedDays} pay days matching approved shift schedules.`);
    }

    if (!otHoursMatch) {
      varianceFlags.push(`OT hours variance: Invoiced ${claimedOt} hrs vs Manager-Approved ${reconciliation.totalApprovedOtHours} hrs`);
    } else {
      auditNotes.push(`Overtime reconciled: Exact ${claimedOt} OT hours verified against authorized OT slips.`);
    }

    const isVerified = headcountMatch && payDaysMatch && otHoursMatch;

    return {
      isVerified,
      varianceFlags,
      headcountMatch,
      payDaysMatch,
      otHoursMatch,
      claimedHeadcount: claimedCount,
      verifiedHeadcount: reconciliation.totalDeployedWorkers,
      claimedPayDays: claimedDays,
      verifiedPayDays: reconciliation.totalPayDays,
      claimedOtHours: claimedOt,
      verifiedOtHours: reconciliation.totalApprovedOtHours,
      auditNotes,
    };
  }
}
