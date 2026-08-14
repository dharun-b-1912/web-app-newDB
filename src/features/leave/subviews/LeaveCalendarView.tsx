import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveRequest, HolidayCalendar } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
} from 'lucide-react';

export const LeaveCalendarView: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day'>('Month');

  useEffect(() => {
    setRequests(leaveApi.getLeaveRequests());
    setCalendars(leaveApi.getHolidayCalendars());
  }, []);

  const daysInMonth = [
    { date: '2026-08-01', day: 'Sat', isWeekend: true },
    { date: '2026-08-02', day: 'Sun', isWeekend: true },
    { date: '2026-08-03', day: 'Mon' },
    { date: '2026-08-04', day: 'Tue' },
    { date: '2026-08-05', day: 'Wed' },
    { date: '2026-08-06', day: 'Thu' },
    { date: '2026-08-07', day: 'Fri' },
    { date: '2026-08-08', day: 'Sat', isWeekend: true },
    { date: '2026-08-09', day: 'Sun', isWeekend: true },
    { date: '2026-08-10', day: 'Mon' },
    { date: '2026-08-11', day: 'Tue' },
    { date: '2026-08-12', day: 'Wed', isToday: true },
    { date: '2026-08-13', day: 'Thu' },
    { date: '2026-08-14', day: 'Fri' },
    { date: '2026-08-15', day: 'Sat', isHoliday: true, holidayName: 'Independence Day' },
    { date: '2026-08-16', day: 'Sun', isWeekend: true },
    { date: '2026-08-17', day: 'Mon' },
    { date: '2026-08-18', day: 'Tue' },
    { date: '2026-08-19', day: 'Wed' },
    { date: '2026-08-20', day: 'Thu' },
    { date: '2026-08-21', day: 'Fri' },
    { date: '2026-08-22', day: 'Sat', isWeekend: true },
    { date: '2026-08-23', day: 'Sun', isWeekend: true },
    { date: '2026-08-24', day: 'Mon' },
    { date: '2026-08-25', day: 'Tue' },
    { date: '2026-08-26', day: 'Wed' },
    { date: '2026-08-27', day: 'Thu' },
    { date: '2026-08-28', day: 'Fri' },
    { date: '2026-08-29', day: 'Sat', isWeekend: true },
    { date: '2026-08-30', day: 'Sun', isWeekend: true },
    { date: '2026-08-31', day: 'Mon' },
  ];

  const filteredRequests = requests.filter(
    r => selectedDept === 'All' || r.department_name === selectedDept
  );

  return (
    <div className="space-y-6">
      {/* Calendar Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#07563D]/10 text-[#07563D]">
              <Calendar className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Enterprise Leave & Holiday Calendar</h2>
              <p className="text-xs text-gray-500">Cross-department staffing availability, public holidays, and team leave overlaps</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="p-2 border border-gray-300 rounded-xl text-xs font-bold bg-white"
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Product Management">Product Management</option>
              <option value="DevOps & Cloud">DevOps & Cloud</option>
            </select>

            <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
              {(['Month', 'Week', 'Day'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewMode === mode ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Warning Card */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-amber-900 font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Staffing Conflict Alert: Engineering department drops below 80% staffing threshold on August 18–21 (4 members requested leave).</span>
        </div>
        <Badge variant="amber" size="sm">
          Conflict Flagged
        </Badge>
      </div>

      {/* Calendar Grid Matrix */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button className="p-1 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
            <h3 className="text-base font-extrabold text-gray-900">August 2026</h3>
            <button className="p-1 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-gray-600">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Approved Leave</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending Request</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Public Holiday</span>
          </div>
        </div>

        {/* Calendar Days Cards Grid */}
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div key={i} className="text-center text-[11px] font-black text-gray-400 py-2 uppercase tracking-wider">
              {d}
            </div>
          ))}

          {daysInMonth.map((d, idx) => {
            const dayNum = parseInt(d.date.split('-')[2]);
            const onLeave = filteredRequests.filter(r => r.from_date <= d.date && r.to_date >= d.date);

            return (
              <div
                key={idx}
                className={`min-h-[90px] p-2 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                  d.isToday
                    ? 'border-[#07563D] bg-[#07563D]/5 shadow-2xs'
                    : d.isHoliday
                    ? 'border-purple-200 bg-purple-50/50'
                    : d.isWeekend
                    ? 'border-gray-100 bg-gray-50/60'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono font-bold ${d.isToday ? 'text-[#07563D] font-extrabold' : 'text-gray-900'}`}>
                    {dayNum}
                  </span>
                  {d.isHoliday && <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md">Holiday</span>}
                </div>

                <div className="space-y-1 my-1">
                  {d.isHoliday && <p className="text-[10px] font-bold text-purple-900 truncate">{d.holidayName}</p>}
                  {onLeave.map(req => (
                    <div
                      key={req.id}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate ${
                        req.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                      title={`${req.employee_name} (${req.leave_type_name})`}
                    >
                      {req.employee_name.split(' ')[0]} ({req.leave_type_code})
                    </div>
                  ))}
                </div>

                <div className="text-[10px] text-gray-400 font-medium">
                  {onLeave.length > 0 ? `${onLeave.length} On Leave` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
