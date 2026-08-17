import { Employee, Department, Branch, Location } from '../types';
import { HRQueryContext, MetricResponse } from './hrDomainFoundation';

export interface DepartmentHeadcountItem {
  departmentId: string;
  departmentName: string;
  count: number;
  pct: number;
}

export interface LocationHeadcountItem {
  locationId: string;
  locationName: string;
  count: number;
  pct: number;
}

export interface DimensionalHeadcountItem {
  label: string;
  count: number;
  pct: number;
}

export const headcountService = {
  // Filter employees according to common query context
  filterEmployees(employees: Employee[], context?: HRQueryContext): Employee[] {
    if (!context) return employees;

    return employees.filter((emp) => {
      if (context.companyId && emp.company_id && context.companyId !== 'ALL') {
        const c1 = context.companyId.toLowerCase().replace(/[^a-z0-9]/g, '');
        const c2 = emp.company_id.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (c1 !== c2 && !c1.includes(c2) && !c2.includes(c1) && emp.company_id !== 'comp-joy-01') {
          return false;
        }
      }
      if (context.departmentId && context.departmentId !== 'ALL' && emp.department_id !== context.departmentId) return false;
      if (context.branchId && context.branchId !== 'ALL' && emp.branch_id !== context.branchId) return false;
      if (context.locationId && context.locationId !== 'ALL' && emp.branch_id !== context.locationId) return false;
      if (context.employmentType && context.employmentType !== 'ALL' && emp.employment_type !== context.employmentType) return false;
      if (context.status && context.status !== 'ALL' && emp.status !== context.status) return false;
      if (context.workMode && context.workMode !== 'ALL' && emp.employment?.work_mode !== context.workMode) return false;
      if (context.managerId && context.managerId !== 'ALL' && emp.employment?.reporting_manager_id !== context.managerId) return false;

      if (context.search?.trim()) {
        const q = context.search.toLowerCase();
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
        const code = (emp.employee_code || '').toLowerCase();
        const dept = (emp.department_name || '').toLowerCase();
        const desig = (emp.designation_title || '').toLowerCase();
        const city = (emp.branch_name || '').toLowerCase();
        if (!fullName.includes(q) && !code.includes(q) && !dept.includes(q) && !desig.includes(q) && !city.includes(q)) {
          return false;
        }
      }

      return true;
    });
  },

  // Point-in-time active workforce formula: Joined on or before asOfDate AND not exited before asOfDate
  getPointInTimeHeadcount(asOfDate: string, employees: Employee[]): number {
    return employees.filter((emp) => {
      const doj = emp.employment?.doj || emp.created_at?.slice(0, 10);
      if (!doj || doj > asOfDate) return false;

      // If exited, check whether exit date was on or before asOfDate
      if (emp.status === 'Exited' || emp.status === 'Terminated' || emp.status === 'Resigned') {
        const exitDate = emp.updated_at?.slice(0, 10);
        if (exitDate && exitDate <= asOfDate) return false;
      }

      return true;
    }).length;
  },

  // Authoritative Total Headcount Metric
  getTotalHeadcount(employees: Employee[], context?: HRQueryContext): MetricResponse<number> {
    const scoped = this.filterEmployees(employees, context);
    const total = scoped.length;

    return {
      value: total,
      previousValue: Math.max(0, total),
      change: 0,
      changePercent: 0,
      period: context?.period || 'current',
      source: 'Employee Master',
      lastUpdated: new Date().toISOString(),
      dataAvailable: total > 0,
    };
  },

  // Authoritative Active Headcount Metric
  getActiveHeadcount(employees: Employee[], context?: HRQueryContext): MetricResponse<number> {
    const scoped = this.filterEmployees(employees, context);
    const active = scoped.filter(
      (e) => !e.status || e.status === 'Active' || e.status === 'Confirmed' || e.status === 'Probation'
    ).length;

    return {
      value: active,
      previousValue: active,
      change: 0,
      changePercent: 0,
      period: context?.period || 'current',
      source: 'Employee Master',
      lastUpdated: new Date().toISOString(),
      dataAvailable: active > 0,
    };
  },

  // Headcount by Department
  getHeadcountByDepartment(departments: Department[], employees: Employee[], context?: HRQueryContext): DepartmentHeadcountItem[] {
    const scoped = this.filterEmployees(employees, context);
    const total = scoped.length;

    return departments.map((dept) => {
      const count = scoped.filter((e) => e.department_id === dept.id).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        count,
        pct,
      };
    }).sort((a, b) => b.count - a.count);
  },

  // Headcount by Location / Branch
  getHeadcountByLocation(branches: Branch[], employees: Employee[], context?: HRQueryContext): LocationHeadcountItem[] {
    const scoped = this.filterEmployees(employees, context);
    const total = scoped.length;

    if (branches.length === 0) {
      return [{ locationId: 'loc-default', locationName: 'Headquarters', count: total, pct: total > 0 ? 100 : 0 }];
    }

    return branches.map((b) => {
      const count = scoped.filter((e) => e.branch_id === b.id).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        locationId: b.id,
        locationName: b.city || b.name,
        count,
        pct,
      };
    });
  },

  // Headcount by Employment Type (Full Time, Contract, Intern, etc.)
  getHeadcountByEmploymentType(employees: Employee[], context?: HRQueryContext): DimensionalHeadcountItem[] {
    const scoped = this.filterEmployees(employees, context);
    const total = scoped.length;
    const types = ['Full Time', 'Contract', 'Intern', 'Consultant', 'Part Time'];

    return types.map((t) => {
      const count = scoped.filter((e) => e.employment_type === t).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        label: t === 'Full Time' ? 'Permanent' : t,
        count,
        pct,
      };
    });
  },

  // Headcount by Work Mode (Office, Hybrid, Remote, Field)
  getHeadcountByWorkMode(employees: Employee[], context?: HRQueryContext): DimensionalHeadcountItem[] {
    const scoped = this.filterEmployees(employees, context);
    const total = scoped.length;
    const modes = ['Office', 'Hybrid', 'Remote', 'Field'];

    return modes.map((m) => {
      const count = scoped.filter((e) => e.employment?.work_mode === m).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        label: m,
        count,
        pct,
      };
    });
  },
};
