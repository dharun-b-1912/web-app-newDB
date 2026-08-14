import React, { useState } from 'react';
import { AttendanceDashboardView } from './subviews/AttendanceDashboardView';
import { EmployeeAttendanceView } from './subviews/EmployeeAttendanceView';
import { AttendanceHistoryView } from './subviews/AttendanceHistoryView';
import { AttendanceCalendarView } from './subviews/AttendanceCalendarView';
import { RegularizationView } from './subviews/RegularizationView';
import { LateEarlyTrackingView } from './subviews/LateEarlyTrackingView';
import { OvertimeView } from './subviews/OvertimeView';
import { WfhView } from './subviews/WfhView';
import { BiometricIntegrationView } from './subviews/BiometricIntegrationView';
import { GpsAttendanceView } from './subviews/GpsAttendanceView';
import { ManualAttendanceView } from './subviews/ManualAttendanceView';
import { AttendancePoliciesView } from './subviews/AttendancePoliciesView';
import { ShiftScheduleView } from './subviews/ShiftScheduleView';
import { HolidaysView } from './subviews/HolidaysView';
import { ApprovalCenterView } from './subviews/ApprovalCenterView';
import { AttendanceReportsView } from './subviews/AttendanceReportsView';
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
} from 'lucide-react';

interface AttendanceModuleMasterProps {
  currentSubPath?: string;
  onNavigateSubPath?: (subPath: string) => void;
}

export const AttendanceModuleMaster: React.FC<AttendanceModuleMasterProps> = ({
  currentSubPath = 'dashboard',
  onNavigateSubPath,
}) => {
  const [selectedEmployeeProfileId, setSelectedEmployeeProfileId] = useState<string | null>(null);

  const subTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employee Attendance', icon: Users },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle },
    { id: 'regularization', label: 'Regularization', icon: FileCheck },
    { id: 'overtime', label: 'Overtime Engine', icon: TrendingUp },
    { id: 'wfh', label: 'WFH & Remote', icon: Laptop },
    { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
    { id: 'gps', label: 'GPS Geofencing', icon: MapPin },
    { id: 'late-early', label: 'Late / Early', icon: Clock },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'shifts', label: 'Shift Schedule', icon: Clock },
    { id: 'policies', label: 'Policies', icon: Sliders },
    { id: 'holidays', label: 'Holidays', icon: Calendar },
    { id: 'manual', label: 'Manual Entry', icon: Shield },
    { id: 'reports', label: 'Reports (16)', icon: FileText },
    { id: 'history', label: 'History Archives', icon: Clock },
  ];

  const handleSelectTab = (tabId: string) => {
    if (onNavigateSubPath) {
      onNavigateSubPath(tabId);
    }
  };

  const renderActiveSubview = () => {
    switch (currentSubPath) {
      case 'dashboard':
        return (
          <AttendanceDashboardView
            onSelectKpiFilter={filter => handleSelectTab('employees')}
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
          />
        );
      case 'employees':
      case 'daily':
        return (
          <EmployeeAttendanceView
            onOpenEmployeeProfile={id => setSelectedEmployeeProfileId(id)}
            onOpenManualModal={() => handleSelectTab('manual')}
          />
        );
      case 'history':
        return <AttendanceHistoryView />;
      case 'calendar':
        return <AttendanceCalendarView />;
      case 'regularization':
        return <RegularizationView />;
      case 'late-early':
        return <LateEarlyTrackingView />;
      case 'overtime':
        return <OvertimeView />;
      case 'wfh':
        return <WfhView />;
      case 'biometric':
        return <BiometricIntegrationView />;
      case 'gps':
        return <GpsAttendanceView />;
      case 'manual':
        return <ManualAttendanceView />;
      case 'policies':
        return <AttendancePoliciesView />;
      case 'shifts':
        return <ShiftScheduleView />;
      case 'holidays':
        return <HolidaysView />;
      case 'approvals':
        return <ApprovalCenterView />;
      case 'reports':
        return <AttendanceReportsView />;
      default:
        return (
          <AttendanceDashboardView
            onSelectKpiFilter={filter => handleSelectTab('employees')}
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
                WorkforceOS Time Engine
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enterprise Time & Attendance Architecture — Multi-Device Biometrics, GPS Geofencing, Regularization, Overtime, and Payroll Integration
            </p>
          </div>
        </div>

        {/* Sub-navigation tabs scrollable strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-t border-gray-100 pt-3">
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentSubPath === tab.id || (currentSubPath === 'daily' && tab.id === 'employees');
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60'
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

      {/* Quick Employee Attendance Profile Drawer */}
      <EmployeeAttendanceProfileDrawer
        employeeId={selectedEmployeeProfileId}
        onClose={() => setSelectedEmployeeProfileId(null)}
      />
    </div>
  );
};
