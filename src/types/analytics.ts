export interface MetricCatalogItem {
  id: string;
  metric_code: string;
  name: string;
  description: string;
  formula: string;
  source_module: 'CoreHR' | 'Recruitment' | 'Attendance' | 'Leave' | 'Payroll' | 'Performance' | 'Training' | 'Travel' | 'Helpdesk' | 'Engagement';
  period: string;
  visibility: 'Public' | 'HR_Only' | 'Finance_Only' | 'CEO_Only';
  version: string;
}

export interface DashboardFilterState {
  date_range: 'Today' | 'ThisWeek' | 'ThisMonth' | 'ThisQuarter' | 'ThisYear' | 'FY2026';
  company_id?: string;
  department_name?: string;
  location_name?: string;
}

export interface CustomReportDefinition {
  id: string;
  report_code: string;
  name: string;
  dataset: 'Employees' | 'Attendance' | 'Payroll' | 'Recruitment' | 'Performance' | 'Training' | 'Travel' | 'Helpdesk';
  fields: string[];
  group_by: string;
  aggregation: 'Count' | 'Sum' | 'Average' | 'Percentage';
  visualization: 'Table' | 'BarChart' | 'AreaChart' | 'PieChart' | 'KpiCard';
  created_at: string;
}

export interface ScheduledReportItem {
  id: string;
  report_name: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  recipient_roles: string[];
  channel: 'Email' | 'InApp' | 'CommunicationHub';
  last_run: string;
  next_run: string;
  status: 'Active' | 'Paused';
}
