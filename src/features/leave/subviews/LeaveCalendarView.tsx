import React, { useState, useEffect, useMemo } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveRequest, HolidayCalendar, Holiday } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  AlertTriangle,
  Clock,
  Building,
  Search,
  MapPin,
  Sparkles,
  Download,
  FileSpreadsheet,
  X,
  Plus,
  Eye,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
  ArrowRight,
  UserCheck,
  UserX,
  Flame,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

export const LeaveCalendarView: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('All');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('All');
  const [searchEmployee, setSearchEmployee] = useState<string>('');
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day'>('Month');

  // Active Date Navigation State
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(7); // 0-indexed (7 = August)
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-18');
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    date: string;
    holiday?: Holiday;
    leaves: LeaveRequest[];
    isWeekend: boolean;
  } | null>(null);

  const loadData = () => {
    setRequests(leaveApi.getLeaveRequests());
    setCalendars(leaveApi.getHolidayCalendars());
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('leave.*', () => loadData());
    return () => unsub();
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Compile active holidays based on selected regional calendar
  const activeHolidays = useMemo(() => {
    if (selectedCalendarId === 'All') {
      return calendars.flatMap(c => c.holidays || []);
    }
    const cal = calendars.find(c => c.id === selectedCalendarId);
    return cal ? cal.holidays || [] : [];
  }, [calendars, selectedCalendarId]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchDept = selectedDept === 'All' || r.department_name === selectedDept;
      const matchLeaveType = selectedLeaveType === 'All' || r.leave_type_code === selectedLeaveType || r.leave_type_id === selectedLeaveType;
      const matchSearch =
        searchEmployee === '' ||
        r.employee_name.toLowerCase().includes(searchEmployee.toLowerCase()) ||
        r.request_code.toLowerCase().includes(searchEmployee.toLowerCase()) ||
        r.leave_type_name.toLowerCase().includes(searchEmployee.toLowerCase());

      return matchDept && matchLeaveType && matchSearch;
    });
  }, [requests, selectedDept, selectedLeaveType, searchEmployee]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleTodayJump = () => {
    const today = new Date();
    // Use 2026 if context is 2026
    setCurrentYear(2026);
    setCurrentMonth(7); // August 2026 default demo context
    setSelectedDate('2026-08-18');
  };

  // Compute month days grid
  const todayStr = '2026-08-26'; // Match global timeline context or today
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonthIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const daysInMonthGrid = useMemo(() => {
    return Array.from({ length: totalDaysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dt = new Date(`${dateStr}T00:00:00`);
      const dayOfWeek = dt.getDay(); // 0 = Sun, 6 = Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holidayMatch = activeHolidays.find(h => h.date === dateStr);

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const onLeave = filteredRequests.filter(r => r.from_date <= dateStr && r.to_date >= dateStr);

      return {
        date: dateStr,
        day: dayNames[dayOfWeek],
        dayOfWeek,
        isWeekend,
        isToday: dateStr === todayStr,
        holiday: holidayMatch,
        leaves: onLeave,
      };
    });
  }, [currentYear, currentMonth, totalDaysInMonth, activeHolidays, filteredRequests, todayStr]);

  // Week View calculation (7 days around selectedDate)
  const currentWeekDays = useMemo(() => {
    const baseDt = new Date(`${selectedDate}T00:00:00`);
    const dayOfWeek = baseDt.getDay();
    const sundayDt = new Date(baseDt);
    sundayDt.setDate(baseDt.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const cur = new Date(sundayDt);
      cur.setDate(sundayDt.getDate() + i);
      const curStr = cur.toISOString().split('T')[0];
      const dow = cur.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const holidayMatch = activeHolidays.find(h => h.date === curStr);
      const onLeave = filteredRequests.filter(r => r.from_date <= curStr && r.to_date >= curStr);

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      return {
        date: curStr,
        dayName: dayNames[dow],
        dayNum: cur.getDate(),
        isWeekend,
        isToday: curStr === todayStr,
        holiday: holidayMatch,
        leaves: onLeave,
      };
    });
  }, [selectedDate, activeHolidays, filteredRequests, todayStr]);

  // Day View calculation for selectedDate
  const dayViewData = useMemo(() => {
    const dt = new Date(`${selectedDate}T00:00:00`);
    const holidayMatch = activeHolidays.find(h => h.date === selectedDate);
    const onLeave = filteredRequests.filter(r => r.from_date <= selectedDate && r.to_date >= selectedDate);
    const dayOfWeek = dt.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      date: selectedDate,
      dayName: dayNames[dayOfWeek],
      isWeekend,
      holiday: holidayMatch,
      leaves: onLeave,
    };
  }, [selectedDate, activeHolidays, filteredRequests]);

  // Click on a date to open details modal
  const handleDateClick = (dateStr: string, holiday?: Holiday, leaves: LeaveRequest[] = [], isWeekend = false) => {
    setSelectedDate(dateStr);
    setSelectedDayDetail({
      date: dateStr,
      holiday,
      leaves,
      isWeekend,
    });
    setIsDayDetailModalOpen(true);
  };

  // Staffing Conflict Calculation: Flag dates with >= 3 members out in any department
  const highAbsenceDates = useMemo(() => {
    const counts: { [date: string]: number } = {};
    filteredRequests
      .filter(r => r.status === 'Approved')
      .forEach(r => {
        let cur = new Date(`${r.from_date}T00:00:00`);
        const end = new Date(`${r.to_date}T00:00:00`);
        while (cur <= end) {
          const ds = cur.toISOString().split('T')[0];
          counts[ds] = (counts[ds] || 0) + 1;
          cur.setDate(cur.getDate() + 1);
        }
      });

    const flagged = Object.entries(counts).filter(([_, count]) => count >= 3);
    return flagged;
  }, [filteredRequests]);

  // Export Calendar to CSV
  const exportCalendarCSV = () => {
    const headers = ['Date', 'Day', 'Holiday', 'Holiday Type', 'Employee On Leave', 'Leave Type', 'Status'];
    const rows: string[][] = [];

    daysInMonthGrid.forEach(d => {
      if (d.leaves.length === 0 && !d.holiday) {
        rows.push([`"${d.date}"`, `"${d.day}"`, `""`, `""`, `""`, `""`, `""`]);
      } else if (d.leaves.length === 0 && d.holiday) {
        rows.push([`"${d.date}"`, `"${d.day}"`, `"${d.holiday.name}"`, `"${d.holiday.type}"`, `""`, `""`, `""`]);
      } else {
        d.leaves.forEach(l => {
          rows.push([
            `"${d.date}"`,
            `"${d.day}"`,
            `"${d.holiday?.name || ''}"`,
            `"${d.holiday?.type || ''}"`,
            `"${l.employee_name}"`,
            `"${l.leave_type_name} (${l.leave_type_code})"`,
            `"${l.status}"`,
          ]);
        });
      }
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Enterprise_Leave_Calendar_${monthNames[currentMonth]}_${currentYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#07563D]/10 text-[#07563D]">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Enterprise Leave & Availability Calendar</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Cross-department staffing availability, public holidays, and scheduled team leaves
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Export */}
            <button
              onClick={exportCalendarCSV}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Export visible calendar records to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            {/* View Mode Toggle */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
              {(['Month', 'Week', 'Day'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    viewMode === mode
                      ? 'bg-[#07563D] text-white shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-xl font-bold bg-white text-gray-900 focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Product Management">Product Management</option>
              <option value="DevOps & Cloud">DevOps & Cloud</option>
              <option value="Design & UX">Design & UX</option>
              <option value="Operations">Operations</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Finance & Accounts">Finance & Accounts</option>
            </select>
          </div>

          {/* Regional Holiday Calendar Filter */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
              Regional Branch Calendar
            </label>
            <select
              value={selectedCalendarId}
              onChange={e => setSelectedCalendarId(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-xl font-bold bg-white text-gray-900 focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
            >
              <option value="All">All Regional Calendars</option>
              {calendars.map(cal => (
                <option key={cal.id} value={cal.id}>
                  {cal.name} ({cal.year})
                </option>
              ))}
            </select>
          </div>

          {/* Leave Type Filter */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
              Leave Type
            </label>
            <select
              value={selectedLeaveType}
              onChange={e => setSelectedLeaveType(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-xl font-bold bg-white text-gray-900 focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
            >
              <option value="All">All Leave Types</option>
              <option value="CL">Casual Leave (CL)</option>
              <option value="SL">Sick / Medical Leave (SL)</option>
              <option value="PL">Privilege / Annual Leave (PL)</option>
              <option value="ML">Maternity Leave (ML)</option>
              <option value="COMP">Compensatory Off (COMP)</option>
              <option value="LOP">Loss of Pay (LOP)</option>
            </select>
          </div>

          {/* Search Employee */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
              Search Employee
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name or ID..."
                value={searchEmployee}
                onChange={e => setSearchEmployee(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl font-medium bg-white text-gray-900 focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Staffing Risk / Alert Banner */}
      {highAbsenceDates.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 text-amber-900 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Staffing Capacity Notice: High concurrent leaves detected on{' '}
              {highAbsenceDates.map(([d, c]) => `${d} (${c} on leave)`).join(', ')}. Review approval queue to ensure adequate operational coverage.
            </span>
          </div>
          <Badge variant="amber" size="sm">
            Capacity Flagged
          </Badge>
        </div>
      )}

      {/* Main Calendar View Container */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 cursor-pointer"
                title="Previous Period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleTodayJump}
                className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-800 text-xs font-bold cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 cursor-pointer"
                title="Next Period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-base font-black text-gray-900 font-mono tracking-tight">
              {viewMode === 'Month' && `${monthNames[currentMonth]} ${currentYear}`}
              {viewMode === 'Week' && `Week of ${currentWeekDays[0]?.date} - ${currentWeekDays[6]?.date}`}
              {viewMode === 'Day' && `${dayViewData.dayName}, ${dayViewData.date}`}
            </h3>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Approved Leave</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Pending Approval</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span>Mandatory Holiday</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <span>Restricted Holiday</span>
            </span>
          </div>
        </div>

        {/* 1. MONTH VIEW */}
        {viewMode === 'Month' && (
          <div className="space-y-2 overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[760px]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <div
                  key={i}
                  className="text-center text-[11px] font-black text-gray-400 py-1.5 uppercase tracking-wider bg-gray-50/50 rounded-lg"
                >
                  {d}
                </div>
              ))}

              {/* Offset blanks for first day */}
              {Array.from({ length: firstDayOfMonthIndex }).map((_, bi) => (
                <div key={`blank-${bi}`} className="min-h-[110px] p-2 rounded-2xl bg-gray-50/30 border border-gray-100 opacity-40" />
              ))}

              {/* Days in Month */}
              {daysInMonthGrid.map(d => {
                const dayNum = parseInt(d.date.split('-')[2], 10);
                const approvedCount = d.leaves.filter(l => l.status === 'Approved').length;
                const pendingCount = d.leaves.filter(l => l.status === 'Pending' || l.status === 'Submitted').length;

                return (
                  <div
                    key={d.date}
                    onClick={() => handleDateClick(d.date, d.holiday, d.leaves, d.isWeekend)}
                    className={cn(
                      'min-h-[110px] p-2.5 rounded-2xl border text-xs flex flex-col justify-between transition-all cursor-pointer hover:shadow-md hover:border-[#07563D]',
                      d.isToday
                        ? 'border-[#07563D] bg-emerald-50/30 shadow-xs ring-1 ring-[#07563D]/20'
                        : d.holiday
                        ? d.holiday.type === 'Mandatory' || !d.holiday.is_optional
                          ? 'border-purple-200 bg-purple-50/40'
                          : 'border-indigo-200 bg-indigo-50/40'
                        : d.isWeekend
                        ? 'border-gray-100 bg-gray-50/60'
                        : 'border-gray-200 bg-white'
                    )}
                  >
                    {/* Top Row: Date & Holiday Pill */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'font-mono font-black text-xs',
                          d.isToday ? 'text-[#07563D]' : d.isWeekend ? 'text-gray-400' : 'text-gray-900'
                        )}
                      >
                        {dayNum}
                      </span>

                      {d.holiday && (
                        <span
                          className={cn(
                            'text-[9px] font-black px-1.5 py-0.5 rounded-md truncate max-w-[80px]',
                            d.holiday.type === 'Mandatory' || !d.holiday.is_optional
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-indigo-100 text-indigo-800'
                          )}
                          title={`${d.holiday.name} (${d.holiday.type})`}
                        >
                          {d.holiday.name}
                        </span>
                      )}
                    </div>

                    {/* Middle: Leave Pills */}
                    <div className="space-y-1 my-1 flex-1 overflow-hidden">
                      {d.leaves.slice(0, 3).map(req => (
                        <div
                          key={req.id}
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate flex items-center justify-between',
                            req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-200/60'
                              : 'bg-amber-100 text-amber-950 border border-amber-200/60'
                          )}
                          title={`${req.employee_name} (${req.leave_type_name}) - ${req.department_name}`}
                        >
                          <span className="truncate">{req.employee_name.split(' ')[0]}</span>
                          <span className="text-[9px] opacity-75 font-mono shrink-0 ml-1">
                            {req.leave_type_code}
                          </span>
                        </div>
                      ))}

                      {d.leaves.length > 3 && (
                        <div className="text-[9px] font-bold text-gray-500 pl-1">
                          +{d.leaves.length - 3} more
                        </div>
                      )}
                    </div>

                    {/* Bottom Status Counts */}
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium pt-1 border-t border-gray-100/60">
                      <span>{d.leaves.length > 0 ? `${d.leaves.length} on leave` : ''}</span>
                      {d.isToday && <span className="text-emerald-700 font-black">Today</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. WEEK VIEW */}
        {viewMode === 'Week' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {currentWeekDays.map(d => {
                return (
                  <div
                    key={d.date}
                    onClick={() => handleDateClick(d.date, d.holiday, d.leaves, d.isWeekend)}
                    className={cn(
                      'p-4 rounded-2xl border flex flex-col justify-between min-h-[260px] cursor-pointer transition-all hover:shadow-md hover:border-[#07563D]',
                      d.isToday
                        ? 'border-[#07563D] bg-emerald-50/30 ring-1 ring-[#07563D]/20'
                        : d.holiday
                        ? 'border-purple-200 bg-purple-50/40'
                        : d.isWeekend
                        ? 'border-gray-100 bg-gray-50/60'
                        : 'border-gray-200 bg-white'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <div>
                          <span className="text-[11px] font-extrabold text-gray-400 uppercase block">
                            {d.dayName}
                          </span>
                          <span className="text-lg font-black text-gray-900 font-mono">
                            {d.dayNum}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-gray-400 font-mono">{d.date.slice(5)}</span>
                      </div>

                      {d.holiday && (
                        <div className="mt-2 p-2 rounded-xl bg-purple-100 border border-purple-200 text-purple-900 text-xs">
                          <span className="font-extrabold block truncate">{d.holiday.name}</span>
                          <span className="text-[10px] opacity-80">{d.holiday.type} Holiday</span>
                        </div>
                      )}

                      {/* Leaves list for this day */}
                      <div className="space-y-1.5 mt-2">
                        {d.leaves.map(req => (
                          <div
                            key={req.id}
                            className={cn(
                              'p-2 rounded-xl text-xs font-bold border',
                              req.status === 'Approved'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                : 'bg-amber-50 border-amber-200 text-amber-950'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{req.employee_name}</span>
                              <Badge variant={req.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                                {req.leave_type_code}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-gray-500 font-normal block truncate mt-0.5">
                              {req.department_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 text-[11px] text-gray-400 font-bold flex items-center justify-between">
                      <span>{d.leaves.length} Staff on Leave</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. DAY VIEW */}
        {viewMode === 'Day' && (
          <div className="space-y-6">
            {/* Day Header Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100/60 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block">
                  {dayViewData.dayName} Schedule
                </span>
                <h3 className="text-xl font-black text-gray-900 font-mono mt-0.5">{dayViewData.date}</h3>
                {dayViewData.holiday && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-100 text-purple-900 text-xs font-extrabold border border-purple-200">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      {dayViewData.holiday.name} ({dayViewData.holiday.type} Holiday)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center min-w-[100px]">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Total on Leave</span>
                  <span className="text-xl font-black text-gray-900 font-mono">{dayViewData.leaves.length}</span>
                </div>
              </div>
            </div>

            {/* Employee Leaves List on this Date */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#07563D]" />
                <span>Employees On Leave ({dayViewData.leaves.length})</span>
              </h4>

              {dayViewData.leaves.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <UserCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <h5 className="text-sm font-bold text-gray-800">100% Team Availability</h5>
                  <p className="text-xs text-gray-500 mt-0.5">No employees scheduled on leave for this date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dayViewData.leaves.map(req => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#07563D]/10 text-[#07563D] font-black flex items-center justify-center text-sm font-mono shrink-0">
                            {req.employee_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="text-sm font-black text-gray-900">{req.employee_name}</h5>
                            <span className="text-xs text-gray-500 font-medium">{req.department_name}</span>
                          </div>
                        </div>

                        <Badge variant={req.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                          {req.status}
                        </Badge>
                      </div>

                      <div className="p-2.5 rounded-xl bg-gray-50 text-xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Leave Type</span>
                          <span className="font-extrabold text-gray-900">
                            {req.leave_type_name} ({req.leave_type_code})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Duration</span>
                          <span className="font-mono font-bold text-gray-800">
                            {req.from_date} to {req.to_date}
                          </span>
                        </div>
                      </div>

                      {req.reason && (
                        <p className="text-xs text-gray-600 bg-gray-50/50 p-2 rounded-lg italic">
                          "{req.reason}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Day Schedule & Leave Roster Interactive Modal */}
      {isDayDetailModalOpen && selectedDayDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5 text-[#07563D]">
                <div className="p-2 rounded-xl bg-[#07563D]/10">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    Day Schedule & Staffing Roster
                  </h3>
                  <span className="text-[11px] font-mono text-gray-500 font-bold">
                    {selectedDayDetail.date}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsDayDetailModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              {/* Holiday Notice if any */}
              {selectedDayDetail.holiday && (
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h4 className="font-black text-sm">{selectedDayDetail.holiday.name}</h4>
                  </div>
                  <p className="text-[11px] text-purple-800">
                    {selectedDayDetail.holiday.description || 'Statutory public holiday observance.'}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-purple-200 text-purple-900 font-bold text-[10px]">
                    {selectedDayDetail.holiday.type} Holiday
                  </span>
                </div>
              )}

              {/* Employees List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Staff On Leave ({selectedDayDetail.leaves.length})
                  </h4>
                </div>

                {selectedDayDetail.leaves.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <UserCheck className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                    <p className="font-bold text-gray-700">No scheduled leaves on this date</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayDetail.leaves.map(req => (
                      <div
                        key={req.id}
                        className="p-3 rounded-xl border border-gray-200 bg-white shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#07563D]/10 text-[#07563D] font-bold flex items-center justify-center text-xs font-mono">
                            {req.employee_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="font-extrabold text-gray-900">{req.employee_name}</h5>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {req.department_name} • {req.leave_type_name}
                            </span>
                          </div>
                        </div>

                        <Badge variant={req.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                          {req.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setIsDayDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#07563D] text-white font-bold text-xs hover:bg-[#05402e] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
