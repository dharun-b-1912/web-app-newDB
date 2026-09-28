import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AttendanceDashboardView } from './subviews/AttendanceDashboardView';
import { EmployeeAttendanceView } from './subviews/EmployeeAttendanceView';
import { AttendanceHistoryView } from './subviews/AttendanceHistoryView';
import { ShiftMasterView } from './subviews/ShiftMasterView';
import { ShiftRosterCalendarView } from './subviews/ShiftRosterCalendarView';
import { AttendancePolicyConfigView } from './subviews/AttendancePolicyConfigView';
import { AttendanceRulesView } from './subviews/AttendanceRulesView';
import { BiometricIntegrationView } from './subviews/BiometricIntegrationView';
import { AttendanceCalendarView } from './subviews/AttendanceCalendarView';
import { RegularizationView } from './subviews/RegularizationView';
import { LateEarlyTrackingView } from './subviews/LateEarlyTrackingView';
import { AttendanceExceptionsView } from './subviews/AttendanceExceptionsView';
import { AttendanceCalculationAuditView } from './subviews/AttendanceCalculationAuditView';
import { HolidaysView } from './subviews/HolidaysView';
import { ApprovalCenterView } from './subviews/ApprovalCenterView';
import { AttendanceReportsView } from './subviews/AttendanceReportsView';
import { ManualAttendanceView } from './subviews/ManualAttendanceView';
import { TerminalLogLedgerView } from './subviews/TerminalLogLedgerView';
import { FaceRecognitionChannelView } from './subviews/FaceRecognitionChannelView';
import { GpsMobileChannelView } from './subviews/GpsMobileChannelView';
import { ClockingDevicesChannelView } from './subviews/ClockingDevicesChannelView';
import { PayrollInputsView } from './subviews/PayrollInputsView';
import { AuditControlView } from './subviews/AuditControlView';
import { EmployeeAttendanceProfileDrawer } from './components/EmployeeAttendanceProfileDrawer';

const WorkOvertimeMasterModule = lazy(() => import('../work/WorkOvertimeMasterModule').then(m => ({ default: m.WorkOvertimeMasterModule })));
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  FileCheck,
  TrendingUp,
  Laptop,
  Cpu,
  MapPin,
  Shield,
  CalendarDays,
  FileText,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Calculator,
  ScanFace,
  ArrowRightLeft,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { syncUrlWithRoute } from '../../lib/router/urlRouter';
import { navPerfTracker } from '../../services/observability/navigationPerfTracker';

export interface GlobalAttendanceFilterState {
  date: string;
  department: string;
  location: string;
  vendor: string;
  employmentType: string;
  shift: string;
  status: string;
  source: string;
  searchQuery: string;
  drilldownTileKey?: string;
  drilldownTileLabel?: string;
}

// High-fidelity instant skeleton fallback to make tab transitions feel instantaneous and responsive
interface AttendanceModuleMasterProps {
  currentSubPath?: string;
  onNavigateSubPath?: (subPath: string, params?: Record<string, string>, replace?: boolean) => void;
}

const AttendanceSubViewSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse" aria-label="Loading module content...">
    {/* Top Summary Bar Skeleton */}
    <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded-md" />
        <div className="h-7 w-64 bg-gray-200 rounded-lg" />
        <div className="h-3.5 w-96 bg-gray-100 rounded-md" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-28 bg-gray-100 rounded-xl" />
        <div className="h-10 w-32 bg-gray-200 rounded-xl" />
      </div>
    </div>

    {/* Metric Cards Skeleton Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-7 w-16 bg-gray-200 rounded-md" />
          <div className="h-2.5 w-24 bg-gray-100 rounded" />
        </div>
      ))}
    </div>

    {/* Table / Content Area Skeleton */}
    <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="h-9 w-64 bg-gray-100 rounded-xl" />
      </div>
      <div className="space-y-3 pt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center px-4 justify-between">
            <div className="h-4 w-36 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const AttendanceModuleMaster: React.FC<AttendanceModuleMasterProps> = ({
  currentSubPath = 'attendance-dashboard',
  onNavigateSubPath,
}) => {
  const [selectedEmployeeProfileId, setSelectedEmployeeProfileId] = useState<string | null>(null);
  const [selectedProfileDate, setSelectedProfileDate] = useState<string | undefined>(undefined);

  const resolveTab = (subPath?: string): string => {
    if (!subPath || subPath === 'attendance' || subPath === 'dashboard' || subPath === 'attendance-dashboard' || subPath === 'attendance/dashboard') {
      return 'attendance-dashboard';
    }
    if (
      subPath === 'attendance-employees' ||
      subPath === 'attendance/employees' ||
      subPath === 'employee-attendance' ||
      subPath === 'daily' ||
      subPath === 'employees'
    ) {
      return 'attendance-employees';
    }
    if (subPath === 'history' || subPath === 'attendance-history' || subPath === 'attendance/history' || subPath === 'ledger' || subPath === 'attendance/ledger') {
      return 'history';
    }
    if (subPath === 'late-early' || subPath === 'attendance/late-early') {
      return 'late-early';
    }
    if (subPath === 'regularization' || subPath === 'attendance/regularization') {
      return 'regularization';
    }
    if (subPath === 'exceptions' || subPath === 'attendance/exceptions') {
      return 'exceptions';
    }
    return subPath;
  };

  const [localTab, setLocalTab] = useState<string>(() => resolveTab(currentSubPath));

  // Keep localTab in sync whenever currentSubPath prop changes from router navigation
  useEffect(() => {
    setLocalTab(resolveTab(currentSubPath));
  }, [currentSubPath]);

  // Derive activeTab directly from localTab / currentSubPath for instantaneous subview switching
  const activeTab = resolveTab(localTab || currentSubPath);

  // Read initial filter state from URL if available
  const parseFiltersFromUrl = (): GlobalAttendanceFilterState => {
    const defaultDate = new Date().toISOString().split('T')[0];
    if (typeof window === 'undefined') {
      return {
        date: defaultDate,
        department: 'ALL',
        location: 'ALL',
        vendor: 'ALL',
        employmentType: 'ALL',
        shift: 'ALL',
        status: 'ALL',
        source: 'ALL',
        searchQuery: '',
      };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      date: params.get('att_date') || defaultDate,
      department: params.get('att_dept') || 'ALL',
      location: params.get('att_loc') || 'ALL',
      vendor: params.get('att_vendor') || 'ALL',
      employmentType: params.get('att_emptype') || 'ALL',
      shift: params.get('att_shift') || 'ALL',
      status: params.get('att_status') || 'ALL',
      source: params.get('att_source') || 'ALL',
      searchQuery: params.get('att_q') || '',
      drilldownTileKey: params.get('att_tile') || undefined,
      drilldownTileLabel: params.get('att_tile_lbl') || undefined,
    };
  };

  const buildParamsFromFilters = (filters: GlobalAttendanceFilterState): Record<string, string> => {
    const params: Record<string, string> = {};
    if (filters.date) params.att_date = filters.date;
    if (filters.department && filters.department !== 'ALL') params.att_dept = filters.department;
    if (filters.location && filters.location !== 'ALL') params.att_loc = filters.location;
    if (filters.vendor && filters.vendor !== 'ALL') params.att_vendor = filters.vendor;
    if (filters.employmentType && filters.employmentType !== 'ALL') params.att_emptype = filters.employmentType;
    if (filters.shift && filters.shift !== 'ALL') params.att_shift = filters.shift;
    if (filters.status && filters.status !== 'ALL') params.att_status = filters.status;
    if (filters.source && filters.source !== 'ALL') params.att_source = filters.source;
    if (filters.searchQuery) params.att_q = filters.searchQuery;
    if (filters.drilldownTileKey) params.att_tile = filters.drilldownTileKey;
    if (filters.drilldownTileLabel) params.att_tile_lbl = filters.drilldownTileLabel;
    return params;
  };

  const [activeFilters, setActiveFilters] = useState<GlobalAttendanceFilterState>(parseFiltersFromUrl);

  const subTabs = [
    { id: 'attendance-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance-employees', label: 'Employee Attendance', icon: Users },
    { id: 'history', label: 'Attendance History', icon: Clock },
    { id: 'shifts', label: 'Shift Master', icon: Clock },
    { id: 'roster', label: 'Shift Roster', icon: CalendarDays },
    { id: 'policies', label: 'Attendance Policies', icon: SlidersHorizontal },
    { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
    { id: 'attendance-rules', label: 'Attendance Rules', icon: Sliders },
    { id: 'gps', label: 'GPS & Mobile Channel', icon: MapPin },
    { id: 'face-attendance', label: 'Face Recognition', icon: ScanFace },
    { id: 'late-early', label: 'Late / Early Tracking', icon: Clock },
    { id: 'regularization', label: 'Regularization Desk', icon: FileCheck },
    { id: 'exceptions', label: 'Exceptions Queue', icon: AlertTriangle },
    { id: 'overtime', label: 'Overtime Engine', icon: TrendingUp },
    { id: 'calculation-audit', label: 'Live Transactions & Audit', icon: ShieldCheck },
  ];

  // Listen to browser Back and Forward popstate events to keep filters & tabs synchronized
  useEffect(() => {
    const handlePopState = () => {
      const urlFilters = parseFiltersFromUrl();
      setActiveFilters(urlFilters);
      const urlPath = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        setLocalTab(resolveTab(tabParam));
      } else if (urlPath.includes('/attendance/employees')) {
        setLocalTab('attendance-employees');
      } else if (urlPath === '/attendance' || urlPath === '/attendance/dashboard') {
        setLocalTab('attendance-dashboard');
      } else if (urlPath.includes('/attendance/history')) {
        setLocalTab('history');
      } else if (urlPath.includes('/attendance/late-early')) {
        setLocalTab('late-early');
      } else if (urlPath.includes('/attendance/regularization')) {
        setLocalTab('regularization');
      } else if (urlPath.includes('/attendance/exceptions')) {
        setLocalTab('exceptions');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state to URL with canonical route slugs for clean URLs and browser back/forward navigation
  const syncFiltersToUrl = (filters: GlobalAttendanceFilterState, tab: string, replace: boolean = true) => {
    if (typeof window === 'undefined') return;
    const params = buildParamsFromFilters(filters);
    syncUrlWithRoute(tab, params, replace);
  };

  const handleSelectTab = (tabId: string) => {
    const t0 = performance.now();
    const prevTab = activeTab;
    setLocalTab(tabId);
    const filterParams = buildParamsFromFilters(activeFilters);
    if (onNavigateSubPath) {
      onNavigateSubPath(tabId, filterParams, false);
    } else {
      syncFiltersToUrl(activeFilters, tabId, false);
    }
    const elapsed = performance.now() - t0;
    navPerfTracker.logImmediate('SUBVIEW_NAV', `/attendance/${prevTab}`, `/attendance/${tabId}`, elapsed, 'user_tab_navigation');
  };

  const openAttendanceDrilldown = (newFilters: Partial<GlobalAttendanceFilterState>, targetTab: string = 'attendance-employees') => {
    const merged: GlobalAttendanceFilterState = {
      ...activeFilters,
      ...newFilters,
    };
    setActiveFilters(merged);
    setLocalTab(targetTab);
    const filterParams = buildParamsFromFilters(merged);
    if (onNavigateSubPath) {
      onNavigateSubPath(targetTab, filterParams, false);
    } else {
      syncFiltersToUrl(merged, targetTab, false);
    }
  };

  const handleClearFilters = () => {
    const resetFilters: GlobalAttendanceFilterState = {
      date: activeFilters.date || new Date().toISOString().split('T')[0],
      department: 'ALL',
      location: 'ALL',
      vendor: 'ALL',
      employmentType: 'ALL',
      shift: 'ALL',
      status: 'ALL',
      source: 'ALL',
      searchQuery: '',
      drilldownTileKey: undefined,
      drilldownTileLabel: undefined,
    };
    setActiveFilters(resetFilters);
    const filterParams = buildParamsFromFilters(resetFilters);
    if (onNavigateSubPath) {
      onNavigateSubPath(activeTab, filterParams, true);
    } else {
      syncFiltersToUrl(resetFilters, activeTab, true);
    }
  };

  const handleBackToDashboard = () => {
    const resetFilters: GlobalAttendanceFilterState = {
      date: activeFilters.date || new Date().toISOString().split('T')[0],
      department: 'ALL',
      location: 'ALL',
      vendor: 'ALL',
      employmentType: 'ALL',
      shift: 'ALL',
      status: 'ALL',
      source: 'ALL',
      searchQuery: '',
      drilldownTileKey: undefined,
      drilldownTileLabel: undefined,
    };
    setActiveFilters(resetFilters);
    setLocalTab('attendance-dashboard');
    const filterParams = buildParamsFromFilters(resetFilters);
    if (onNavigateSubPath) {
      onNavigateSubPath('attendance-dashboard', filterParams, false);
    } else {
      syncFiltersToUrl(resetFilters, 'attendance-dashboard', false);
    }
  };

  const handleUpdateFilters = (updater: GlobalAttendanceFilterState) => {
    setActiveFilters(updater);
    const filterParams = buildParamsFromFilters(updater);
    if (onNavigateSubPath) {
      onNavigateSubPath(activeTab, filterParams, true);
    } else {
      syncFiltersToUrl(updater, activeTab, true);
    }
  };

  const renderActiveSubview = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'attendance':
      case 'attendance-dashboard':
        return (
          <AttendanceDashboardView
            filterState={activeFilters}
            onFilterChange={handleUpdateFilters}
            openAttendanceDrilldown={openAttendanceDrilldown}
            onOpenEmployeeProfile={(id) => {
              setSelectedEmployeeProfileId(id);
              setSelectedProfileDate(activeFilters.date);
            }}
          />
        );
      case 'employees':
      case 'attendance-employees':
      case 'employee-attendance':
      case 'daily':
        return (
          <EmployeeAttendanceView
            filterState={activeFilters}
            onFilterChange={handleUpdateFilters}
            onClearFilters={handleClearFilters}
            openAttendanceDrilldown={openAttendanceDrilldown}
            onOpenEmployeeProfile={(id, date) => {
              setSelectedEmployeeProfileId(id);
              setSelectedProfileDate(date || activeFilters.date);
            }}
            onOpenManualModal={() => handleSelectTab('manual')}
            onBackToDashboard={handleBackToDashboard}
          />
        );
      case 'history':
      case 'attendance-history':
      case 'ledger':
        return (
          <AttendanceHistoryView
            onOpenEmployeeProfile={(id, date) => {
              setSelectedEmployeeProfileId(id);
              setSelectedProfileDate(date || activeFilters.date);
            }}
            onNavigateSubPath={sub => handleSelectTab(sub)}
          />
        );
      case 'shifts':
        return <ShiftMasterView />;
      case 'roster':
        return <ShiftRosterCalendarView />;
      case 'shift-calendar':
      case 'calendar':
        return (
          <AttendanceCalendarView
            onNavigateSubPath={sub => handleSelectTab(sub)}
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
          />
        );
      case 'policies':
        return <AttendancePolicyConfigView />;
      case 'attendance-rules':
      case 'rules':
      case 'biometric-rules':
      case 'rules-engine':
        return <AttendanceRulesView onNavigateSubPath={sub => handleSelectTab(sub)} />;
      case 'biometric':
      case 'biometric-devices':
      case 'device-enrollment':
      case 'device-sync':
      case 'punch-mapping':
        return (
          <BiometricIntegrationView
            currentTab={activeTab}
            onNavigateSubPath={sub => handleSelectTab(sub)}
          />
        );
      case 'terminal-logs':
      case 'terminal-log':
      case 'device-logs':
      case 'raw-logs':
        return (
          <TerminalLogLedgerView
            onBack={() => handleSelectTab('biometric')}
          />
        );
      case 'face-attendance':
      case 'face-enrollment':
      case 'face-devices':
      case 'face-logs':
      case 'face-exceptions':
        return (
          <FaceRecognitionChannelView
            currentTab={activeTab}
            onNavigateSubPath={sub => handleSelectTab(sub)}
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
          />
        );
      case 'gps':
      case 'gps-attendance':
      case 'geofences':
      case 'staff-mapping':
      case 'mobile-clocking':
      case 'location-logs':
      case 'location-exceptions':
        return (
          <GpsMobileChannelView
            currentTab={activeTab}
            onNavigateSubPath={sub => handleSelectTab(sub)}
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
          />
        );
      case 'overtime':
      case 'overtime-requests':
      case 'wfh':
      case 'breaks-workhours':
        return <WorkOvertimeMasterModule initialTab={activeTab} />;
      case 'late-early':
        return (
          <LateEarlyTrackingView
            onNavigateSubPath={sub => handleSelectTab(sub)}
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
          />
        );
      case 'payroll-inputs':
      case 'payable-days':
      case 'lop-desk':
      case 'ot-pay-inputs':
      case 'payroll-freeze':
        return (
          <PayrollInputsView
            currentTab={activeTab}
            onNavigateSubPath={sub => handleSelectTab(sub)}
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
          />
        );
      case 'calculation-audit':
      case 'attendance-corrections':
      case 'approval-history':
      case 'attendance-activity-logs':
        return (
          <AuditControlView
            currentTab={activeTab}
            onNavigateSubPath={sub => handleSelectTab(sub)}
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
          />
        );
      case 'regularization':
        return (
          <RegularizationView
            onNavigateSubPath={sub => handleSelectTab(sub)}
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
          />
        );
      case 'exceptions':
        return (
          <AttendanceExceptionsView
            onNavigateSubPath={sub => handleSelectTab(sub)}
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
          />
        );
      case 'manual':
        return <ManualAttendanceView />;
      case 'holidays':
        return <HolidaysView />;
      case 'approvals':
        return <ApprovalCenterView />;
      case 'reports':
        return <AttendanceReportsView />;
      default:
        return (
          <AttendanceDashboardView
            filterState={activeFilters}
            onFilterChange={handleUpdateFilters}
            openAttendanceDrilldown={openAttendanceDrilldown}
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#07563D]/10 text-[#07563D]">
                <Clock className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">ATTENDANCE MASTER MODULE</h1>
              <span className="bg-[#07563D] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Joy PeopleHR Time Engine
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enterprise Time & Attendance Architecture — Multi-Device Biometrics, GPS Geofencing, Regularization, Overtime, and Payroll Integration
            </p>
          </div>
        </div>

        {/* Sub-navigation tabs scrollable strip with smooth hidden scroll */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2 pt-3 border-t border-gray-100 no-scrollbar scrollbar-none scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY * 0.9;
            }
          }}
        >
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const isActive =
              activeTab === tab.id ||
              ((tab.id === 'attendance-employees' || tab.id === 'employees') &&
                (activeTab === 'employees' || activeTab === 'attendance-employees' || activeTab === 'daily' || activeTab === 'employee-attendance')) ||
              ((tab.id === 'attendance-dashboard' || tab.id === 'dashboard') &&
                (activeTab === 'dashboard' || activeTab === 'attendance-dashboard' || activeTab === 'attendance'));
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#07563D]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Subview Content with instantaneous Lazy-loading */}
      <Suspense fallback={<AttendanceSubViewSkeleton />}>
        {renderActiveSubview()}
      </Suspense>

      {/* Production-Grade Employee Attendance Statement Modal Workspace */}
      <Suspense fallback={null}>
        <EmployeeAttendanceProfileDrawer
          employeeId={selectedEmployeeProfileId}
          initialDate={selectedProfileDate || activeFilters.date}
          onClose={() => {
            setSelectedEmployeeProfileId(null);
            setSelectedProfileDate(undefined);
          }}
          onNavigateEmployee={id => setSelectedEmployeeProfileId(id)}
          onNavigateSubPath={sub => handleSelectTab(sub)}
        />
      </Suspense>
    </div>
  );
};
