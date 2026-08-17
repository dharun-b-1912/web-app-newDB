import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { useToast } from '../../components/ui/Toast';
import { hrMetricsEngine, UnifiedWorkforceOverviewBundle } from '../../services/hrMetricsEngine';
import { hrEventBus } from '../../services/hrEventBus';
import { Employee } from '../../types';

// Subcomponents
import { WorkforceOverviewHeader } from './workforce/WorkforceOverviewHeader';
import { WorkforceFilterBar, WorkforceFiltersState } from './workforce/WorkforceFilterBar';
import { WorkforceKpiGrid, WorkforceKpiData } from './workforce/WorkforceKpiGrid';
import { WorkforceGrowthChart, WorkforceHistoricalMonth } from './workforce/WorkforceGrowthChart';
import { WorkforceMovementCards } from './workforce/WorkforceMovementCards';
import {
  DepartmentAndLocationDistribution,
  DepartmentMetricRow,
  LocationMetricRow,
} from './workforce/DepartmentAndLocationDistribution';
import {
  EmploymentMixAndWorkMode,
  MixDistributionItem,
} from './workforce/EmploymentMixAndWorkMode';
import { TeamStructureView, ManagerHierarchyRow } from './workforce/TeamStructureView';
import { TodayWorkforceStatus, TodayAttendanceSnapshot } from './workforce/TodayWorkforceStatus';
import { WorkforceCapacityView, DepartmentCapacityRow } from './workforce/WorkforceCapacityView';
import {
  WorkforceAttentionAndDataQuality,
  DataQualityHealth,
  WorkforceAlertItem,
} from './workforce/WorkforceAttentionAndDataQuality';
import { EmployeeQuickViewDrawer } from './workforce/EmployeeQuickViewDrawer';
import { EmployeeCreateWizardModal } from '../people/EmployeeCreateWizardModal';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { DashboardErrorState } from './components/DashboardErrorState';
import { UserPlus, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface Props {
  onNavigate?: (route: string) => void;
}

const DEPT_COLORS = ['#07563D', '#2563EB', '#D97706', '#7C3AED', '#DB2777', '#059669', '#DC2626', '#4B5563'];

export const WorkforceOverviewView: React.FC<Props> = ({ onNavigate }) => {
  const navigate = onNavigate || ((_r: string) => {});
  const { activeCompany } = useTenant();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

  // Period & Global Filters
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today');
  const [filters, setFilters] = useState<WorkforceFiltersState>({
    search: '',
    departmentId: 'ALL',
    locationId: 'ALL',
    employmentType: 'ALL',
    status: 'ALL',
    workMode: 'ALL',
    managerId: 'ALL',
  });

  // Aggregated Domain Bundle
  const [bundle, setBundle] = useState<UnifiedWorkforceOverviewBundle | null>(null);

  // Modals & Drawers
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [selectedQuickViewEmployee, setSelectedQuickViewEmployee] = useState<Employee | null>(null);

  // Master Data Fetcher from Authoritative hrMetricsEngine
  const loadWorkforceData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    setError(null);

    try {
      const data = await hrMetricsEngine.getWorkforceOverviewData({
        companyId: activeCompany?.id,
        departmentId: filters.departmentId !== 'ALL' ? filters.departmentId : undefined,
        locationId: filters.locationId !== 'ALL' ? filters.locationId : undefined,
        employmentType: filters.employmentType !== 'ALL' ? filters.employmentType : undefined,
        status: filters.status !== 'ALL' ? filters.status : undefined,
        workMode: filters.workMode !== 'ALL' ? filters.workMode : undefined,
        managerId: filters.managerId !== 'ALL' ? filters.managerId : undefined,
        search: filters.search.trim() || undefined,
      });

      setBundle(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load workforce overview data:', err);
      setError(err.message || 'Unable to retrieve live workforce dataset.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeCompany?.id, filters]);

  useEffect(() => {
    loadWorkforceData();
  }, [loadWorkforceData]);

  // Idempotent Real-time Event Subscription
  useEffect(() => {
    const unsub = hrEventBus.subscribe('*', () => {
      loadWorkforceData(true);
    });
    return () => unsub();
  }, [loadWorkforceData]);

  // 1. KPI Aggregation from Authoritative Engines
  const kpiData: WorkforceKpiData = useMemo(() => {
    if (!bundle) {
      return {
        totalWorkforce: 0,
        activeCount: 0,
        presentCount: 0,
        presentRatePct: 0,
        onLeaveCount: 0,
        absentCount: 0,
        newJoinersThisMonth: 0,
        exitsCount: 0,
        openPositionsCount: 0,
      };
    }

    return {
      totalWorkforce: bundle.totalCount.value,
      activeCount: bundle.activeCount.value,
      presentCount: bundle.dailyStatus.presentCount,
      presentRatePct: bundle.dailyStatus.presentRatePct,
      onLeaveCount: bundle.dailyStatus.onLeaveCount,
      absentCount: bundle.dailyStatus.absentCount,
      newJoinersThisMonth: bundle.movement.newHiresCount,
      exitsCount: bundle.movement.exitsCount,
      openPositionsCount: bundle.jobOpenings.filter((j) => j.status === 'Open' || j.status === 'Draft').length,
    };
  }, [bundle]);

  // 2. Historical Headcount Trajectory
  const historicalGrowth: WorkforceHistoricalMonth[] = useMemo(() => {
    if (!bundle) return [];
    return bundle.movement.trajectory.map((t) => ({
      month: t.month,
      opening: t.opening,
      hires: t.hires,
      exits: t.exits,
      closing: t.closing,
    }));
  }, [bundle]);

  // 3. Department Metrics
  const departmentMetrics: DepartmentMetricRow[] = useMemo(() => {
    if (!bundle) return [];
    return bundle.departments.map((dept, index) => {
      const empsInDept = bundle.scopedEmployees.filter((e) => e.department_id === dept.id);
      const count = empsInDept.length;
      const pct = bundle.scopedEmployees.length > 0 ? Math.round((count / bundle.scopedEmployees.length) * 100) : 0;
      const presentCount = bundle.attendanceRecords.filter(
        (a) => empsInDept.some((e) => e.id === a.employee_id) && (a.status === 'Present' || a.status === 'Late' || a.status === 'WFH')
      ).length;
      const presentRate = count > 0 ? Math.round((presentCount / count) * 100) : 0;
      const openings = bundle.jobOpenings.filter((r) => r.department_id === dept.id && r.status === 'Open').length;

      return {
        id: dept.id,
        name: dept.name,
        count,
        pct,
        openings,
        presentRate,
        managerName: empsInDept[0]?.first_name ? `${empsInDept[0].first_name} ${empsInDept[0].last_name}` : undefined,
        color: DEPT_COLORS[index % DEPT_COLORS.length],
      };
    }).sort((a, b) => b.count - a.count);
  }, [bundle]);

  // 4. Location Metrics
  const locationMetrics: LocationMetricRow[] = useMemo(() => {
    if (!bundle) return [];
    const branches = bundle.branches.length > 0 ? bundle.branches : [{ id: 'loc-cbe-01', name: 'Headquarters', city: 'Headquarters', company_id: 'comp-joy-01', code: 'HQ', state: 'TN', timezone: 'Asia/Kolkata', created_at: '' }];
    return branches.map((b) => {
      const empsInLoc = bundle.scopedEmployees.filter((e) => e.branch_id === b.id || (e.branch_name || '').toLowerCase().includes((b.city || b.name).toLowerCase()));
      const count = empsInLoc.length;
      const present = bundle.attendanceRecords.filter(
        (a) => empsInLoc.some((e) => e.id === a.employee_id) && (a.status === 'Present' || a.status === 'Late' || a.status === 'WFH')
      ).length;
      const leave = bundle.leaveRequests.filter(
        (l) => empsInLoc.some((e) => e.id === l.employee_id) && l.status === 'Approved'
      ).length;
      const absent = Math.max(0, count - present - leave);

      return {
        name: b.city || b.name,
        count,
        present,
        leave,
        absent,
        openings: 0,
      };
    });
  }, [bundle]);

  // 5. Manager Hierarchy Rows
  const managerRows: ManagerHierarchyRow[] = useMemo(() => {
    if (!bundle) return [];
    return bundle.managerHierarchy.map((m) => {
      const presentCount = bundle.attendanceRecords.filter(
        (a) => m.directReports.some((dr) => dr.id === a.employee_id) && (a.status === 'Present' || a.status === 'Late' || a.status === 'WFH')
      ).length;
      const leaveCount = bundle.leaveRequests.filter(
        (l) => m.directReports.some((dr) => dr.id === l.employee_id) && l.status === 'Approved'
      ).length;

      return {
        managerId: m.managerId,
        managerName: m.managerName,
        managerAvatar: m.avatarUrl,
        departmentName: m.departmentName,
        designationTitle: m.designationTitle,
        teamSize: m.totalTeamSize,
        presentCount,
        leaveCount,
        openingsCount: 0,
      };
    });
  }, [bundle]);

  // 6. Capacity Rows
  const capacityRows: DepartmentCapacityRow[] = useMemo(() => {
    return departmentMetrics.map((dept) => {
      const approvedCap = Math.max(dept.count, dept.count + dept.openings);
      const utilizationPct = approvedCap > 0 ? Math.round((dept.count / approvedCap) * 100) : 100;
      let status: DepartmentCapacityRow['status'] = 'Healthy';
      if (utilizationPct >= 95) status = 'Over Capacity';
      else if (utilizationPct >= 85) status = 'Near Capacity';

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        currentCount: dept.count,
        approvedCap,
        utilizationPct,
        openings: dept.openings,
        status,
      };
    });
  }, [departmentMetrics]);

  // 7. Data Health & Alerts
  const dataHealth: DataQualityHealth = useMemo(() => {
    if (!bundle) {
      return {
        completionRatePct: 100,
        totalEmployees: 0,
        missingManagerCount: 0,
        missingDeptCount: 0,
        missingPhoneCount: 0,
        missingEmergencyCount: 0,
        incompleteProfileCount: 0,
      };
    }

    const report = bundle.dataHealth.value;
    return {
      completionRatePct: report.overallHealthScorePct,
      totalEmployees: report.totalEmployees,
      missingManagerCount: report.missingManagerCount,
      missingDeptCount: report.missingDepartmentCount,
      missingPhoneCount: report.missingPhoneCount,
      missingEmergencyCount: report.missingEmergencyContactCount,
      incompleteProfileCount: report.unresolvedActionItemsCount,
    };
  }, [bundle]);

  const workforceAlerts: WorkforceAlertItem[] = useMemo(() => {
    const alerts: WorkforceAlertItem[] = [];
    if (dataHealth.missingManagerCount > 0) {
      alerts.push({
        id: 'alt-missing-mgr',
        title: `${dataHealth.missingManagerCount} employees have no assigned reporting manager`,
        severity: 'Critical',
        affectedCount: dataHealth.missingManagerCount,
        actionLabel: 'Assign Managers',
        actionRoute: 'people',
      });
    }
    if (dataHealth.missingEmergencyCount > 0) {
      alerts.push({
        id: 'alt-missing-emergency',
        title: `${dataHealth.missingEmergencyCount} employees have missing emergency contacts`,
        severity: 'Warning',
        affectedCount: dataHealth.missingEmergencyCount,
        actionLabel: 'Update Profiles',
        actionRoute: 'people',
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        id: 'alt-clean',
        title: 'All employee profiles and organizational data are compliant and up-to-date',
        severity: 'Info',
        affectedCount: 0,
        actionLabel: 'View Directory',
        actionRoute: 'people',
      });
    }
    return alerts;
  }, [dataHealth]);

  // CSV Export Handler
  const handleExportCsv = () => {
    if (!bundle) return;
    try {
      const headers = ['Employee ID', 'Name', 'Department', 'Designation', 'Employment Type', 'Status', 'Work Mode', 'Email'];
      const rows = bundle.scopedEmployees.map((e) => [
        `"${e.employee_code || ''}"`,
        `"${e.first_name || ''} ${e.last_name || ''}"`,
        `"${e.department_name || ''}"`,
        `"${e.designation_title || ''}"`,
        `"${e.employment_type || ''}"`,
        `"${e.status || ''}"`,
        `"${e.employment?.work_mode || ''}"`,
        `"${e.work_email || ''}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Workforce_Overview_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Workforce summary exported to CSV.', 'success');
    } catch (err) {
      showToast('Export failed. Please try again.', 'error');
    }
  };

  if (isLoading || !bundle) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <DashboardErrorState errorMessage={error} onRetry={() => loadWorkforceData(true)} />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Breadcrumb, Period & Export */}
      <WorkforceOverviewHeader
        activeCompany={activeCompany}
        lastUpdatedText={`Updated ${lastUpdated.toLocaleTimeString()}`}
        isRefreshing={isRefreshing}
        isRealtimeConnected={isRealtimeConnected}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        onRefresh={() => loadWorkforceData(true)}
        onExport={handleExportCsv}
        onAddEmployee={() => setIsWizardOpen(true)}
        onViewDirectory={() => navigate('people')}
      />

      {/* 2. Global Multi-Dimensional Filter Bar */}
      <WorkforceFilterBar
        filters={filters}
        onChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
        onReset={() =>
          setFilters({
            search: '',
            departmentId: 'ALL',
            locationId: 'ALL',
            employmentType: 'ALL',
            status: 'ALL',
            workMode: 'ALL',
            managerId: 'ALL',
          })
        }
        departments={bundle.departments}
        locations={bundle.locations}
        branches={bundle.branches}
        managers={bundle.scopedEmployees.filter((e) => (!e.status || e.status === 'Active') && (e.designation_title?.toLowerCase().includes('manager') || e.designation_title?.toLowerCase().includes('lead') || e.designation_title?.toLowerCase().includes('head')))}
        totalResultsCount={bundle.scopedEmployees.length}
      />

      {/* 3. 8 Interactive Workforce KPI Cards */}
      <WorkforceKpiGrid data={kpiData} onNavigate={navigate} />

      {/* Empty State Banner if 0 employees exist yet */}
      {bundle.scopedEmployees.length === 0 && (
        <div className="p-8 rounded-2xl bg-white border border-dashed border-gray-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-gray-900">
              No Employees in Database Yet
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Your organizational database is clean and ready. Add your first employee through the Master Creation Wizard or import from your HR system.
            </p>
          </div>
          <Button
            size="md"
            variant="primary"
            onClick={() => setIsWizardOpen(true)}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold px-5"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add First Employee
          </Button>
        </div>
      )}

      {/* 4. Workforce Growth Trajectory (12M/6M/3M/YTD) */}
      <WorkforceGrowthChart data={historicalGrowth} />

      {/* 5. Workforce Movement (Joiners, Mobility, Exits) */}
      <WorkforceMovementCards
        recentJoiners={bundle.scopedEmployees.filter((e) => {
          const now = new Date();
          const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          return (e.employment?.doj || e.created_at || '').startsWith(ym);
        })}
        noticeEmployees={bundle.scopedEmployees.filter((e) => e.status === 'Notice Period')}
        onSelectEmployee={(emp) => setSelectedQuickViewEmployee(emp)}
        onViewAllJoiners={() => navigate('onboarding')}
        onViewAllExits={() => navigate('offboarding')}
      />

      {/* 6. Department & Location Distribution */}
      <DepartmentAndLocationDistribution
        departments={departmentMetrics}
        locations={locationMetrics}
        totalWorkforce={bundle.scopedEmployees.length}
        onFilterDepartment={(deptId) => setFilters((prev) => ({ ...prev, departmentId: deptId }))}
        onFilterLocation={(locName) => setFilters((prev) => ({ ...prev, search: locName }))}
      />

      {/* 7. Employment Mix & Work Mode Distribution */}
      <EmploymentMixAndWorkMode
        employmentMix={bundle.employmentMix}
        workModes={bundle.workModes}
        onSelectType={(t) => setFilters((prev) => ({ ...prev, employmentType: t }))}
        onSelectWorkMode={(m) => setFilters((prev) => ({ ...prev, workMode: m }))}
      />

      {/* 8. Team & Manager Reporting Structure */}
      <TeamStructureView
        managerRows={managerRows}
        onSelectManager={(mgrId) => setFilters((prev) => ({ ...prev, managerId: mgrId }))}
      />

      {/* 9. Today's Workforce Operational Status */}
      <TodayWorkforceStatus
        data={bundle.dailyStatus}
        onOpenAttendance={() => navigate('attendance')}
      />

      {/* 10. Workforce Capacity & Headcount Utilization */}
      <WorkforceCapacityView
        capacityRows={capacityRows}
        onOpenRecruitment={() => navigate('talent-recruitment')}
      />

      {/* 11. Data Quality & Operational Alerts */}
      <WorkforceAttentionAndDataQuality
        dataHealth={dataHealth}
        alerts={workforceAlerts}
        onNavigate={navigate}
      />

      {/* Slide Drawer: Employee Quick View */}
      <EmployeeQuickViewDrawer
        isOpen={Boolean(selectedQuickViewEmployee)}
        onClose={() => setSelectedQuickViewEmployee(null)}
        employee={selectedQuickViewEmployee}
        onNavigate={navigate}
      />

      {/* 7-Step Employee Master Creation Wizard */}
      <EmployeeCreateWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={(newEmp) => {
          loadWorkforceData(true);
          setSelectedQuickViewEmployee(newEmp);
        }}
      />
    </div>
  );
};
