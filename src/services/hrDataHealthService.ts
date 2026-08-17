import { Employee, Department } from '../types';
import { MetricResponse } from './hrDomainFoundation';

export interface DataQualityReport {
  overallHealthScorePct: number;
  totalEmployees: number;
  missingManagerCount: number;
  missingDepartmentCount: number;
  missingPhoneCount: number;
  missingEmergencyContactCount: number;
  circularReportingIssuesCount: number;
  unresolvedActionItemsCount: number;
}

export const hrDataHealthService = {
  // Run automated data quality and governance checks
  getHealthReport(employees: Employee[]): MetricResponse<DataQualityReport> {
    const total = employees.length;
    let missingManager = 0;
    let missingDepartment = 0;
    let missingPhone = 0;
    let missingEmergency = 0;
    let circularIssues = 0;

    const empIdSet = new Set(employees.map((e) => e.id));

    employees.forEach((emp) => {
      // Missing reporting manager (unless designated as Head of HR or C-level top executive)
      const isTopExecutive = emp.designation_title?.toLowerCase().includes('head of human resources') ||
                             emp.designation_title?.toLowerCase().includes('ceo') ||
                             emp.designation_title?.toLowerCase().includes('managing director');

      if (!emp.employment?.reporting_manager_id && !isTopExecutive) {
        missingManager++;
      } else if (emp.employment?.reporting_manager_id && !empIdSet.has(emp.employment.reporting_manager_id)) {
        // Manager ID points to non-existent employee record
        missingManager++;
      }

      if (!emp.department_id) {
        missingDepartment++;
      }

      if (!emp.profile?.phone) {
        missingPhone++;
      }

      if (!emp.profile?.emergency_contacts || emp.profile.emergency_contacts.length === 0) {
        missingEmergency++;
      }

      // Check self-reporting circular loop
      if (emp.employment?.reporting_manager_id === emp.id) {
        circularIssues++;
      }
    });

    const totalIssues = missingManager + missingDepartment + missingEmergency + circularIssues;
    const healthScore = total > 0 ? Math.max(0, Math.round(((total - Math.min(total, totalIssues)) / total) * 100)) : 100;

    return {
      value: {
        overallHealthScorePct: healthScore,
        totalEmployees: total,
        missingManagerCount: missingManager,
        missingDepartmentCount: missingDepartment,
        missingPhoneCount: missingPhone,
        missingEmergencyContactCount: missingEmergency,
        circularReportingIssuesCount: circularIssues,
        unresolvedActionItemsCount: totalIssues,
      },
      period: 'current',
      source: 'Compliance',
      lastUpdated: new Date().toISOString(),
      dataAvailable: true,
    };
  },
};
