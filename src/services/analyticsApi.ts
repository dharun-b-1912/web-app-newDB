import { MetricCatalogItem, CustomReportDefinition, ScheduledReportItem } from '../types/analytics';

const metricCatalog: MetricCatalogItem[] = [
  { id: 'met-01', metric_code: 'ATTRITION_RATE', name: 'Annual Attrition Rate', description: 'Percentage of employee exits divided by average active headcount during period', formula: '(Total Exits / Average Active Headcount) * 100', source_module: 'CoreHR', period: 'Annual (YTD)', visibility: 'HR_Only', version: 'v2.1' },
  { id: 'met-02', metric_code: 'TIME_TO_HIRE', name: 'Average Time to Hire', description: 'Calendar days elapsed from requisition approval to offer acceptance', formula: 'Offer Acceptance Date - Requisition Approval Date', source_module: 'Recruitment', period: 'Quarterly', visibility: 'HR_Only', version: 'v1.4' },
  { id: 'met-03', metric_code: 'ATTENDANCE_RATE', name: 'Attendance Rate', description: 'Percentage of expected working days present', formula: '(Days Present / Expected Working Days) * 100', source_module: 'Attendance', period: 'Monthly', visibility: 'Public', version: 'v1.0' },
  { id: 'met-04', metric_code: 'COST_PER_EMP', name: 'Total Known Cost per Employee', description: 'Total workforce cost (Payroll + Travel + Training) divided by headcount', formula: '(Total Payroll + Travel + Training) / Headcount', source_module: 'Payroll', period: 'Monthly', visibility: 'Finance_Only', version: 'v3.0' },
];

const customReports: CustomReportDefinition[] = [
  { id: 'rep-101', report_code: 'REP-PAYROLL-YTD', name: 'YTD Gross Payroll & Statutory Deductions Ledger', dataset: 'Payroll', fields: ['emp_id', 'name', 'department', 'gross_salary', 'pf_deduction', 'net_salary'], group_by: 'department', aggregation: 'Sum', visualization: 'Table', created_at: '2026-08-01' },
  { id: 'rep-102', report_code: 'REP-ATTENDANCE-DEPT', name: 'Department Attendance & Overtime Hours Audit', dataset: 'Attendance', fields: ['department', 'attendance_rate', 'overtime_hours', 'wfh_days'], group_by: 'department', aggregation: 'Average', visualization: 'BarChart', created_at: '2026-08-05' },
];

const scheduledReports: ScheduledReportItem[] = [
  { id: 'sch-1', report_name: 'Monthly Executive CEO Workforce Health Summary', frequency: 'Monthly', recipient_roles: ['CEO', 'HR Head'], channel: 'Email', last_run: '2026-08-01 08:00 AM', next_run: '2026-09-01 08:00 AM', status: 'Active' },
  { id: 'sch-2', report_name: 'Weekly Department Attendance & Overtime Alert', frequency: 'Weekly', recipient_roles: ['HR Head', 'Finance Head'], channel: 'CommunicationHub', last_run: '2026-08-10 09:00 AM', next_run: '2026-08-17 09:00 AM', status: 'Active' },
];

export const analyticsApi = {
  getMetricCatalog(): MetricCatalogItem[] {
    return metricCatalog;
  },
  getCustomReports(): CustomReportDefinition[] {
    return customReports;
  },
  getScheduledReports(): ScheduledReportItem[] {
    return scheduledReports;
  },
  getExecutiveKpis() {
    return {
      totalEmployees: 428,
      activeHeadcount: 416,
      newHiresYtd: 38,
      exitsYtd: 18,
      attritionRate: 4.2,
      openPositions: 14,
      avgTimeToHireDays: 22,
      attendanceRate: 96.4,
      absenceRate: 3.6,
      leaveUtilizationPct: 78.5,
      monthlyPayrollLakhs: 570,
      overtimeCostMonthly: 425000,
      avgPerformanceRating: 4.35,
      trainingCompletionPct: 91.8,
      certificationCompliancePct: 97.2,
      engagementEnps: '+68 eNPS',
      openHelpdeskTickets: 14,
    };
  },
};
