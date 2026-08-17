import React from 'react';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { User, Employee, Company } from '../../../types';
import { AttendanceDaily } from '../../../types/attendance';
import { Building2, MapPin, Briefcase, Clock, CheckCircle2, UserCheck, Play, Square, Loader2 } from 'lucide-react';

interface Props {
  user: User;
  employee: Employee;
  activeCompany: Company | null;
  attendanceState: 'NotCheckedIn' | 'CheckedIn' | 'CheckedOut' | 'OnBreak' | 'OnLeave' | 'Holiday' | 'WeeklyOff';
  todayAttendance: AttendanceDaily | null;
  workingDuration: string;
  onCheckIn: () => void;
  onCheckOut: () => void;
  isProcessing: boolean;
}

export const WorkspacePersonalHeader: React.FC<Props> = ({
  user,
  employee,
  activeCompany,
  attendanceState,
  todayAttendance,
  workingDuration,
  onCheckIn,
  onCheckOut,
  isProcessing,
}) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const fullName = employee.display_name || user.name || 'Hari Priya';
  const designation = employee.designation_title || 'HR Head';
  const department = employee.department_name || 'People & HR';
  const managerName = employee.employment?.reporting_manager_name || 'Dharun Joy (Company Admin)';
  const location = employee.branch_name || 'Coimbatore HQ';

  const isCheckedIn = attendanceState === 'CheckedIn';
  const isCheckedOut = attendanceState === 'CheckedOut';

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-2xs relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-100/40 via-transparent to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Left: Employee Identity */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <Avatar
          name={fullName}
          src={employee.avatar_url || user.avatar_url}
          size="2xl"
          className="w-20 h-20 sm:w-24 sm:h-24 text-2xl font-black shadow-md border-4 border-white shrink-0"
        />

        <div className="space-y-1.5 min-w-0">
          <div className="text-[10px] font-bold tracking-wider text-emerald-800 uppercase flex items-center gap-2">
            <span>WorkForceOS ESS Portal</span>
            <span>•</span>
            <span>Asia/Kolkata (IST)</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {greeting}, {fullName}!
            </h1>
            <Badge variant="emerald" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-bold px-2.5 py-0.5">
              Active
            </Badge>
            {employee.employee_code && (
              <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {employee.employee_code}
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
              {designation}
            </span>
            <span className="text-gray-300">•</span>
            <span>{department}</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500 font-semibold">Manager: {managerName}</span>
          </p>

          <p className="text-xs text-gray-500 flex items-center gap-4 pt-0.5 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              {activeCompany?.legal_name || 'Joy Corporate Solutions Pvt Ltd'}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {location}
            </span>
          </p>
        </div>
      </div>

      {/* Right: Live Today's Attendance Control Widget */}
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              Today's Attendance
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isCheckedIn ? 'bg-emerald-100 text-emerald-900' : isCheckedOut ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-900'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              {attendanceState === 'CheckedIn' ? 'Checked In' : attendanceState === 'CheckedOut' ? 'Checked Out' : 'Not Clocked In'}
            </span>
          </div>

          <div className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#07563D]" />
            {isCheckedIn ? (
              <span>{todayAttendance?.first_check_in || '09:12 AM'}</span>
            ) : isCheckedOut ? (
              <span>{todayAttendance?.last_check_out || '06:10 PM'}</span>
            ) : (
              <span className="text-gray-500 font-semibold text-base">Not Started</span>
            )}
          </div>

          <div className="text-[11px] text-gray-500 flex items-center gap-2">
            <span>Duration: <strong className="text-gray-800">{workingDuration}</strong></span>
            <span>•</span>
            <span>Office — {location}</span>
          </div>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          {isCheckedIn ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onCheckOut}
              disabled={isProcessing}
              leftIcon={isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 text-rose-600 fill-current" />}
              className="w-full sm:w-auto text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              {isProcessing ? 'Recording...' : 'Check Out'}
            </Button>
          ) : isCheckedOut ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              className="w-full sm:w-auto text-xs font-bold bg-gray-50 text-gray-500"
            >
              Shift Completed
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={onCheckIn}
              disabled={isProcessing}
              leftIcon={isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              className="w-full sm:w-auto text-xs font-bold shadow-sm"
            >
              {isProcessing ? 'Recording...' : 'Check In'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
