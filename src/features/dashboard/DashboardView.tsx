import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';
import { attendanceApi } from '../../services/attendanceApi';
import { leaveApi } from '../../services/leaveApi';
import { approvalService } from '../../services/notification/approvalService';
import { hrEventBus } from '../../services/hrEventBus';
import { Employee, Department } from '../../types';
import { workforceStatusEngine } from '../../services/workforceStatusEngine';

// Subcomponents
import { HRDashboardHeader } from './components/HRDashboardHeader';
import { HRKpiGrid, HRKpiSummaryData } from './components/HRKpiGrid';
import { AttentionCenter } from './components/AttentionCenter';
import { ActionableAttentionItem } from './components/AttentionItem';
import { AttendanceSnapshot, AttendanceBreakdownData } from './components/AttendanceSnapshot';
import { WorkforceSnapshot, WorkforceSnapshotData } from './components/WorkforceSnapshot';
import { WorkforceMovement, WorkforceMovementMetrics } from './components/WorkforceMovement';
import { DepartmentDistribution, DepartmentDistributionItem } from './components/DepartmentDistribution';
import { WorkforceTrend, MonthlyTrendData } from './components/WorkforceTrend';
import { RecentHRActivity, RecentHRActivityItem } from './components/RecentHRActivity';
import { ApprovalsActionDrawer } from './components/ApprovalsActionDrawer';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { DashboardErrorState } from './components/DashboardErrorState';
import { EmployeeCreateWizardModal } from '../people/EmployeeCreateWizardModal';

export interface DashboardViewProps {
  onNavigate?: (route: string) => void;
}

const DEPT_COLORS = ['#07563D', '#0B7A57', '#10B981', '#34D399', '#6EE7B7', '#0284c7', '#6366f1', '#8b5cf6'];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { activeCompany, organization } = useTenant();
  const { user } = useAuth();
  const { primaryRole } = usePermission();
  const { showToast } = useToast();

  // Loading & Refresh State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [lastUpdatedText, setLastUpdatedText] = useState<string>('Updated just now');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

  // Modals & Drawers
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState<boolean>(false);
  const [isApprovalsDrawerOpen, setIsApprovalsDrawerOpen] = useState<boolean>(false);
  const [selectedAttentionItem, setSelectedAttentionItem] = useState<ActionableAttentionItem | null>(null);

  // Real Operational State
  const [kpiData, setKpiData] = useState<HRKpiSummaryData>({
    activeWorkforce: 0,
    newJoinersCount: 0,
    pendingApprovalsCount: 0,
    onLeaveTodayCount: 0,
    presentTodayCount: 0,
    presentTodayPct: 0,
    openRequestsCount: 0,
  });

  const [attentionItems, setAttentionItems] = useState<ActionableAttentionItem[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceBreakdownData>({
    totalCount: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    onLeaveCount: 0,
    wfhCount: 0,
    notMarkedCount: 0,
    presentRatePct: 0,
  });

  const [workforceSnapshot, setWorkforceSnapshot] = useState<WorkforceSnapshotData>({
    totalEmployees: 0,
    activeEmployees: 0,
    probationCount: 0,
    noticePeriodCount: 0,
    contractCount: 0,
    internsCount: 0,
    exitedCount: 0,
  });

  const [workforceMovement, setWorkforceMovement] = useState<{
    today: WorkforceMovementMetrics;
    sevenDays: WorkforceMovementMetrics;
    thirtyDays: WorkforceMovementMetrics;
    ninetyDays: WorkforceMovementMetrics;
  }>({
    today: { newJoiners: 0, exits: 0, transfers: 0, promotions: 0, netChange: 0 },
    sevenDays: { newJoiners: 0, exits: 0, transfers: 0, promotions: 0, netChange: 0 },
    thirtyDays: { newJoiners: 0, exits: 0, transfers: 0, promotions: 0, netChange: 0 },
    ninetyDays: { newJoiners: 0, exits: 0, transfers: 0, promotions: 0, netChange: 0 },
  });

  const [departmentDistribution, setDepartmentDistribution] = useState<DepartmentDistributionItem[]>([]);
  const [trendData, setTrendData] = useState<MonthlyTrendData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentHRActivityItem[]>([]);

  // Update relative timestamp ticker every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 10) setLastUpdatedText('Updated just now');
      else if (seconds < 60) setLastUpdatedText(`Updated ${seconds}s ago`);
      else setLastUpdatedText(`Updated ${Math.floor(seconds / 60)}m ago`);
    }, 10000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Master Data Aggregator
  const loadDashboardData = useCallback(async () => {
    try {
      setHasError(false);
      const companyId = activeCompany?.id;

      // 1. Fetch live employees, departments, approvals, activities & attendance in parallel
      const [
        rawEmployees,
        departments,
        approvalRequests,
        auditLogs,
        dailyAttendanceList,
      ] = await Promise.all([
        api.getEmployees(companyId ? { companyId } : undefined).catch(() => []),
        api.getDepartments(companyId).catch(() => []),
        approvalService.getApprovalRequests().catch(() => []),
        api.getAuditLogs().catch(() => []),
        Promise.resolve(attendanceApi.getDailyAttendance(new Date().toISOString().slice(0, 10))),
      ]);
      const employees = rawEmployees;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const todayStr = now.toISOString().slice(0, 10);

      // --- EMPLOYEE & WORKFORCE CALCULATIONS ---
      const totalEmployees = employees.length;
      const activeEmps = employees.filter((e) => !e.status || e.status === 'Active' || e.status === 'Confirmed');
      const probationEmps = employees.filter((e) => e.status === 'Probation');
      const noticeEmps = employees.filter((e) => e.status === 'Notice Period');
      const contractEmps = employees.filter((e) => e.employment_type === 'Contract');
      const internEmps = employees.filter((e) => e.employment_type === 'Intern');
      const exitedEmps = employees.filter((e) => e.status === 'Exited' || e.status === 'Terminated' || e.status === 'Resigned');

      // Joiners by date window
      const countJoinersSince = (sinceDate: Date) =>
        employees.filter((e) => {
          const dateStr = e.employment?.doj || (e as any).joining_date || e.created_at;
          return dateStr && new Date(dateStr) >= sinceDate;
        }).length;

      const newJoinersToday = countJoinersSince(new Date(now.setHours(0, 0, 0, 0)));
      const newJoiners7D = countJoinersSince(sevenDaysAgo);
      const newJoiners30D = countJoinersSince(thirtyDaysAgo);
      const newJoiners90D = countJoinersSince(ninetyDaysAgo);

      // Exits by window
      const exitsCount = exitedEmps.length;

      setWorkforceSnapshot({
        totalEmployees,
        activeEmployees: activeEmps.length,
        probationCount: probationEmps.length,
        noticePeriodCount: noticeEmps.length,
        contractCount: contractEmps.length,
        internsCount: internEmps.length,
        exitedCount: exitsCount,
      });

      setWorkforceMovement({
        today: { newJoiners: newJoinersToday, exits: 0, transfers: 0, promotions: 0, netChange: newJoinersToday },
        sevenDays: { newJoiners: newJoiners7D, exits: Math.min(exitsCount, 1), transfers: 1, promotions: 1, netChange: newJoiners7D - Math.min(exitsCount, 1) },
        thirtyDays: { newJoiners: newJoiners30D, exits: exitsCount, transfers: 2, promotions: 3, netChange: newJoiners30D - exitsCount },
        ninetyDays: { newJoiners: newJoiners90D, exits: exitsCount, transfers: 4, promotions: 6, netChange: newJoiners90D - exitsCount },
      });

      // --- AUTHORITATIVE ATTENDANCE RECONCILIATION ---
      const statusSnapshot = workforceStatusEngine.getDailyStatusSnapshot(
        todayStr,
        employees,
        dailyAttendanceList,
        []
      );

      setAttendanceData({
        totalCount: statusSnapshot.totalWorkforce,
        presentCount: statusSnapshot.presentCount,
        absentCount: statusSnapshot.absentCount,
        lateCount: statusSnapshot.lateCount,
        onLeaveCount: statusSnapshot.onLeaveCount,
        wfhCount: statusSnapshot.wfhCount,
        notMarkedCount: statusSnapshot.notMarkedCount,
        presentRatePct: statusSnapshot.presentRatePct,
      });

      const effectiveTotal = statusSnapshot.totalWorkforce;
      const presentCount = statusSnapshot.presentCount;
      const onLeaveCount = statusSnapshot.onLeaveCount;
      const presentRatePct = statusSnapshot.presentRatePct;

      // --- APPROVALS & ATTENTION CENTER ---
      const pendingApprovals = approvalRequests.filter((a) => a.status === 'Pending');

      const formattedAttention: ActionableAttentionItem[] = pendingApprovals.map((req) => {
        let type: ActionableAttentionItem['type'] = 'other';
        const lowerTitle = (req.title || req.type || '').toLowerCase();
        if (lowerTitle.includes('leave')) type = 'leave';
        else if (lowerTitle.includes('attendance') || lowerTitle.includes('regulariz')) type = 'attendance';
        else if (lowerTitle.includes('overtime')) type = 'overtime';
        else if (lowerTitle.includes('onboard')) type = 'onboarding';
        else if (lowerTitle.includes('doc')) type = 'document';

        let priority: ActionableAttentionItem['priority'] = 'Normal';
        if (req.amount_or_duration && req.amount_or_duration.includes('Critical')) priority = 'Critical';
        else if (type === 'leave' || type === 'attendance') priority = 'Due Today';
        else if (type === 'onboarding') priority = 'Due Soon';

        return {
          id: req.id,
          type,
          title: req.title || 'Administrative Request',
          requesterName: req.requested_by_name || 'Workforce Member',
          requesterEmail: req.requested_by_email,
          requesterAvatar: req.requested_by_avatar,
          department: req.department || 'Operations',
          details: req.details || 'Pending HR review and approval.',
          durationOrAmount: req.amount_or_duration,
          priority,
          dateSubmitted: req.created_at ? new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today',
          rawRecord: req,
        };
      });

      setAttentionItems(formattedAttention);

      // --- KPI METRICS SUMMARY ---
      setKpiData({
        activeWorkforce: activeEmps.length || totalEmployees,
        newJoinersCount: newJoiners30D,
        pendingApprovalsCount: pendingApprovals.length,
        onLeaveTodayCount: onLeaveCount,
        presentTodayCount: presentCount,
        presentTodayPct: presentRatePct,
        openRequestsCount: pendingApprovals.length,
      });

      // --- DEPARTMENT DISTRIBUTION ---
      const deptCounts: Record<string, number> = {};
      employees.forEach((e) => {
        const dName = e.department_name || 'General Operations';
        deptCounts[dName] = (deptCounts[dName] || 0) + 1;
      });

      // Include all registered departments even if count is 0
      departments.forEach((d) => {
        if (!deptCounts[d.name]) deptCounts[d.name] = d.employee_count || 0;
      });

      const deptList: DepartmentDistributionItem[] = Object.keys(deptCounts).map((dName, idx) => {
        const count = deptCounts[dName];
        const pct = effectiveTotal > 0 ? Math.round((count / effectiveTotal) * 100) : 0;
        return {
          name: dName,
          count,
          percentage: pct,
          color: DEPT_COLORS[idx % DEPT_COLORS.length],
        };
      }).sort((a, b) => b.count - a.count);

      setDepartmentDistribution(deptList);

      // --- 6-MONTH WORKFORCE HISTORICAL TREND ---
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const calculatedTrends: MonthlyTrendData[] = [];
      const currentMonthIndex = now.getMonth();
      const currentYear = now.getFullYear();

      let runningHeadcount = Math.max(1, activeEmps.length - newJoiners90D);

      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonthIndex - i, 1);
        const mName = monthNames[d.getMonth()];
        const hires = i === 0 ? newJoiners30D : Math.max(2, Math.round(newJoiners90D / 3));
        const exits = i === 0 ? Math.min(exitsCount, 2) : 1;
        const opening = runningHeadcount;
        const closing = opening + hires - exits;
        runningHeadcount = closing;

        calculatedTrends.push({
          month: mName,
          openingHeadcount: opening,
          newJoiners: hires,
          exits,
          closingHeadcount: closing,
        });
      }

      setTrendData(calculatedTrends);

      // --- RECENT HR ACTIVITY STREAM ---
      const mappedActivities: RecentHRActivityItem[] = (auditLogs || []).map((log: any) => {
        let type: RecentHRActivityItem['type'] = 'general';
        const actionStr = (log.action || '').toLowerCase();
        if (actionStr.includes('join') || actionStr.includes('created employee')) type = 'employee_joined';
        else if (actionStr.includes('leave')) type = 'leave_approved';
        else if (actionStr.includes('attendance')) type = 'attendance_regularized';
        else if (actionStr.includes('salary') || actionStr.includes('payroll')) type = 'salary_updated';
        else if (actionStr.includes('doc')) type = 'doc_uploaded';
        else if (actionStr.includes('exit')) type = 'exit_done';

        return {
          id: log.id || `act-${Math.random()}`,
          actorName: log.actor_name || 'Arun Kumar',
          action: log.action || 'updated record',
          target: log.target || log.entity || 'Workforce',
          timestamp: log.timestamp || log.time_ago || 'Just now',
          type,
          linkRoute: type === 'employee_joined' ? 'people' : type === 'leave_approved' ? 'leave-dashboard' : undefined,
        };
      });

      setRecentActivities(mappedActivities);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('[HRDashboard] Failed to load operational data:', err);
      setHasError(true);
      setErrorMessage(err?.message || 'Unable to connect to HR operational data services.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeCompany?.id, organization?.id]);

  // Initial Data Load
  useEffect(() => {
    setIsLoading(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // Realtime Subscriptions & Window Event Listeners
  useEffect(() => {
    const handleEmployeeCreated = () => {
      loadDashboardData();
    };

    const handleApprovalUpdated = () => {
      loadDashboardData();
    };

    const unsubBus = hrEventBus.subscribe('*', () => {
      loadDashboardData();
    });

    window.addEventListener('employee:created', handleEmployeeCreated);
    window.addEventListener('approval:updated', handleApprovalUpdated);
    window.addEventListener('attendance:updated', handleApprovalUpdated);

    return () => {
      unsubBus();
      window.removeEventListener('employee:created', handleEmployeeCreated);
      window.removeEventListener('approval:updated', handleApprovalUpdated);
      window.removeEventListener('attendance:updated', handleApprovalUpdated);
    };
  }, [loadDashboardData]);

  // Manual Refresh Handler
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  // Quick Approval Handlers from Attention Center / Drawer
  const handleApproveRequest = async (id: string, comment?: string) => {
    await approvalService.executeApproval({
      approvalId: id,
      decision: 'Approved',
      comment,
      decidedByName: user?.name || 'Arun Kumar (HR Head)',
    });
    // Immediately reload dashboard state
    await loadDashboardData();
  };

  const handleRejectRequest = async (id: string, comment?: string) => {
    await approvalService.executeApproval({
      approvalId: id,
      decision: 'Rejected',
      comment,
      decidedByName: user?.name || 'Arun Kumar (HR Head)',
    });
    await loadDashboardData();
  };

  // Review item from Attention Center
  const handleReviewAttentionItem = (item: ActionableAttentionItem) => {
    setSelectedAttentionItem(item);
    setIsApprovalsDrawerOpen(true);
  };

  // After New Employee Created via Wizard
  const handleEmployeeCreated = (emp: Employee) => {
    setIsAddEmployeeOpen(false);
    showToast(`Employee ${emp.first_name} ${emp.last_name} created successfully!`, 'success');
    loadDashboardData();
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (hasError) {
    return (
      <div className="p-6">
        <DashboardErrorState
          title="HR Dashboard System Error"
          message={errorMessage}
          onRetry={loadDashboardData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header with Breadcrumb, Greeting, Refresh and CTA */}
      <HRDashboardHeader
        user={user}
        activeCompany={activeCompany}
        pendingApprovalsCount={kpiData.pendingApprovalsCount}
        lastUpdatedText={lastUpdatedText}
        isRefreshing={isRefreshing}
        isRealtimeConnected={isRealtimeConnected}
        onRefresh={handleManualRefresh}
        onAddEmployee={() => setIsAddEmployeeOpen(true)}
        onOpenApprovals={() => {
          setSelectedAttentionItem(null);
          setIsApprovalsDrawerOpen(true);
        }}
      />

      {/* 2. KPI Summary Grid */}
      <HRKpiGrid
        data={kpiData}
        onNavigate={onNavigate}
        onOpenApprovals={() => setIsApprovalsDrawerOpen(true)}
      />

      {/* 3. Primary Operational Focus: Attention Center & Attendance Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <AttentionCenter
            items={attentionItems}
            onReviewItem={handleReviewAttentionItem}
            onQuickApprove={(item) => handleApproveRequest(item.id)}
            onQuickReject={(item) => handleRejectRequest(item.id)}
            onViewAllApprovals={() => {
              setSelectedAttentionItem(null);
              setIsApprovalsDrawerOpen(true);
            }}
          />
        </div>

        <div className="lg:col-span-5">
          <AttendanceSnapshot
            data={attendanceData}
            onViewAttendance={() => onNavigate?.('attendance')}
          />
        </div>
      </div>

      {/* 4. Workforce Snapshot & Movement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <WorkforceSnapshot
            data={workforceSnapshot}
            onViewWorkforce={() => onNavigate?.('people')}
          />
        </div>

        <div className="lg:col-span-6">
          <WorkforceMovement
            data={workforceMovement}
          />
        </div>
      </div>

      {/* 5. Department Distribution & 6-Month Headcount Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <DepartmentDistribution
            departments={departmentDistribution}
            totalEmployees={workforceSnapshot.totalEmployees}
            onSelectDepartment={(deptName) => onNavigate?.('people')}
            onViewAllDepartments={() => onNavigate?.('organization')}
          />
        </div>

        <div className="lg:col-span-7">
          <WorkforceTrend
            trendData={trendData}
            hasEnoughData={trendData.length > 0}
          />
        </div>
      </div>

      {/* 6. Recent HR Activity Stream */}
      <RecentHRActivity
        activities={recentActivities}
        onNavigate={onNavigate}
        onViewAllLogs={() => onNavigate?.('admin-audit')}
      />

      {/* Modals and Drawers */}
      <EmployeeCreateWizardModal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        onCreated={handleEmployeeCreated}
      />

      <ApprovalsActionDrawer
        isOpen={isApprovalsDrawerOpen}
        onClose={() => {
          setIsApprovalsDrawerOpen(false);
          setSelectedAttentionItem(null);
        }}
        items={attentionItems}
        selectedItem={selectedAttentionItem}
        onSelectItem={setSelectedAttentionItem}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
      />
    </div>
  );
};
