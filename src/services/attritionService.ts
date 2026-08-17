import { Employee } from '../types';
import { MetricResponse } from './hrDomainFoundation';

export interface AttritionMetrics {
  overallAttritionRatePct: number;
  voluntaryAttritionCount: number;
  involuntaryAttritionCount: number;
  totalExitsCount: number;
  averageTenureYears: number;
  topDepartmentExits: { departmentId: string; departmentName: string; exitCount: number; attritionPct: number }[];
}

export const attritionService = {
  // Compute authoritative attrition metrics
  getAttritionMetrics(employees: Employee[]): MetricResponse<AttritionMetrics> {
    const total = employees.length;
    const noticeEmployees = employees.filter((e) => e.status === 'Notice Period');
    const exitedEmployees = employees.filter((e) => e.status === 'Exited' || e.status === 'Terminated' || e.status === 'Resigned');

    const totalExits = noticeEmployees.length + exitedEmployees.length;
    const voluntary = totalExits;
    const involuntary = 0;

    // Rate = (Exits / Total) * 100
    const attritionRate = total > 0 && totalExits > 0 ? Number(((totalExits / total) * 100).toFixed(1)) : 0;

    // Calculate average tenure in years
    let totalTenureDays = 0;
    let tenureCount = 0;
    const now = new Date();

    employees.forEach((emp) => {
      const doj = emp.employment?.doj || emp.created_at;
      if (doj) {
        const joinDate = new Date(doj);
        const diffMs = now.getTime() - joinDate.getTime();
        if (diffMs > 0) {
          totalTenureDays += diffMs / (1000 * 60 * 60 * 24);
          tenureCount++;
        }
      }
    });

    const averageTenureYears = tenureCount > 0 ? Number(((totalTenureDays / tenureCount) / 365.25).toFixed(1)) : 0;

    // Top department exits
    const deptExitsMap = new Map<string, { name: string; count: number; totalInDept: number }>();
    employees.forEach((emp) => {
      const deptId = emp.department_id || 'unassigned';
      const deptName = emp.department_name || 'Unassigned';
      const curr = deptExitsMap.get(deptId) || { name: deptName, count: 0, totalInDept: 0 };
      curr.totalInDept += 1;
      if (emp.status === 'Notice Period' || emp.status === 'Exited') {
        curr.count += 1;
      }
      deptExitsMap.set(deptId, curr);
    });

    const topDepartmentExits = Array.from(deptExitsMap.entries()).map(([deptId, data]) => ({
      departmentId: deptId,
      departmentName: data.name,
      exitCount: data.count,
      attritionPct: data.totalInDept > 0 ? Number(((data.count / data.totalInDept) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.exitCount - a.exitCount);

    return {
      value: {
        overallAttritionRatePct: attritionRate,
        voluntaryAttritionCount: voluntary,
        involuntaryAttritionCount: involuntary,
        totalExitsCount: totalExits,
        averageTenureYears,
        topDepartmentExits,
      },
      period: 'current',
      source: 'Employee Master',
      lastUpdated: new Date().toISOString(),
      dataAvailable: total > 0,
    };
  },
};
