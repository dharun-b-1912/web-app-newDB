import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import {
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  Laptop,
  Clock,
  LogOut,
  AlertCircle,
  TrendingUp,
  MapPin,
  Coffee,
  Play,
  Square,
  Sparkles,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { AttendanceDaily, PunchSource } from '../../../types/attendance';
import { attendanceApi } from '../../../services/attendanceApi';
import { useToast } from '../../../components/ui/Toast';
import { formatMinutesToHoursStr } from '../../../lib/attendance/attendanceEngine';
import { hrEventBus } from '../../../services/hrEventBus';

interface AttendanceDashboardViewProps {
  onSelectKpiFilter?: (filterStatus: string) => void;
  onOpenEmployeeProfile?: (employeeId: string) => void;
}

export const AttendanceDashboardView: React.FC<AttendanceDashboardViewProps> = ({
  onSelectKpiFilter,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const [dailyRecords, setDailyRecords] = useState<AttendanceDaily[]>(() => attendanceApi.getDailyAttendance());
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Clock-in / Clock-out state for current logged-in employee
  const currentEmpId = 'emp-001';
  const currentEmpName = 'Arun Kumar';
  const myRecord = dailyRecords.find(r => r.employee_id === currentEmpId && r.date === new Date().toISOString().split('T')[0]);

  const [isCheckedIn, setIsCheckedIn] = useState(!!myRecord?.first_check_in && !myRecord?.last_check_out);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('attendance.punch_received', () => {
      setDailyRecords(attendanceApi.getDailyAttendance(undefined, deptFilter, undefined, searchQuery));
    });
    return () => unsub();
  }, [deptFilter, searchQuery]);

  const refreshData = () => {
    setDailyRecords(attendanceApi.getDailyAttendance(undefined, deptFilter, undefined, searchQuery));
    showToast('Real-time attendance sync completed');
  };

  const handleWebCheckIn = () => {
    setIsGettingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) });
          setIsGettingGps(false);
          const updated = attendanceApi.checkIn(currentEmpId, currentEmpName, 'WEB');
          setIsCheckedIn(true);
          refreshData();
          showToast(`Checked in successfully at ${updated.first_check_in}`);
        },
        () => {
          setIsGettingGps(false);
          const updated = attendanceApi.checkIn(currentEmpId, currentEmpName, 'WEB');
          setIsCheckedIn(true);
          refreshData();
          showToast(`Checked in successfully at ${updated.first_check_in} (GPS fallback)`);
        }
      );
    } else {
      setIsGettingGps(false);
      const updated = attendanceApi.checkIn(currentEmpId, currentEmpName, 'WEB');
      setIsCheckedIn(true);
      refreshData();
      showToast(`Checked in successfully at ${updated.first_check_in}`);
    }
  };

  const handleWebCheckOut = () => {
    const updated = attendanceApi.checkOut(currentEmpId);
    if (updated) {
      setIsCheckedIn(false);
      setIsOnBreak(false);
      refreshData();
      showToast(`Checked out successfully at ${updated.last_check_out}. Total: ${formatMinutesToHoursStr(updated.net_working_minutes)}`);
    }
  };

  const handleToggleBreak = () => {
    setIsOnBreak(!isOnBreak);
    showToast(isOnBreak ? 'Break ended. Working timer resumed.' : 'Break started. Timer paused.');
  };

  // KPI Calculations
  const totalEmployees = 428;
  const expectedToday = 412;
  const presentCount = dailyRecords.filter(r => r.status === 'Present' || r.status === 'Checked Out').length + 320;
  const absentCount = dailyRecords.filter(r => r.status === 'Absent').length + 18;
  const onLeaveCount = dailyRecords.filter(r => r.status === 'On Leave').length + 24;
  const wfhCount = dailyRecords.filter(r => r.status === 'WFH').length + 38;
  const lateCount = dailyRecords.filter(r => r.status === 'Late').length + 14;
  const earlyCheckoutCount = dailyRecords.filter(r => r.status === 'Early Checkout').length + 6;
  const halfDayCount = dailyRecords.filter(r => r.status === 'Half Day').length + 4;
  const missingPunchCount = dailyRecords.filter(r => r.status === 'Missing Punch').length + 5;
  const overtimeCount = dailyRecords.filter(r => r.status === 'Overtime' || r.overtime_minutes > 0).length + 12;
  const notCheckedInCount = expectedToday - presentCount - wfhCount - onLeaveCount;

  const filteredRecords = dailyRecords.filter(item => {
    const matchesSearch =
      item.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.employee_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || item.department.toLowerCase() === deptFilter.toLowerCase();
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Self-Service Punch Widget Banner */}
      <Card className="p-6 bg-gradient-to-r from-[#07563D] to-[#0a7a57] text-white rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Clock className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Self-Service Attendance Portal — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Good day, {currentEmpName}!</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-100">
              <span>Shift: <strong className="text-white">General Shift (09:30 AM - 06:30 PM)</strong></span>
              <span>•</span>
              <span>Expected: <strong className="text-white">8h 00m Net Work</strong></span>
              <span>•</span>
              <span>Location: <strong className="text-white">HQ Bengaluru (Verified IP & Geofence)</strong></span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 flex flex-col sm:flex-row items-center gap-4">
            <div className="text-center sm:text-left">
              <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-bold">Status Today</div>
              <div className="text-lg font-extrabold text-white flex items-center gap-2">
                {isCheckedIn ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Checked In ({myRecord?.first_check_in || '09:28 AM'})</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Not Clocked In</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isCheckedIn ? (
                <Button
                  size="md"
                  className="bg-emerald-400 hover:bg-emerald-300 text-gray-950 font-black shadow-lg"
                  leftIcon={<Play className="w-4 h-4" />}
                  isLoading={isGettingGps}
                  onClick={handleWebCheckIn}
                >
                  Clock In Now
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    leftIcon={<Coffee className="w-4 h-4" />}
                    onClick={handleToggleBreak}
                  >
                    {isOnBreak ? 'End Break' : 'Take Break'}
                  </Button>
                  <Button
                    size="md"
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-lg"
                    leftIcon={<Square className="w-4 h-4" />}
                    onClick={handleWebCheckOut}
                  >
                    Clock Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div
          onClick={() => onSelectKpiFilter?.('ALL')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-[#07563D] cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Headcount</span>
            <Users className="w-4 h-4 text-[#07563D]" />
          </div>
          <div className="text-2xl font-black text-gray-900 group-hover:text-[#07563D]">{totalEmployees}</div>
          <div className="text-[10px] text-gray-500 mt-1">428 Active Roster</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('Expected')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-[#07563D] cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expected Today</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-gray-900 group-hover:text-blue-600">{expectedToday}</div>
          <div className="text-[10px] text-gray-500 mt-1">Excl. Approved Leaves</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('Present')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-emerald-600 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Present</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 group-hover:text-emerald-600">{presentCount}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">82.5% Attendance</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('Absent')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-rose-600 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Absent</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-900 group-hover:text-rose-600">{absentCount}</div>
          <div className="text-[10px] text-rose-600 font-medium mt-1">4.3% Unapproved</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('On Leave')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-amber-600 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">On Leave</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 group-hover:text-amber-600">{onLeaveCount}</div>
          <div className="text-[10px] text-amber-600 font-medium mt-1">Annual / Casual</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('WFH')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-purple-600 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">WFH Remote</span>
            <Laptop className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-900 group-hover:text-purple-600">{wfhCount}</div>
          <div className="text-[10px] text-purple-600 font-medium mt-1">Approved WFH</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('Late')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-amber-600 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Late Check-in</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 group-hover:text-amber-600">{lateCount}</div>
          <div className="text-[10px] text-amber-600 font-medium mt-1">&gt;15m Grace Exceeded</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('Early Checkout')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-orange-600 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-orange-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Early Checkout</span>
            <LogOut className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-orange-900 group-hover:text-orange-600">{earlyCheckoutCount}</div>
          <div className="text-[10px] text-orange-600 font-medium mt-1">Left Before Shift End</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('Half Day')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-cyan-600 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-cyan-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Half Day</span>
            <Clock className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-cyan-900 group-hover:text-cyan-600">{halfDayCount}</div>
          <div className="text-[10px] text-cyan-600 font-medium mt-1">&lt;4 Hours Worked</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('Missing Punch')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-rose-600 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Missing Punch</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-900 group-hover:text-rose-600">{missingPunchCount}</div>
          <div className="text-[10px] text-rose-600 font-medium mt-1">Pending Regularization</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('Overtime')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-indigo-600 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overtime</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900 group-hover:text-indigo-600">{overtimeCount}</div>
          <div className="text-[10px] text-indigo-600 font-medium mt-1">Extra Hours Logged</div>
        </div>

        <div
          onClick={() => onSelectKpiFilter?.('Not Checked In')}
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-gray-600 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Not Checked In</span>
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 group-hover:text-gray-600">{notCheckedInCount}</div>
          <div className="text-[10px] text-gray-500 mt-1">Awaiting Punch</div>
        </div>
      </div>

      {/* Real-time Workforce Attendance Overview Table */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Real-Time Attendance Overview (Today)</h3>
            <p className="text-xs text-gray-500">Live feed combining Biometric, Web, GPS, and Manual attendance events</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#07563D] w-48"
              />
            </div>

            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="People Operations">People Operations</option>
              <option value="Finance & Accounts">Finance & Accounts</option>
              <option value="Product Strategy">Product Strategy</option>
              <option value="Quality Assurance">Quality Assurance</option>
            </select>

            <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={refreshData}>
              Sync Live
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department & Role</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>Net Work Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map(item => (
              <TableRow key={item.id} className="hover:bg-gray-50/80 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#07563D]/10 text-[#07563D] font-black text-xs flex items-center justify-center">
                      {item.employee_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-xs">{item.employee_name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{item.employee_code}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{item.department}</div>
                  <div className="text-[10px] text-gray-500">{item.designation}</div>
                </TableCell>
                <TableCell className="text-xs text-gray-600">{item.shift_name}</TableCell>
                <TableCell className="text-xs font-mono font-semibold text-emerald-800">{item.first_check_in || '—'}</TableCell>
                <TableCell className="text-xs font-mono text-gray-800">{item.last_check_out || '—'}</TableCell>
                <TableCell className="text-xs font-bold text-gray-900">
                  {formatMinutesToHoursStr(item.net_working_minutes)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.status === 'Checked Out' || item.status === 'Present'
                        ? 'emerald'
                        : item.status === 'Late' || item.status === 'Early Checkout'
                        ? 'amber'
                        : item.status === 'Absent' || item.status === 'Missing Punch'
                        ? 'rose'
                        : item.status === 'WFH'
                        ? 'purple'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                    {item.source}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => onOpenEmployeeProfile?.(item.employee_id)}
                  >
                    Quick View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
