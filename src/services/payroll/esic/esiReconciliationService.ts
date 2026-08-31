// src/services/payroll/esic/esiReconciliationService.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — ESIC IP Population Reconciliation Engine
// Reconciles Payroll ESI Population against Registered ESIC IP Master List
// ============================================================================

import {
  ESICRegisteredIPMaster,
  ESICReconciliationItem,
  ESICReconciliationSummary,
  ESICReconciliationStatus,
} from '../../../types/esicCompliance';
import { EmployeePayrollInput } from '../../../types/payroll';

export class ESIReconciliationService {
  /**
   * Reconcile active payroll ESI records against registered ESIC IP master
   */
  public static reconcilePopulation(params: {
    tenantId: string;
    payPeriod: string;
    payrollRecords: EmployeePayrollInput[];
    esicMasterIPs: ESICRegisteredIPMaster[];
  }): ESICReconciliationSummary {
    const { tenantId, payPeriod, payrollRecords, esicMasterIPs } = params;
    const items: ESICReconciliationItem[] = [];

    const masterMap = new Map<string, ESICRegisteredIPMaster>();
    esicMasterIPs.forEach(ip => masterMap.set(ip.ip_number.trim(), ip));

    // Track IP frequencies to detect duplicates
    const ipCounts = new Map<string, number>();
    payrollRecords.forEach(rec => {
      if (rec.esic_employee > 0 || rec.gross_fixed <= 21000) {
        const ip = (rec.pan_number || '').trim(); // or IP field from statutory profile
        if (ip) ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
      }
    });

    let matchedCount = 0;
    let missingFromEsicCount = 0;
    let missingFromPayrollCount = 0;
    let nameMismatchCount = 0;
    let duplicateIpCount = 0;
    let invalidIpCount = 0;
    let blockingCount = 0;

    const processedIps = new Set<string>();

    // 1. Process all active payroll employees with ESI applicability
    for (const emp of payrollRecords) {
      // If employee is eligible or has ESI deduction/wage
      const isEsiApplicable = emp.esic_employee > 0 || emp.gross_fixed <= 21000;
      if (!isEsiApplicable) continue;

      // Extract IP number (standard 10 digits)
      const rawIp = (emp.account_number?.length === 10 ? emp.account_number : '5610' + emp.employee_code.replace(/\D/g, '').padStart(6, '0'));
      const ip = rawIp.trim();
      processedIps.add(ip);

      const isValidFormat = /^\d{10}$/.test(ip);
      const isDuplicate = (ipCounts.get(ip) || 0) > 1;
      const masterRecord = masterMap.get(ip);

      let status: ESICReconciliationStatus = 'MATCHED';
      let nameMatch = false;
      let isBlocking = false;
      let action = 'Ready for upload';
      let exceptionMsg: string | undefined;

      if (!isValidFormat) {
        status = 'INVALID_IP';
        isBlocking = true;
        invalidIpCount++;
        action = 'Correct IP format in employee profile (must be exactly 10 digits)';
        exceptionMsg = `Invalid IP Number: "${ip}". ESIC requires exactly 10 numeric digits.`;
      } else if (isDuplicate) {
        status = 'DUPLICATE_IP';
        isBlocking = true;
        duplicateIpCount++;
        action = 'Resolve duplicate IP mapping across employees';
        exceptionMsg = `Duplicate IP: ${ip} is mapped to multiple employees.`;
      } else if (!masterRecord) {
        status = 'MISSING_FROM_ESIC';
        isBlocking = true;
        missingFromEsicCount++;
        action = 'Register employee on ESIC portal to add to employer IP list';
        exceptionMsg = `IP ${ip} not found in ESIC Employer Master list.`;
      } else {
        // Master record found: check name spelling
        const empNameClean = emp.employee_name.toLowerCase().replace(/[^a-z ]/g, '').trim();
        const masterNameClean = masterRecord.registered_ip_name.toLowerCase().replace(/[^a-z ]/g, '').trim();
        
        nameMatch = empNameClean === masterNameClean || empNameClean.includes(masterNameClean) || masterNameClean.includes(empNameClean);

        if (!nameMatch) {
          status = 'NAME_MISMATCH';
          nameMismatchCount++;
          action = 'Review name spelling against ESIC registered name or add statutory override';
          exceptionMsg = `Name Mismatch: Payroll "${emp.employee_name}" vs ESIC Master "${masterRecord.registered_ip_name}".`;
        } else {
          status = 'MATCHED';
          matchedCount++;
        }
      }

      if (isBlocking) blockingCount++;

      items.push({
        id: `rec-${emp.employee_id}`,
        employee_id: emp.employee_id,
        employee_code: emp.employee_code,
        payroll_name: emp.employee_name,
        ip_number: ip,
        esic_registered_name: masterRecord?.registered_ip_name,
        status,
        name_match: nameMatch,
        ip_match: !!masterRecord,
        payroll_status: 'Active',
        esic_status: masterRecord ? 'Registered' : 'Not Found',
        coverage_status: 'COVERED',
        recommended_action: action,
        exception_message: exceptionMsg,
        is_blocking: isBlocking,
      });
    }

    // 2. Identify Registered IPs in ESIC Master missing from this month's payroll
    for (const master of esicMasterIPs) {
      if (!processedIps.has(master.ip_number.trim())) {
        missingFromPayrollCount++;
        items.push({
          id: `rec-ext-${master.ip_number}`,
          ip_number: master.ip_number,
          esic_registered_name: master.registered_ip_name,
          status: 'MISSING_FROM_PAYROLL',
          name_match: false,
          ip_match: true,
          payroll_status: 'Not Found',
          esic_status: 'Registered',
          coverage_status: 'OUT_OF_COVERAGE',
          recommended_action: 'Supply zero-wage reason (e.g. Left Service / On Leave) or map employee',
          exception_message: `IP ${master.ip_number} (${master.registered_ip_name}) exists in ESIC Master but was not processed in payroll.`,
          is_blocking: false, // Allowed as zero-wage row
        });
      }
    }

    return {
      tenant_id: tenantId,
      pay_period: payPeriod,
      total_payroll_esi_employees: items.filter(i => i.payroll_status === 'Active').length,
      total_esic_master_ips: esicMasterIPs.length,
      matched_count: matchedCount,
      missing_from_esic_count: missingFromEsicCount,
      missing_from_payroll_count: missingFromPayrollCount,
      name_mismatch_count: nameMismatchCount,
      duplicate_ip_count: duplicateIpCount,
      invalid_ip_count: invalidIpCount,
      is_ready_for_upload: blockingCount === 0,
      blocking_exceptions_count: blockingCount,
      items,
    };
  }
}
