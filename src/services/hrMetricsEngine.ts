import { api } from './api';
import { attendanceApi } from './attendanceApi';
import { leaveApi } from './leaveApi';
import { atsService } from './atsService';
import { Employee, Department, Branch, Location, Designation } from '../types';
import { AttendanceDaily } from '../types/attendance';
import { LeaveRequest } from '../types/leave';
import { JobOpening } from '../types/ats';

// Core Domain Engines
import { HRQueryContext, MetricResponse } from './hrDomainFoundation';
import { headcountService, DepartmentHeadcountItem, LocationHeadcountItem, DimensionalHeadcountItem } from './headcountService';
import { reportingHierarchyService, ManagerSpanItem } from './reportingHierarchyService';
import { workforceStatusEngine, DailyWorkforceStatusSnapshot } from './workforceStatusEngine';
import { workforceMovementEngine, WorkforceMovementMetrics } from './workforceMovementEngine';
import { attritionService, AttritionMetrics } from './attritionService';
import { hrDataHealthService, DataQualityReport } from './hrDataHealthService';

export interface UnifiedWorkforceOverviewBundle {
  totalCount: MetricResponse<number>;
  activeCount: MetricResponse<number>;
  dailyStatus: DailyWorkforceStatusSnapshot;
  movement: WorkforceMovementMetrics;
  departmentDistribution: DepartmentHeadcountItem[];
  locationDistribution: LocationHeadcountItem[];
  employmentMix: DimensionalHeadcountItem[];
  workModes: DimensionalHeadcountItem[];
  managerHierarchy: ManagerSpanItem[];
  dataHealth: MetricResponse<DataQualityReport>;
  scopedEmployees: Employee[];
  departments: Department[];
  branches: Branch[];
  locations: Location[];
  attendanceRecords: AttendanceDaily[];
  leaveRequests: LeaveRequest[];
  jobOpenings: JobOpening[];
}

export interface UnifiedExecutiveOverviewBundle {
  headcount: MetricResponse<number>;
  growthRatePct: number | null;
  attritionMetrics: MetricResponse<AttritionMetrics>;
  workforceCostTotal: number | null;
  newHiresCount: number;
  exitsCount: number;
  openPositionsCount: number;
  complianceHealth: MetricResponse<DataQualityReport>;
  dailyAvailability: DailyWorkforceStatusSnapshot;
  departmentScorecards: {
    departmentId: string;
    departmentName: string;
    headcount: number;
    growthPct: number;
    attritionPct: number;
    attendancePct: number;
    openPositions: number;
    estimatedCost: number | null;
    capacityPct: number;
    riskLevel: 'Healthy' | 'Moderate' | 'High Risk';
  }[];
  strategicInsights: {
    id: string;
    type: 'positive' | 'warning' | 'neutral' | 'strategic';
    title: string;
    description: string;
  }[];
  strategicDecisions: {
    id: string;
    decisionTitle: string;
    impactCategory: 'Budget' | 'Capacity' | 'Compliance' | 'Retention' | 'Organization';
    priority: 'Critical' | 'High' | 'Medium';
    owner: string;
    dueDate: string;
    actionRoute: string;
  }[];
  employees: Employee[];
  jobOpenings: JobOpening[];
}

export const hrMetricsEngine = {
  // 1. Unified Workforce Overview Data Aggregator
  async getWorkforceOverviewData(context?: HRQueryContext): Promise<UnifiedWorkforceOverviewBundle> {
    const todayStr = context?.asOfDate || new Date().toISOString().split('T')[0];
    const companyId = context?.companyId;

    const [
      rawEmployees,
      departments,
      branches,
      locations,
      attendanceRecords,
      leaveRequests,
      jobOpenings,
    ] = await Promise.all([
      api.getEmployees(companyId ? { companyId } : undefined).catch(() => []),
      api.getDepartments(companyId).catch(() => []),
      api.getBranches(companyId).catch(() => []),
      api.getLocations().catch(() => []),
      attendanceApi.getDailyAttendance(todayStr),
      leaveApi.getLeaveRequests(),
      atsService.getJobs(),
    ]);

    const scopedEmployees = headcountService.filterEmployees(rawEmployees, context);
    const totalCount = headcountService.getTotalHeadcount(rawEmployees, context);
    const activeCount = headcountService.getActiveHeadcount(rawEmployees, context);
    const dailyStatus = workforceStatusEngine.getDailyStatusSnapshot(todayStr, rawEmployees, attendanceRecords, leaveRequests, context);
    const movement = workforceMovementEngine.getMovementMetrics(scopedEmployees);
    const departmentDistribution = headcountService.getHeadcountByDepartment(departments, rawEmployees, context);
    const locationDistribution = headcountService.getHeadcountByLocation(branches, rawEmployees, context);
    const employmentMix = headcountService.getHeadcountByEmploymentType(rawEmployees, context);
    const workModes = headcountService.getHeadcountByWorkMode(rawEmployees, context);
    const managerHierarchy = reportingHierarchyService.getManagerSpans(rawEmployees);
    const dataHealth = hrDataHealthService.getHealthReport(scopedEmployees);

    return {
      totalCount,
      activeCount,
      dailyStatus,
      movement,
      departmentDistribution,
      locationDistribution,
      employmentMix,
      workModes,
      managerHierarchy,
      dataHealth,
      scopedEmployees,
      departments,
      branches,
      locations,
      attendanceRecords,
      leaveRequests,
      jobOpenings,
    };
  },

  // 2. Unified Executive Overview Data Aggregator
  async getExecutiveOverviewData(context?: HRQueryContext): Promise<UnifiedExecutiveOverviewBundle> {
    const todayStr = context?.asOfDate || new Date().toISOString().split('T')[0];
    const companyId = context?.companyId;

    const [
      rawEmployees,
      departments,
      attendanceRecords,
      leaveRequests,
      jobOpenings,
    ] = await Promise.all([
      api.getEmployees(companyId ? { companyId } : undefined).catch(() => []),
      api.getDepartments(companyId).catch(() => []),
      attendanceApi.getDailyAttendance(todayStr),
      leaveApi.getLeaveRequests(),
      atsService.getJobs(),
    ]);

    const scopedEmployees = headcountService.filterEmployees(rawEmployees, context);
    const headcount = headcountService.getTotalHeadcount(rawEmployees, context);
    const dailyAvailability = workforceStatusEngine.getDailyStatusSnapshot(todayStr, rawEmployees, attendanceRecords, leaveRequests, context);
    const movement = workforceMovementEngine.getMovementMetrics(scopedEmployees);
    const attritionMetrics = attritionService.getAttritionMetrics(scopedEmployees);
    const complianceHealth = hrDataHealthService.getHealthReport(scopedEmployees);

    const total = scopedEmployees.length;
    const baseCount = total - movement.newHiresCount + movement.exitsCount;
    const growthRatePct = baseCount > 0 ? Number((((movement.newHiresCount - movement.exitsCount) / baseCount) * 100).toFixed(1)) : null;

    const openJobs = jobOpenings.filter((j) => j.status === 'Open' || j.status === 'Draft');

    // Department Scorecards
    const departmentScorecards = departments.map((dept) => {
      const empsInDept = scopedEmployees.filter((e) => e.department_id === dept.id);
      const count = empsInDept.length;
      const deptOpenings = jobOpenings.filter((j) => j.department_id === dept.id && j.status === 'Open').length;
      const deptHires = empsInDept.filter((e) => {
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return (e.employment?.doj || e.created_at || '').startsWith(ym);
      }).length;
      const deptExits = empsInDept.filter((e) => e.status === 'Notice Period' || e.status === 'Exited').length;

      const deptGrowth = count > 0 ? Number((((deptHires - deptExits) / Math.max(1, count)) * 100).toFixed(1)) : 0;
      const deptAttrition = count > 0 && deptExits > 0 ? Number(((deptExits / count) * 100).toFixed(1)) : 0;

      let riskLevel: 'Healthy' | 'Moderate' | 'High Risk' = 'Healthy';
      if (deptAttrition > 10 || complianceHealth.value.missingManagerCount > 3) riskLevel = 'High Risk';
      else if (deptOpenings > 3 || count === 0) riskLevel = 'Moderate';

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        headcount: count,
        growthPct: deptGrowth,
        attritionPct: deptAttrition,
        attendancePct: count > 0 ? dailyAvailability.presentRatePct : 0,
        openPositions: deptOpenings,
        estimatedCost: null,
        capacityPct: count > 0 ? Math.min(100, Math.round((count / Math.max(count, count + deptOpenings)) * 100)) : 0,
        riskLevel,
      };
    });

    // Dynamic Rule-Based Strategic Insights
    const strategicInsights = [];
    if (total === 0) {
      strategicInsights.push({
        id: 'ins-empty',
        type: 'neutral' as const,
        title: 'Workforce Baseline Initializing',
        description: 'No active employee records in database yet. Add employees through Master Wizard to start computing strategic growth, cost and retention insights.',
      });
    } else {
      if (movement.newHiresCount > 0) {
        strategicInsights.push({
          id: 'ins-hiring',
          type: 'positive' as const,
          title: 'Hiring Momentum Active',
          description: `${movement.newHiresCount} new staff members joined in the current cohort cycle.`,
        });
      }
      if (complianceHealth.value.missingManagerCount > 0) {
        strategicInsights.push({
          id: 'ins-mgr-gap',
          type: 'warning' as const,
          title: 'Supervisory Gaps Identified',
          description: `${complianceHealth.value.missingManagerCount} active staff do not have assigned reporting leads.`,
        });
      }
      if (openJobs.length > 0) {
        strategicInsights.push({
          id: 'ins-reqs',
          type: 'strategic' as const,
          title: 'Talent Requisitions Open',
          description: `There are ${openJobs.length} approved requisitions active in the recruitment pipeline.`,
        });
      }
    }

    // Decisions Requiring Leadership Sign-Off
    const strategicDecisions = [];
    if (complianceHealth.value.missingManagerCount > 0) {
      strategicDecisions.push({
        id: 'dec-assign-mgrs',
        decisionTitle: `Assign Hierarchy Leads for ${complianceHealth.value.missingManagerCount} Unmapped Staff`,
        impactCategory: 'Organization' as const,
        priority: 'Critical' as const,
        owner: 'HR Head',
        dueDate: todayStr,
        actionRoute: 'people',
      });
    }
    if (openJobs.length > 0) {
      strategicDecisions.push({
        id: 'dec-review-reqs',
        decisionTitle: `Review & Authorize ${openJobs.length} Active Job Requisitions`,
        impactCategory: 'Capacity' as const,
        priority: 'High' as const,
        owner: 'Talent Acquisition Lead',
        dueDate: todayStr,
        actionRoute: 'talent-recruitment',
      });
    }
    if (movement.noticeCount > 0) {
      strategicDecisions.push({
        id: 'dec-exits',
        decisionTitle: `Review Settlement & Clearance Pipeline for ${movement.noticeCount} Notice Cases`,
        impactCategory: 'Retention' as const,
        priority: 'High' as const,
        owner: 'HR Operations',
        dueDate: todayStr,
        actionRoute: 'offboarding',
      });
    }

    return {
      headcount,
      growthRatePct,
      attritionMetrics,
      workforceCostTotal: null,
      newHiresCount: movement.newHiresCount,
      exitsCount: movement.exitsCount,
      openPositionsCount: openJobs.length,
      complianceHealth,
      dailyAvailability,
      departmentScorecards,
      strategicInsights,
      strategicDecisions,
      employees: scopedEmployees,
      jobOpenings: openJobs,
    };
  },
};
