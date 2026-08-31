import { Employee } from '../types';

export interface ManagerSpanItem {
  managerId: string;
  managerName: string;
  avatarUrl?: string;
  departmentName: string;
  designationTitle: string;
  directReportsCount: number;
  totalTeamSize: number;
  directReports: Employee[];
}

export const reportingHierarchyService = {
  // Get direct reports for a specific manager
  getDirectReports(managerId: string, employees: Employee[]): Employee[] {
    return employees.filter((e) => e.employment?.reporting_manager_id === managerId);
  },

  // Get operational reports for a specific team lead
  getTeamLeadReports(teamLeadId: string, employees: Employee[]): Employee[] {
    return employees.filter((e) => e.employment?.team_lead_id === teamLeadId);
  },

  // Resolve an employee's full management line (Team Lead, Reporting Manager, Secondary Manager)
  getSupervisors(employeeId: string, employees: Employee[]): {
    reportingManager?: Employee;
    secondaryManager?: Employee;
    teamLead?: Employee;
  } {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return {};

    const reportingManager = emp.employment?.reporting_manager_id
      ? employees.find((e) => e.id === emp.employment?.reporting_manager_id)
      : undefined;

    const secondaryManager = emp.employment?.secondary_manager_id
      ? employees.find((e) => e.id === emp.employment?.secondary_manager_id)
      : undefined;

    const teamLead = emp.employment?.team_lead_id
      ? employees.find((e) => e.id === emp.employment?.team_lead_id)
      : undefined;

    return { reportingManager, secondaryManager, teamLead };
  },

  // Recursively compute total team size (direct + indirect reports)
  getTotalTeam(managerId: string, employees: Employee[], visited = new Set<string>()): Employee[] {
    if (visited.has(managerId)) return []; // Prevent infinite circular loop
    visited.add(managerId);

    const direct = this.getDirectReports(managerId, employees);
    let totalTeam = [...direct];

    for (const report of direct) {
      const subReports = this.getTotalTeam(report.id, employees, visited);
      totalTeam = totalTeam.concat(subReports);
    }

    return totalTeam;
  },

  // Calculate manager spans across the organization
  getManagerSpans(employees: Employee[]): ManagerSpanItem[] {
    // Identify all active employees who are managers or have reports
    const managerIdsWithReports = new Set(
      employees.map((e) => e.employment?.reporting_manager_id).filter(Boolean) as string[]
    );

    const managers = employees.filter(
      (e) =>
        (!e.status || e.status === 'Active') &&
        (managerIdsWithReports.has(e.id) ||
          e.designation_title?.toLowerCase().includes('manager') ||
          e.designation_title?.toLowerCase().includes('lead') ||
          e.designation_title?.toLowerCase().includes('head') ||
          e.designation_title?.toLowerCase().includes('director') ||
          e.designation_title?.toLowerCase().includes('vp'))
    );

    return managers.map((mgr) => {
      const direct = this.getDirectReports(mgr.id, employees);
      const totalTeam = this.getTotalTeam(mgr.id, employees);

      return {
        managerId: mgr.id,
        managerName: `${mgr.first_name || ''} ${mgr.last_name || ''}`,
        avatarUrl: mgr.avatar_url,
        departmentName: mgr.department_name || 'Department',
        designationTitle: mgr.designation_title || 'Lead / Manager',
        directReportsCount: direct.length,
        totalTeamSize: totalTeam.length,
        directReports: direct,
      };
    }).sort((a, b) => b.totalTeamSize - a.totalTeamSize);
  },
};
