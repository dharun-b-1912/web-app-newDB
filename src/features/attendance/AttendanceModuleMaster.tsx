import React, { useState, useEffect } from 'react';
import { AttendanceDashboardView } from './subviews/AttendanceDashboardView';
import { EmployeeAttendanceView } from './subviews/EmployeeAttendanceView';
import { AttendanceHistoryView } from './subviews/AttendanceHistoryView';
import { AttendanceCalendarView } from './subviews/AttendanceCalendarView';
import { RegularizationView } from './subviews/RegularizationView';
import { LateEarlyTrackingView } from './subviews/LateEarlyTrackingView';
import { WorkOvertimeMasterModule } from '../work/WorkOvertimeMasterModule';
import { ShiftMasterView } from './subviews/ShiftMasterView';
import { ShiftRosterCalendarView } from './subviews/ShiftRosterCalendarView';
import { AttendancePolicyConfigView } from './subviews/AttendancePolicyConfigView';
import { AttendanceExceptionsView } from './subviews/AttendanceExceptionsView';
import { AttendanceCalculationAuditView } from './subviews/AttendanceCalculationAuditView';
import { HolidaysView } from './subviews/HolidaysView';
import { ApprovalCenterView } from './subviews/ApprovalCenterView';
import { AttendanceReportsView } from './subviews/AttendanceReportsView';
import { ManualAttendanceView } from './subviews/ManualAttendanceView';
import { BiometricIntegrationView } from './subviews/BiometricIntegrationView';
import { FaceRecognitionChannelView } from './subviews/FaceRecognitionChannelView';
import { GpsMobileChannelView } from './subviews/GpsMobileChannelView';
import { ClockingDevicesChannelView } from './subviews/ClockingDevicesChannelView';
import { PayrollInputsView } from './subviews/PayrollInputsView';
import { AuditControlView } from './subviews/AuditControlView';
import { EmployeeAttendanceProfileDrawer } from './components/EmployeeAttendanceProfileDrawer';
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
} from 'lucide-react';

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

interface AttendanceModuleMasterProps {
  currentSubPath?: string;
  onNavigateSubPath?: (subPath: string) => void;
}

export const AttendanceModuleMaster: React.FC<AttendanceModuleMasterProps> = ({
  currentSubPath = 'attendance-dashboard',
  onNavigateSubPath,
}) => {
  const [selectedEmployeeProfileId, setSelectedEmployeeProfileId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (!currentSubPath || currentSubPath === 'attendance' || currentSubPath === 'dashboard') {
      return 'attendance-dashboard';
    }
    return currentSubPath;
  });

  useEffect(() => {
    if (currentSubPath) {
      setActiveTab(
        currentSubPath === 'attendance' || currentSubPath === 'dashboard'
          ? 'attendance-dashboard'
          : currentSubPath
      );
    }
  }, [currentSubPath]);

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

  const [activeFilters, setActiveFilters] = useState<GlobalAttendanceFilterState>(parseFiltersFromUrl);

  // Sync state to URL for deep-linking & browser back/refresh reproducibility
  const syncFiltersToUrl = (filters: GlobalAttendanceFilterState, tab: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('att_tab', tab);
    if (filters.date) url.searchParams.set('att_date', filters.date);
    if (filters.department !== 'ALL') url.searchParams.set('att_dept', filters.department);
    else url.searchParams.delete('att_dept');
    if (filters.location !== 'ALL') url.searchParams.set('att_loc', filters.location);
    else url.searchParams.delete('att_loc');
    if (filters.vendor !== 'ALL') url.searchParams.set('att_vendor', filters.vendor);
    else url.searchParams.delete('att_vendor');
    if (filters.employmentType !== 'ALL') url.searchParams.set('att_emptype', filters.employmentType);
    else url.searchParams.delete('att_emptype');
    if (filters.shift !== 'ALL') url.searchParams.set('att_shift', filters.shift);
    else url.searchParams.delete('att_shift');
    if (filters.status !== 'ALL') url.searchParams.set('att_status', filters.status);
    else url.searchParams.delete('att_status');
    if (filters.source !== 'ALL') url.searchParams.set('att_source', filters.source);
    else url.searchParams.delete('att_source');
    if (filters.searchQuery) url.searchParams.set('att_q', filters.searchQuery);
    else url.searchParams.delete('att_q');
    if (filters.drilldownTileKey) url.searchParams.set('att_tile', filters.drilldownTileKey);
    else url.searchParams.delete('att_tile');
    if (filters.drilldownTileLabel) url.searchParams.set('att_tile_lbl', filters.drilldownTileLabel);
    else url.searchParams.delete('att_tile_lbl');

    window.history.replaceState({}, '', url.toString());
  };

  const subTabs = [
    { id: 'attendance-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance-employees', label: 'Employee Attendance', icon: Users },
    { id: 'history', label: 'Attendance History', icon: Clock },
    { id: 'shifts', label: 'Shift Master', icon: Clock },
    { id: 'roster', label: 'Shift Roster', icon: CalendarDays },
    { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
    { id: 'gps', label: 'GPS & Mobile Channel', icon: MapPin },
    { id: 'face-attendance', label: 'Face Recognition', icon: ScanFace },
    { id: 'late-early', label: 'Late / Early Tracking', icon: Clock },
    { id: 'regularization', label: 'Regularization Desk', icon: FileCheck },
    { id: 'exceptions', label: 'Exceptions Queue', icon: AlertTriangle },
    { id: 'overtime', label: 'Overtime Engine', icon: TrendingUp },
    { id: 'calculation-audit', label: 'Ledger & Audits', icon: ShieldCheck },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    syncFiltersToUrl(activeFilters, tabId);
    if (onNavigateSubPath) {
      onNavigateSubPath(tabId);
    }
  };

  const openAttendanceDrilldown = (newFilters: Partial<GlobalAttendanceFilterState>, targetTab: string = 'attendance-employees') => {
    const merged: GlobalAttendanceFilterState = {
      ...activeFilters,
      ...newFilters,
    };
    setActiveFilters(merged);
    setActiveTab(targetTab);
    syncFiltersToUrl(merged, targetTab);
    if (onNavigateSubPath) {
      onNavigateSubPath(targetTab);
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
    syncFiltersToUrl(resetFilters, activeTab);
  };

  const handleUpdateFilters = (updater: GlobalAttendanceFilterState) => {
    setActiveFilters(updater);
    syncFiltersToUrl(updater, activeTab);
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
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
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
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
            onOpenManualModal={() => handleSelectTab('manual')}
            onBackToDashboard={() => handleSelectTab('attendance-dashboard')}
          />
        );
      case 'history':
      case 'attendance-history':
      case 'ledger':
        return (
          <AttendanceHistoryView
            onOpenEmployeeProfile={(id, date) => setSelectedEmployeeProfileId(id)}
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
      case 'biometric':
      case 'biometric-devices':
      case 'device-enrollment':
      case 'device-sync':
      case 'punch-mapping':
      case 'device-logs':
        return (
          <BiometricIntegrationView
            currentTab={activeTab}
            onNavigateSubPath={sub => handleSelectTab(sub)}
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

        {/* Sub-navigation tabs scrollable strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-3 border-t border-gray-100 scrollbar-thin">
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

      {/* Render Subview Content */}
      {renderActiveSubview()}

      {/* Production-Grade Employee Attendance Statement Modal Workspace */}
      <EmployeeAttendanceProfileDrawer
        employeeId={selectedEmployeeProfileId}
        onClose={() => setSelectedEmployeeProfileId(null)}
        onNavigateEmployee={id => setSelectedEmployeeProfileId(id)}
        onNavigateSubPath={sub => handleSelectTab(sub)}
      />
    </div>
  );
};
