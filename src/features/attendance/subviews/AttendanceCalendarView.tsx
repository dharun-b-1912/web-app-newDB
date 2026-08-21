import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Users,
  Clock,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  FileEdit,
  ShieldAlert,
  ArrowRight,
  Laptop,
  Coffee,
  CalendarDays,
  Sparkles,
  Layers,
  X,
  Eye,
  RotateCcw,
} from 'lucide-react';
import {
  attendanceCalendarService,
  CalendarDaySummary,
  DayEmployeeRecord,
  MonthInsightMetrics,
} from '../../../services/attendance/attendanceCalendarService';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { usePermission } from '../../../hooks/usePermission';

export interface AttendanceCalendarViewProps {
  onNavigateSubPath?: (subPath: string) => void;
  onOpenEmployeeProfile?: (empId: string) => void;
}

export const AttendanceCalendarView: React.FC<AttendanceCalendarViewProps> = ({
  onNavigateSubPath,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const { primaryRole } = usePermission();

  // Calendar Date State (Dynamic current date, not hardcoded)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK' | 'DAY'>('MONTH');

  // Filter States
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedLoc, setSelectedLoc] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Date for Right-side Drawer
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [drawerEmployees, setDrawerEmployees] = useState<DayEmployeeRecord[]>([]);
  const [drawerFilter, setDrawerFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'EARLY' | 'ABSENT' | 'WFH' | 'LEAVE' | 'EXCEPTION'>('ALL');
  const [drawerSearch, setDrawerSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Month Grid & Metrics
  const [monthDays, setMonthDays] = useState<CalendarDaySummary[]>([]);
  const [metrics, setMetrics] = useState<MonthInsightMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const loadCalendarData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await attendanceCalendarService.getMonthlyCalendar(year, month, {
        department: selectedDept,
        location: selectedLoc,
        searchQuery,
      });
      setMonthDays(data.days);
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Failed to load attendance calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, selectedDept, selectedLoc, searchQuery]);

  const loadDrawerEmployees = useCallback(async (date: string) => {
    try {
      const emps = await attendanceCalendarService.getEmployeeRecordsForDate(date, {
        department: selectedDept,
        location: selectedLoc,
      });
      setDrawerEmployees(emps);
    } catch (err) {
      console.error('Failed to load date employee records:', err);
    }
  }, [selectedDept, selectedLoc]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  useEffect(() => {
    if (selectedDateStr) {
      loadDrawerEmployees(selectedDateStr);
    }
  }, [selectedDateStr, loadDrawerEmployees]);

  // Real-time synchronization via hrEventBus
  useEffect(() => {
    const unsub = hrEventBus.subscribe('*', () => {
      loadCalendarData();
      if (selectedDateStr) loadDrawerEmployees(selectedDateStr);
    });
    return () => unsub();
  }, [loadCalendarData, loadDrawerEmployees, selectedDateStr]);

  // Date Navigation
  const handlePrev = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'WEEK') {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    } else {
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 1);
      setCurrentDate(prev);
      setSelectedDateStr(prev.toISOString().split('T')[0]);
    }
  };

  const handleNext = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'WEEK') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 1);
      setCurrentDate(next);
      setSelectedDateStr(next.toISOString().split('T')[0]);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  const handleDayClick = (day: CalendarDaySummary) => {
    if (!day.isCurrentMonth) return;
    setSelectedDateStr(day.date);
    setIsDrawerOpen(true);
  };

  const selectedDaySummary = useMemo(() => {
    return monthDays.find(d => d.date === selectedDateStr);
  }, [monthDays, selectedDateStr]);

  const filteredDrawerEmployees = useMemo(() => {
    return drawerEmployees.filter(emp => {
      if (drawerFilter === 'PRESENT' && (emp.status !== 'Present' && emp.status !== 'Late' && emp.status !== 'Early Checkout')) return false;
      if (drawerFilter === 'LATE' && (!emp.late_minutes || emp.late_minutes <= 0)) return false;
      if (drawerFilter === 'EARLY' && (!emp.early_minutes || emp.early_minutes <= 0)) return false;
      if (drawerFilter === 'ABSENT' && emp.status !== 'Absent') return false;
      if (drawerFilter === 'WFH' && emp.status !== 'WFH') return false;
      if (drawerFilter === 'LEAVE' && emp.status !== 'On Leave') return false;
      if (drawerFilter === 'EXCEPTION' && !emp.hasException) return false;

      if (drawerSearch.trim()) {
        const q = drawerSearch.toLowerCase();
        return (
          emp.employee_name.toLowerCase().includes(q) ||
          emp.employee_code.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [drawerEmployees, drawerFilter, drawerSearch]);

  return (
    <div className="space-y-5">
      {/* 1. Master Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#07563D]/10 text-[#07563D]">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Attendance Calendar</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
              Workforce Pulse
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review workforce attendance health, scheduled shifts, leaves, and exceptions by date.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Switcher: Month | Week | Day */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold text-gray-700">
            <button
              onClick={() => setViewMode('MONTH')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                viewMode === 'MONTH' ? "bg-white text-gray-900 shadow-xs font-black" : "text-gray-600 hover:text-gray-900"
              )}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('WEEK')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                viewMode === 'WEEK' ? "bg-white text-gray-900 shadow-xs font-black" : "text-gray-600 hover:text-gray-900"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('DAY')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                viewMode === 'DAY' ? "bg-white text-gray-900 shadow-xs font-black" : "text-gray-600 hover:text-gray-900"
              )}
            >
              Day
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <Button variant="outline" size="xs" onClick={handlePrev} className="h-7 w-7 p-0">
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-black text-gray-900 px-2 min-w-[120px] text-center font-mono">
              {viewMode === 'DAY' ? (selectedDateStr || monthName) : monthName}
            </span>
            <Button variant="outline" size="xs" onClick={handleNext} className="h-7 w-7 p-0">
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs font-bold text-gray-700">
            Today
          </Button>
        </div>
      </div>

      {/* 2. Monthly Insight Strip (Real Data Only) */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
              <span>Attendance Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-1">
              {metrics.totalDaysWithData > 0 ? `${metrics.attendanceRate}%` : '--'}
            </div>
            <span className="text-[10px] text-gray-400">
              {metrics.totalDaysWithData > 0 ? `${metrics.totalPresent + metrics.totalWfh} of ${metrics.totalScheduled} scheduled` : 'No data logged for month'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
              <span>Late / Early Deviations</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-1">{metrics.totalLateEarly}</div>
            <span className="text-[10px] text-amber-700 font-semibold">Detected this month</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
              <span>Pending Regularizations</span>
              <FileEdit className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-1">{metrics.pendingRegularizations}</div>
            <span className="text-[10px] text-purple-700 font-semibold">In approval queues</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
              <span>Active Exceptions</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-1">{metrics.unresolvedExceptions}</div>
            <span className="text-[10px] text-rose-700 font-semibold">Requiring investigation</span>
          </div>
        </div>
      )}

      {/* 3. Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Scope:</span>
          </div>

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="People & HR">People & HR</option>
            <option value="Engineering">Engineering</option>
            <option value="Operations">Operations</option>
            <option value="Quality Assurance">Quality Assurance</option>
          </select>

          <select
            value={selectedLoc}
            onChange={e => setSelectedLoc(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Locations</option>
            <option value="Coimbatore HQ">Coimbatore HQ</option>
            <option value="Chennai Factory">Chennai Factory</option>
            <option value="Hosur Plant">Hosur Plant</option>
            <option value="Bangalore Office">Bangalore Office</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          />
        </div>
      </div>

      {/* 4. Main Calendar Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={cn("transition-all duration-300", isDrawerOpen ? "lg:col-span-8" : "lg:col-span-12")}>
          {viewMode === 'MONTH' && (
            <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 border-b border-gray-100 pb-2">
                <div>SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div>SAT</div>
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day, idx) => {
                  const isSelected = selectedDateStr === day.date;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "min-h-[105px] p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none relative group",
                        !day.isCurrentMonth && "bg-gray-50/50 border-gray-100 opacity-40 cursor-default",
                        day.isCurrentMonth && !day.isWeeklyOff && !day.isHoliday && "bg-white border-gray-200/90 hover:border-gray-400 hover:shadow-xs",
                        day.isWeeklyOff && "bg-gray-50/80 border-gray-100",
                        day.isHoliday && "bg-amber-50/50 border-amber-200/80",
                        day.isToday && "ring-2 ring-[#07563D]/30 border-[#07563D]",
                        isSelected && "ring-2 ring-[#07563D] border-[#07563D] shadow-sm bg-emerald-50/20"
                      )}
                    >
                      {/* Cell Header: Day Number & Badges */}
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs font-black",
                          day.isToday ? "text-[#07563D]" : day.isCurrentMonth ? "text-gray-900" : "text-gray-400"
                        )}>
                          {day.dayNumber}
                        </span>

                        {day.isToday && (
                          <span className="text-[9px] font-black uppercase bg-[#07563D] text-white px-1.5 py-0.2 rounded">
                            Today
                          </span>
                        )}

                        {day.isHoliday && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1 py-0.2 rounded truncate max-w-[80px]" title={day.holidayName}>
                            Holiday
                          </span>
                        )}
                      </div>

                      {/* Cell Body: Workforce Pulse Summary */}
                      {day.isCurrentMonth && (
                        <div className="space-y-1 my-1">
                          {day.isWeeklyOff ? (
                            <div className="text-[10px] text-gray-400 font-semibold text-center flex items-center justify-center gap-1 py-1">
                              <Coffee className="w-3 h-3 opacity-60" />
                              <span>Weekly Off</span>
                            </div>
                          ) : day.isHoliday ? (
                            <div className="text-[10px] text-amber-800 font-semibold text-center py-1 truncate">
                              {day.holidayName || 'Public Holiday'}
                            </div>
                          ) : (
                            <>
                              {/* Primary Metric: Present / Scheduled */}
                              {day.scheduled > 0 ? (
                                <div className="text-[11px] font-black text-gray-900">
                                  {day.present + day.wfh} <span className="text-gray-400 font-normal">/ {day.scheduled} Present</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-gray-400 italic">No schedule</div>
                              )}

                              {/* Secondary Chips */}
                              <div className="flex items-center gap-1 flex-wrap text-[9px] font-bold">
                                {day.wfh > 0 && (
                                  <span className="text-purple-700 bg-purple-50 px-1 py-0.2 rounded">
                                    {day.wfh} WFH
                                  </span>
                                )}
                                {day.leave > 0 && (
                                  <span className="text-blue-700 bg-blue-50 px-1 py-0.2 rounded">
                                    {day.leave} Leave
                                  </span>
                                )}
                                {day.absent > 0 && (
                                  <span className="text-rose-700 bg-rose-50 px-1 py-0.2 rounded">
                                    {day.absent} Absent
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Cell Footer: Issues Indicator */}
                      {day.isCurrentMonth && day.hasIssues && (
                        <div className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded flex items-center justify-between">
                          <span>⚠ {day.totalIssuesCount} Issue{day.totalIssuesCount > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {viewMode === 'WEEK' && (
            <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-gray-900">Operational Week Attendance Matrix</h3>
                <span className="text-xs text-gray-500">7-day continuous workforce timeline</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Shift</th>
                      {monthDays.slice(0, 7).map((d, i) => (
                        <th key={i} className="p-3 text-center">
                          {d.dayName} {d.dayNumber}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {drawerEmployees.slice(0, 10).map((emp, i) => (
                      <tr key={i} className="hover:bg-gray-50/70">
                        <td className="p-3 font-bold text-gray-900">{emp.employee_name}</td>
                        <td className="p-3 text-gray-500 font-medium">{emp.shift_name}</td>
                        {monthDays.slice(0, 7).map((d, j) => (
                          <td key={j} className="p-3 text-center">
                            {d.isWeeklyOff ? (
                              <span className="text-[10px] text-gray-400 font-semibold">OFF</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                                P (09:00 - 18:00)
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {viewMode === 'DAY' && selectedDaySummary && (
            <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Day Operations Workspace — {selectedDateStr}</h2>
                  <p className="text-xs text-gray-500">Real-time attendance timeline and employee punch verification</p>
                </div>
                <Badge variant="emerald" size="sm">Active Day Summary</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-semibold">Scheduled Workforce</span>
                  <div className="text-xl font-black text-gray-900 mt-1">{selectedDaySummary.scheduled}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-xs text-emerald-800 font-semibold">Actual Present</span>
                  <div className="text-xl font-black text-emerald-900 mt-1">{selectedDaySummary.present}</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <span className="text-xs text-purple-800 font-semibold">Remote (WFH)</span>
                  <div className="text-xl font-black text-purple-900 mt-1">{selectedDaySummary.wfh}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-xs text-amber-800 font-semibold">Flagged Issues</span>
                  <div className="text-xl font-black text-amber-900 mt-1">{selectedDaySummary.totalIssuesCount}</div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* 5. Right-Side Date Detail Drawer */}
        {isDrawerOpen && selectedDaySummary && (
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 space-y-4 relative">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900">Attendance — {selectedDateStr}</h3>
                <span className="text-[11px] text-gray-500 font-semibold">
                  {selectedDaySummary.isWeeklyOff ? 'Weekly Off Schedule' : selectedDaySummary.isHoliday ? selectedDaySummary.holidayName : `${selectedDaySummary.present + selectedDaySummary.wfh} / ${selectedDaySummary.scheduled} Working`}
                </span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Deep-Links */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  if (onNavigateSubPath) onNavigateSubPath('late-early');
                }}
                className="text-[11px] font-bold text-amber-800 border-amber-200 hover:bg-amber-50"
              >
                <Clock className="w-3 h-3 mr-1" />
                Late/Early ({selectedDaySummary.late + selectedDaySummary.early})
              </Button>

              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  if (onNavigateSubPath) onNavigateSubPath('regularization');
                }}
                className="text-[11px] font-bold text-purple-800 border-purple-200 hover:bg-purple-50"
              >
                <FileEdit className="w-3 h-3 mr-1" />
                Regularizations ({selectedDaySummary.regularizations})
              </Button>

              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  if (onNavigateSubPath) onNavigateSubPath('exceptions');
                }}
                className="text-[11px] font-bold text-rose-800 border-rose-200 hover:bg-rose-50"
              >
                <ShieldAlert className="w-3 h-3 mr-1" />
                Exceptions ({selectedDaySummary.exceptions})
              </Button>
            </div>

            {/* Quick Attention Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
              <button
                onClick={() => setDrawerFilter('ALL')}
                className={cn("px-2.5 py-1 rounded-lg transition-all", drawerFilter === 'ALL' ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600")}
              >
                All ({drawerEmployees.length})
              </button>
              <button
                onClick={() => setDrawerFilter('PRESENT')}
                className={cn("px-2.5 py-1 rounded-lg transition-all", drawerFilter === 'PRESENT' ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-800")}
              >
                Present
              </button>
              <button
                onClick={() => setDrawerFilter('LATE')}
                className={cn("px-2.5 py-1 rounded-lg transition-all", drawerFilter === 'LATE' ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-800")}
              >
                Late
              </button>
              <button
                onClick={() => setDrawerFilter('WFH')}
                className={cn("px-2.5 py-1 rounded-lg transition-all", drawerFilter === 'WFH' ? "bg-purple-700 text-white" : "bg-purple-50 text-purple-800")}
              >
                WFH
              </button>
            </div>

            {/* Drawer Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search date workforce..."
                value={drawerSearch}
                onChange={e => setDrawerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none"
              />
            </div>

            {/* Employee Records List */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredDrawerEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  <Users className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  No employees matching selected criteria.
                </div>
              ) : (
                filteredDrawerEmployees.map(emp => (
                  <div
                    key={emp.employee_id}
                    className="p-3 bg-gray-50/80 hover:bg-gray-100 rounded-xl border border-gray-200/60 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <button
                          onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(emp.employee_id)}
                          className="font-bold text-xs text-gray-900 hover:text-[#07563D] hover:underline text-left block"
                        >
                          {emp.employee_name}
                        </button>
                        <span className="text-[10px] text-gray-400 font-mono">{emp.employee_code} • {emp.department}</span>
                      </div>

                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded",
                        emp.status === 'Present' && "bg-emerald-100 text-emerald-800",
                        emp.status === 'Late' && "bg-amber-100 text-amber-800",
                        emp.status === 'Early Checkout' && "bg-orange-100 text-orange-800",
                        emp.status === 'WFH' && "bg-purple-100 text-purple-800",
                        emp.status === 'On Leave' && "bg-blue-100 text-blue-800",
                        emp.status === 'Absent' && "bg-rose-100 text-rose-800",
                        (emp.status === 'Weekly Off' || emp.status === 'Not Checked In') && "bg-gray-200 text-gray-700"
                      )}>
                        {emp.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-600 font-mono pt-1 border-t border-gray-200/40">
                      <span>Shift: {emp.shift_name}</span>
                      <span>IN: {emp.actual_in || '--:--'} | OUT: {emp.actual_out || '--:--'}</span>
                    </div>

                    {emp.late_minutes && emp.late_minutes > 0 ? (
                      <div className="text-[10px] text-rose-700 font-semibold">
                        Late Arrival: +{emp.late_minutes}m past scheduled start
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
