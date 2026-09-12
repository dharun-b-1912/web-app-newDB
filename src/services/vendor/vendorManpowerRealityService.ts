// src/services/vendor/vendorManpowerRealityService.ts
// ============================================================================
// Joy PeopleHR — Vendor Manpower & 3-Way Match Settlement Reality Service
// Gate 14B: Vendor Onboarding, Contractor Workers, Biometric Man-Days & 3-Way Match
// ============================================================================

export interface VendorContract {
  contractId: string;
  vendorId: string;
  vendorName: string;
  organizationId: string;
  companyId: string;
  siteId: string;
  siteName: string;
  contractCode: string;
  tradeSkill: string;
  ratePerManDay: number; // e.g., ₹600.00 / 8-hr shift
  overtimeRatePerHour: number; // e.g., ₹75.00 / hr
  validFrom: string;
  validTo: string;
  maxWorkersAllocated: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
}

export interface VendorWorkerKYC {
  workerId: string;
  vendorId: string;
  vendorName: string;
  fullName: string;
  workerCode: string;
  aadhaarMasked: string;
  mobile: string;
  tradeSkill: string;
  emergencyContact: string;
  biometricCardId: string;
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  isInternalEmployee: false; // Invariant: Vendor workers are NEVER internal employees
}

export interface VendorDeploymentRoster {
  deploymentId: string;
  contractId: string;
  siteId: string;
  workerId: string;
  workerCode: string;
  workerName: string;
  deploymentDate: string;
  shiftCode: string;
  punchInTime?: string;
  punchOutTime?: string;
  verifiedWorkingHours: number;
  verifiedOvertimeHours: number;
  manDaysCalculated: number; // e.g. 1.0, 0.5, 0.0
  biometricVerificationStatus: 'VERIFIED_HARDWARE' | 'MANUAL_REGULARIZATION' | 'ABSENT';
}

export interface ThreeWayMatchResult {
  matchId: string;
  invoiceId: string;
  contractId: string;
  vendorId: string;
  billingMonth: string;
  biometricApprovedManDays: number;
  biometricApprovedOtHours: number;
  contractRatePerManDay: number;
  contractOtRatePerHour: number;
  systemCalculatedManpowerCost: number;
  systemCalculatedOtCost: number;
  totalSystemPayable: number;
  vendorClaimedAmount: number;
  varianceAmount: number;
  matchStatus: 'EXACT_MATCH' | 'VARIANCE_FLAGGED' | 'REJECTED';
  isApprovedForSettlement: boolean;
  clearanceTimestamp?: string;
}

export class VendorManpowerRealityService {
  /**
   * Evaluates Daily Biometric Man-Days from Ingested Device Punches
   */
  public static calculateWorkerManDay(params: {
    punchInIso?: string;
    punchOutIso?: string;
    standardShiftHours?: number;
  }): {
    workingHours: number;
    otHours: number;
    manDays: number;
    status: 'PRESENT' | 'HALF_DAY' | 'ABSENT';
  } {
    if (!params.punchInIso || !params.punchOutIso) {
      return { workingHours: 0, otHours: 0, manDays: 0, status: 'ABSENT' };
    }

    const inTime = new Date(params.punchInIso).getTime();
    const outTime = new Date(params.punchOutIso).getTime();
    const durationHours = Math.max((outTime - inTime) / (1000 * 60 * 60), 0);

    const shiftHours = params.standardShiftHours || 8.0;
    let otHours = 0;
    if (durationHours > shiftHours) {
      otHours = Math.round((durationHours - shiftHours) * 10) / 10;
    }

    if (durationHours >= 7.5) {
      return { workingHours: durationHours, otHours, manDays: 1.0, status: 'PRESENT' };
    } else if (durationHours >= 4.0) {
      return { workingHours: durationHours, otHours: 0, manDays: 0.5, status: 'HALF_DAY' };
    } else {
      return { workingHours: durationHours, otHours: 0, manDays: 0.0, status: 'ABSENT' };
    }
  }

  /**
   * Executes Commercial 3-Way Match Verification
   * Compares (Biometric Attendance Man-Days) vs (Contract PO Rate) vs (Vendor Submitted Invoice)
   */
  public static executeThreeWayMatch(params: {
    invoiceId: string;
    contract: VendorContract;
    deployments: VendorDeploymentRoster[];
    vendorClaimedAmount: number;
    billingMonth: string;
  }): ThreeWayMatchResult {
    let totalManDays = 0;
    let totalOtHours = 0;

    for (const d of params.deployments) {
      if (d.biometricVerificationStatus === 'VERIFIED_HARDWARE') {
        totalManDays += d.manDaysCalculated;
        totalOtHours += d.verifiedOvertimeHours;
      }
    }

    const systemManpowerCost = totalManDays * params.contract.ratePerManDay;
    const systemOtCost = totalOtHours * params.contract.overtimeRatePerHour;
    const totalSystemPayable = systemManpowerCost + systemOtCost;

    const variance = Math.round((params.vendorClaimedAmount - totalSystemPayable) * 100) / 100;
    const isExact = Math.abs(variance) <= 0.05; // Maximum ₹0.05 rounding tolerance

    return {
      matchId: `3WM-${params.invoiceId}`,
      invoiceId: params.invoiceId,
      contractId: params.contract.contractId,
      vendorId: params.contract.vendorId,
      billingMonth: params.billingMonth,
      biometricApprovedManDays: totalManDays,
      biometricApprovedOtHours: totalOtHours,
      contractRatePerManDay: params.contract.ratePerManDay,
      contractOtRatePerHour: params.contract.overtimeRatePerHour,
      systemCalculatedManpowerCost: systemManpowerCost,
      systemCalculatedOtCost: systemOtCost,
      totalSystemPayable,
      vendorClaimedAmount: params.vendorClaimedAmount,
      varianceAmount: variance,
      matchStatus: isExact ? 'EXACT_MATCH' : 'VARIANCE_FLAGGED',
      isApprovedForSettlement: isExact,
      clearanceTimestamp: isExact ? new Date().toISOString() : undefined,
    };
  }

  /**
   * Validates Isolation Barrier: Vendor Workers can never access internal employee records
   */
  public static validateWorkerAccessBoundary(worker: VendorWorkerKYC, requestedResource: string): {
    allowed: boolean;
    reason: string;
  } {
    const forbiddenInternalResources = [
      'INTERNAL_EMPLOYEE_PAYROLL',
      'INTERNAL_EMPLOYEE_PAYSLIP',
      'COMPANY_ADMIN_SETTINGS',
      'EMPLOYEE_HR_DIRECTORY',
      'PLATFORM_ADMIN_CONTROL',
    ];

    if (forbiddenInternalResources.includes(requestedResource)) {
      return {
        allowed: false,
        reason: `FORBIDDEN_WORKFORCE_BOUNDARY: Vendor worker (${worker.workerCode}) cannot access ${requestedResource}.`,
      };
    }

    return { allowed: true, reason: 'Authorized vendor workforce access.' };
  }
}
