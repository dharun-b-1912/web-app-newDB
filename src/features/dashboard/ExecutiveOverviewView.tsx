import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { useToast } from '../../components/ui/Toast';
import { hrMetricsEngine, UnifiedExecutiveOverviewBundle } from '../../services/hrMetricsEngine';
import { hrEventBus } from '../../services/hrEventBus';
import { ExecutiveSummaryMetrics } from '../../services/executiveAnalyticsService';

// Executive Subcomponents
import { ExecutiveContextBar } from './executive/ExecutiveContextBar';
import { ExecutiveKpiCards } from './executive/ExecutiveKpiCards';
import { ExecutiveInsightsPanel } from './executive/ExecutiveInsightsPanel';
import { ExecutiveGrowthAndCostTrends } from './executive/ExecutiveGrowthAndCostTrends';
import { AttritionAndTalentPipeline } from './executive/AttritionAndTalentPipeline';
import { WorkforcePlanVsActual } from './executive/WorkforcePlanVsActual';
import { DepartmentStrategicScorecard } from './executive/DepartmentStrategicScorecard';
import { OrganizationalHealthAndAvailability } from './executive/OrganizationalHealthAndAvailability';
import { PeopleRiskAndDecisionQueue } from './executive/PeopleRiskAndDecisionQueue';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { DashboardErrorState } from './components/DashboardErrorState';

interface Props {
  onNavigate?: (route: string) => void;
}

export const ExecutiveOverviewView: React.FC<Props> = ({ onNavigate }) => {
  const navigate = onNavigate || ((_r: string) => {});
  const { activeCompany } = useTenant();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

  // Period & Comparison States
  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month');
  const [comparisonMode, setComparisonMode] = useState<string>('prev_period');

  // Unified Domain Bundle
  const [bundle, setBundle] = useState<UnifiedExecutiveOverviewBundle | null>(null);

  // Master Strategic Data Fetcher from Authoritative hrMetricsEngine
  const loadExecutiveData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    setError(null);

    try {
      const data = await hrMetricsEngine.getExecutiveOverviewData({
        companyId: activeCompany?.id,
        period: selectedPeriod,
      });

      setBundle(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load executive HR metrics:', err);
      setError(err.message || 'Unable to aggregate executive workforce records.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeCompany?.id, selectedPeriod]);

  useEffect(() => {
    loadExecutiveData();
  }, [loadExecutiveData]);

  // Idempotent Real-time Event Subscription
  useEffect(() => {
    const unsub = hrEventBus.subscribe('*', () => {
      loadExecutiveData(true);
    });
    return () => unsub();
  }, [loadExecutiveData]);

  // Transform bundle to ExecutiveSummaryMetrics format
  const summaryMetrics: ExecutiveSummaryMetrics = useMemo(() => {
    if (!bundle) {
      return {
        totalWorkforce: 0,
        activeWorkforce: 0,
        workforceGrowthPct: null,
        attritionRatePct: null,
        voluntaryAttritionCount: 0,
        involuntaryAttritionCount: 0,
        workforceCostTotal: null,
        averageCostPerEmployee: null,
        newHiresCount: 0,
        exitsCount: 0,
        openPositionsCount: 0,
        complianceRiskScore: 100,
        criticalRisksCount: 0,
        managerCoveragePct: 100,
        profileCompletionPct: 100,
        attendanceRatePct: 0,
        absenceRatePct: 0,
        leaveRatePct: 0,
      };
    }

    const health = bundle.complianceHealth.value;
    const total = bundle.headcount.value;
    const missingMgr = health.missingManagerCount;
    const managerCoverage = total > 0 ? Math.round(((total - missingMgr) / total) * 100) : 100;

    return {
      totalWorkforce: total,
      activeWorkforce: bundle.dailyAvailability.activeCount,
      workforceGrowthPct: bundle.growthRatePct,
      attritionRatePct: bundle.attritionMetrics.value.overallAttritionRatePct,
      voluntaryAttritionCount: bundle.attritionMetrics.value.voluntaryAttritionCount,
      involuntaryAttritionCount: bundle.attritionMetrics.value.involuntaryAttritionCount,
      workforceCostTotal: null,
      averageCostPerEmployee: null,
      newHiresCount: bundle.newHiresCount,
      exitsCount: bundle.exitsCount,
      openPositionsCount: bundle.openPositionsCount,
      complianceRiskScore: health.overallHealthScorePct,
      criticalRisksCount: health.unresolvedActionItemsCount,
      managerCoveragePct: managerCoverage,
      profileCompletionPct: health.overallHealthScorePct,
      attendanceRatePct: bundle.dailyAvailability.presentRatePct,
      absenceRatePct: bundle.dailyAvailability.absenceRatePct,
      leaveRatePct: bundle.dailyAvailability.leaveRatePct,
    };
  }, [bundle]);

  // Export Executive Report Handler
  const handleExportReport = () => {
    if (!bundle) return;
    try {
      const lines = [
        `Executive HR Strategic Report - ${activeCompany?.legal_name || 'Joy Corporate Solutions Pvt Ltd'}`,
        `Generated: ${new Date().toISOString()}`,
        `Period: ${selectedPeriod}`,
        '',
        '--- EXECUTIVE SUMMARY ---',
        `Total Workforce: ${summaryMetrics.totalWorkforce}`,
        `Active Workforce: ${summaryMetrics.activeWorkforce}`,
        `Growth Rate: ${summaryMetrics.workforceGrowthPct ?? '0'}%`,
        `Attrition Rate: ${summaryMetrics.attritionRatePct ?? '0'}%`,
        `New Hires: ${summaryMetrics.newHiresCount}`,
        `Exits: ${summaryMetrics.exitsCount}`,
        `Open Positions: ${summaryMetrics.openPositionsCount}`,
        `Manager Coverage: ${summaryMetrics.managerCoveragePct}%`,
        `Profile Completeness: ${summaryMetrics.profileCompletionPct}%`,
        '',
        '--- DEPARTMENT SCORECARD ---',
        'Department,Headcount,Growth,Attrition,Attendance,Openings,Risk',
        ...bundle.departmentScorecards.map(
          (s) =>
            `"${s.departmentName}",${s.headcount},${s.growthPct}%,${s.attritionPct}%,${s.attendancePct}%,${s.openPositions},"${s.riskLevel}"`
        ),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', `Executive_HR_Overview_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Executive report exported to CSV.', 'success');
    } catch (err) {
      showToast('Export failed. Please try again.', 'error');
    }
  };

  if (isLoading || !bundle) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <DashboardErrorState errorMessage={error} onRetry={() => loadExecutiveData(true)} />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Context Bar */}
      <ExecutiveContextBar
        activeCompany={activeCompany}
        lastUpdatedText={`Updated ${lastUpdated.toLocaleTimeString()}`}
        isRefreshing={isRefreshing}
        isRealtimeConnected={isRealtimeConnected}
        selectedPeriod={selectedPeriod}
        comparisonMode={comparisonMode}
        onPeriodChange={setSelectedPeriod}
        onComparisonChange={setComparisonMode}
        onRefresh={() => loadExecutiveData(true)}
        onExport={handleExportReport}
      />

      {/* 2. 8 Executive Strategic KPIs */}
      <ExecutiveKpiCards metrics={summaryMetrics} onNavigate={navigate} />

      {/* 3. Executive People Insights */}
      <ExecutiveInsightsPanel insights={bundle.strategicInsights} onNavigate={navigate} />

      {/* 4. Workforce Scale vs People Cost Trends */}
      <ExecutiveGrowthAndCostTrends employees={bundle.employees} onNavigate={navigate} />

      {/* 5. Attrition Dynamics vs Hiring Pipeline */}
      <AttritionAndTalentPipeline
        employees={bundle.employees}
        jobOpenings={bundle.jobOpenings}
        onNavigate={navigate}
      />

      {/* 6. Workforce Plan vs Actual Headcount */}
      <WorkforcePlanVsActual scorecards={bundle.departmentScorecards} onNavigate={navigate} />

      {/* 7. Department Strategic Scorecard */}
      <DepartmentStrategicScorecard scorecards={bundle.departmentScorecards} onNavigate={navigate} />

      {/* 8. Organizational Health & Availability */}
      <OrganizationalHealthAndAvailability metrics={summaryMetrics} onNavigate={navigate} />

      {/* 9. People Risk & Leadership Decision Queue */}
      <PeopleRiskAndDecisionQueue
        decisions={bundle.strategicDecisions}
        criticalRisksCount={summaryMetrics.criticalRisksCount}
        onNavigate={navigate}
      />
    </div>
  );
};
