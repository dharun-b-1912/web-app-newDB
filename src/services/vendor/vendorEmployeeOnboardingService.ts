// src/services/vendor/vendorEmployeeOnboardingService.ts
// ============================================================================
// Joy People HR — Workforce Onboarding & Effective-Dated Deployment Engine
// Maps employee lifecycle, statutory identity, reporting hierarchy, and client site
// ============================================================================

import { WorkforceOnboardingPayload, EmployeeDeploymentMapping } from '../../types/vendorPortal';

export interface ValidatedWorkerResult {
  valid: boolean;
  errors: string[];
  employeeRecord?: any;
  deploymentMapping?: EmployeeDeploymentMapping;
}

export class VendorEmployeeOnboardingService {
  /**
   * Validates employee onboarding payload
   */
  public static validatePayload(payload: WorkforceOnboardingPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.employeeCode?.trim()) errors.push('Employee Code is required.');
    if (!payload.firstName?.trim()) errors.push('First Name is required.');
    if (!payload.lastName?.trim()) errors.push('Last Name is required.');
    if (!payload.joiningDate) errors.push('Date of Joining is required.');
    if (!payload.mobileNumber || payload.mobileNumber.length < 10) errors.push('Valid 10-digit Mobile Number is required.');
    if (!payload.aadhaarNumberMasked || payload.aadhaarNumberMasked.length < 4) errors.push('Aadhaar Reference is required.');

    if (!payload.deployment?.clientCompanyId) errors.push('Assigned Client Company is required.');
    if (!payload.deployment?.siteName) errors.push('Assigned Client Site is required.');
    if (!payload.deployment?.contractCode) errors.push('Contract Reference is required.');
    if (!payload.deployment?.reportingManagerName) errors.push('Operations Manager / Reporting Manager is required.');
    if (!payload.deployment?.assignedShift) errors.push('Assigned Shift is required.');

    if (!payload.banking?.accountNumber) errors.push('Bank Account Number is required.');
    if (!payload.banking?.ifscCode) errors.push('Bank IFSC Code is required.');

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Transforms validated payload into workforce directory record and active deployment mapping
   */
  public static processOnboarding(payload: WorkforceOnboardingPayload): ValidatedWorkerResult {
    const validation = this.validatePayload(payload);
    if (!validation.valid) {
      return { valid: false, errors: validation.errors };
    }

    const employeeId = `emp_${payload.vendorId}_${payload.employeeCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const now = new Date().toISOString();

    const employeeRecord = {
      id: employeeId,
      organizationId: payload.organizationId,
      vendorId: payload.vendorId,
      employeeCode: payload.employeeCode.toUpperCase(),
      name: `${payload.firstName} ${payload.lastName}`,
      role: payload.designation || 'Field Technician',
      skill: payload.skillCategory,
      site: payload.deployment.siteName,
      clientCompanyId: payload.deployment.clientCompanyId,
      clientCompanyName: payload.deployment.clientCompanyName,
      reportingManager: payload.deployment.reportingManagerName,
      tlSupervisor: payload.deployment.teamLeaderName || 'Direct to Manager',
      status: 'ACTIVE' as const,
      gender: payload.gender,
      joiningDate: payload.joiningDate,
      mobileNumber: payload.mobileNumber,
      aadhaarMasked: payload.aadhaarNumberMasked,
      panMasked: payload.panMasked,
      esiNumber: payload.esiNumber,
      uanNumber: payload.uanNumber,
      bankAccount: {
        accountNumberMasked: payload.banking.accountNumber.slice(-4).padStart(payload.banking.accountNumber.length, '•'),
        bankName: payload.banking.bankName,
        ifscCode: payload.banking.ifscCode,
      },
      createdAt: now,
    };

    const deploymentMapping: EmployeeDeploymentMapping = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: payload.organizationId,
      employeeId: employeeId,
      vendorId: payload.vendorId,
      clientCompanyId: payload.deployment.clientCompanyId,
      clientCompanyName: payload.deployment.clientCompanyName,
      siteName: payload.deployment.siteName,
      contractCode: payload.deployment.contractCode,
      department: payload.deployment.department || 'Operations',
      assignedShift: payload.deployment.assignedShift,
      reportingManagerId: payload.deployment.reportingManagerId || 'mgr_default',
      reportingManagerName: payload.deployment.reportingManagerName,
      teamLeaderId: payload.deployment.teamLeaderId,
      teamLeaderName: payload.deployment.teamLeaderName,
      effectiveFrom: payload.joiningDate,
      status: 'ACTIVE',
    };

    // Synchronize to VendorWorkforceService store
    try {
      const { VendorWorkforceService } = require('./vendorWorkforceService');
      const workerRecord = {
        id: `wrk-${employeeId}`,
        vendorId: payload.vendorId,
        organizationId: payload.organizationId,
        employeeId: employeeId,
        workerCode: payload.employeeCode.toUpperCase(),
        firstName: payload.firstName,
        lastName: payload.lastName,
        fullName: `${payload.firstName} ${payload.lastName}`.trim(),
        email: payload.email || undefined,
        phone: payload.mobileNumber,
        designation: payload.designation || 'Field Technician',
        department: payload.deployment?.department || 'Operations',
        skillLevel: (payload.skillCategory === 'HIGHLY_SKILLED' ? 'Highly Skilled' :
                    payload.skillCategory === 'SEMI_SKILLED' ? 'Semi-Skilled' :
                    payload.skillCategory === 'UNSKILLED' ? 'Unskilled' : 'Skilled') as any,
        workLocation: payload.deployment?.siteName || 'Client Worksite',
        siteId: payload.deployment?.siteName,
        contractReference: payload.deployment?.contractCode,
        joiningDate: payload.joiningDate,
        dailyWageRate: 0,
        monthlyBaseSalary: 0,
        overtimeEligible: true,
        complianceStatus: 'COMPLIANT' as const,
        status: 'ACTIVE' as const,
        createdAt: now,
        updatedAt: now,
      };
      VendorWorkforceService.saveWorkerToLocalStore(workerRecord);
    } catch (wErr) {
      // Fallback safe
    }

    return {
      valid: true,
      errors: [],
      employeeRecord,
      deploymentMapping,
    };
  }

  /**
   * Validates and persists employee record into canonical database and vendor workforce directory
   */
  public static async processAndPersistOnboarding(payload: WorkforceOnboardingPayload): Promise<ValidatedWorkerResult> {
    const result = this.processOnboarding(payload);
    if (!result.valid || !result.employeeRecord) {
      return result;
    }

    try {
      const { api } = await import('../api');
      const employeeId = result.employeeRecord.id;
      const existing = await api.getEmployeeById(employeeId);
      if (!existing) {
        await api.createEmployee({
          id: employeeId,
          organization_id: payload.organizationId,
          employee_code: payload.employeeCode.toUpperCase(),
          first_name: payload.firstName,
          last_name: payload.lastName,
          display_name: `${payload.firstName} ${payload.lastName}`.trim(),
          work_email: payload.email || `worker.${payload.employeeCode.toLowerCase()}@vendor.com`,
          phone: payload.mobileNumber,
          status: 'Active',
          employment_type: 'Full Time',
          employment_source: 'VENDOR',
          vendor_id: payload.vendorId,
          vendor_employee_code: payload.employeeCode.toUpperCase(),
          client_company_id: payload.deployment.clientCompanyId,
          site_id: payload.deployment.siteName,
          employment: {
            doj: payload.joiningDate,
            employment_type: 'Full Time',
            employment_source: 'VENDOR',
            vendor_id: payload.vendorId,
            vendor_employee_code: payload.employeeCode.toUpperCase(),
            vendor_contract_id: payload.deployment.contractCode,
            client_company_id: payload.deployment.clientCompanyId,
            site_id: payload.deployment.siteName,
            work_location: payload.deployment.siteName,
            reporting_manager_id: payload.deployment.reportingManagerId,
            reporting_manager_name: payload.deployment.reportingManagerName,
            team_lead_id: payload.deployment.teamLeaderId,
            team_lead_name: payload.deployment.teamLeaderName,
          },
          bank: {
            bank_name: payload.banking.bankName,
            account_number: payload.banking.accountNumber,
            ifsc: payload.banking.ifscCode,
            account_holder_name: `${payload.firstName} ${payload.lastName}`.trim(),
            account_type: 'SALARY',
          },
          statutory: {
            pan: payload.panMasked,
            uan: payload.uanNumber,
            esi_number: payload.esiNumber,
            pf_applicable: true,
            esi_applicable: true,
            pt_applicable: true,
          },
        });
      }
    } catch (syncErr) {
      console.warn('[VendorEmployeeOnboardingService] Error syncing to master employee:', syncErr);
    }

    return result;
  }
}
