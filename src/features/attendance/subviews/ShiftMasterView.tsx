// src/features/attendance/subviews/ShiftMasterView.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Shift Management Master Console
// Multi-Tenant Shift Catalog, Visual Timelines, 5-Step Stepper Wizard & Scope Applicability
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  Clock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Sun,
  Moon,
  Zap,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  Users,
  Building,
  MoreVertical,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import {
  attendanceRosterService,
} from '../../../services/attendance/attendanceRosterService';
import { ShiftMaster, ShiftType, BreakMode } from '../../../types/shiftRoster';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { cn } from '../../../lib/utils';

export const ShiftMasterView: React.FC = () => {
  const { showToast } = useToast();
  const [shifts, setShifts] = useState<ShiftMaster[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ShiftType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  // Form State (5-Step Wizard)
  const [shiftName, setShiftName] = useState('General Day Shift');
  const [shiftCode, setShiftCode] = useState('GEN-09');
  const [description, setDescription] = useState('Standard corporate office working schedule');
  const [shiftType, setShiftType] = useState<ShiftType>('FIXED');

  // Step 2: Timing
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [crossMidnight, setCrossMidnight] = useState(false);
  const [attendanceDateCutoff, setAttendanceDateCutoff] = useState('06:00');

  // Step 3: Grace & Rules
  const [graceInMinutes, setGraceInMinutes] = useState(15);
  const [graceOutMinutes, setGraceOutMinutes] = useState(15);
  const [lateThresholdMinutes, setLateThresholdMinutes] = useState(30);
  const [minHoursFullDay, setMinHoursFullDay] = useState(8);
  const [minHoursHalfDay, setMinHoursHalfDay] = useState(4);

  // Step 4: Breaks
  const [breakMode, setBreakMode] = useState<BreakMode>('FIXED');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(60);

  // Step 5: Overtime & Applicability
  const [otEnabled, setOtEnabled] = useState(true);
  const [minOtThresholdMinutes, setMinOtThresholdMinutes] = useState(30);
  const [weekdayOtRate, setWeekdayOtRate] = useState(1.0);
  const [weeklyOffOtRate, setWeeklyOffOtRate] = useState(1.5);
  const [holidayOtRate, setHolidayOtRate] = useState(2.0);
  const [appliesToType, setAppliesToType] = useState<'ORGANIZATION' | 'DEPARTMENTS' | 'LOCATIONS'>('ORGANIZATION');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['Production', 'People & HR', 'Engineering']);

  const loadShifts = () => {
    setShifts(attendanceRosterService.getShifts());
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const resetForm = () => {
    setEditingShiftId(null);
    setWizardStep(1);
    setShiftName('General Day Shift');
    setShiftCode('GEN-09');
    setDescription('');
    setShiftType('FIXED');
    setStartTime('09:00');
    setEndTime('18:00');
    setCrossMidnight(false);
    setAttendanceDateCutoff('06:00');
    setGraceInMinutes(15);
    setGraceOutMinutes(15);
    setLateThresholdMinutes(30);
    setMinHoursFullDay(8);
    setMinHoursHalfDay(4);
    setBreakMode('FIXED');
    setBreakDurationMinutes(60);
    setOtEnabled(true);
    setMinOtThresholdMinutes(30);
    setWeekdayOtRate(1.0);
    setWeeklyOffOtRate(1.5);
    setHolidayOtRate(2.0);
    setAppliesToType('ORGANIZATION');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsWizardOpen(true);
  };

  const handleOpenEdit = (shift: ShiftMaster) => {
    setEditingShiftId(shift.id);
    setWizardStep(1);
    setShiftName(shift.shift_name);
    setShiftCode(shift.shift_code);
    setDescription(shift.description || '');
    setShiftType(shift.shift_type);
    setStartTime(shift.start_time);
    setEndTime(shift.end_time);
    setCrossMidnight(shift.cross_midnight);
    setAttendanceDateCutoff(shift.attendance_date_cutoff);
    setGraceInMinutes(shift.grace_in_minutes);
    setGraceOutMinutes(shift.grace_out_minutes);
    setLateThresholdMinutes(shift.late_threshold_minutes);
    setMinHoursFullDay(shift.min_hours_full_day);
    setMinHoursHalfDay(shift.min_hours_half_day);
    setBreakMode(shift.break_mode);
    setBreakDurationMinutes(shift.breaks[0]?.duration_minutes || 60);
    setOtEnabled(shift.ot_enabled);
    setMinOtThresholdMinutes(shift.min_ot_threshold_minutes);
    setWeekdayOtRate(shift.weekday_ot_rate);
    setWeeklyOffOtRate(shift.weekly_off_ot_rate);
    setHolidayOtRate(shift.holiday_ot_rate);
    setAppliesToType(shift.applies_to.type as any || 'ORGANIZATION');
    setIsWizardOpen(true);
  };

  const handleSaveShift = () => {
    attendanceRosterService.saveShift({
      id: editingShiftId || undefined,
      tenant_id: getActiveOrgId(),
      shift_code: shiftCode,
      shift_name: shiftName,
      description,
      shift_type: shiftType,
      start_time: startTime,
      end_time: endTime,
      scheduled_duration_minutes: 540,
      net_working_minutes: 480,
      cross_midnight: crossMidnight,
      attendance_date_cutoff: attendanceDateCutoff,
      grace_in_minutes: graceInMinutes,
      grace_out_minutes: graceOutMinutes,
      early_out_tolerance_minutes: 15,
      late_threshold_minutes: lateThresholdMinutes,
      min_hours_full_day: minHoursFullDay,
      min_hours_half_day: minHoursHalfDay,
      break_mode: breakMode,
      breaks: [{ id: 'b1', name: 'Meal Break', duration_minutes: breakDurationMinutes, is_paid: false }],
      ot_enabled: otEnabled,
      min_ot_threshold_minutes: minOtThresholdMinutes,
      weekday_ot_rate: weekdayOtRate,
      weekly_off_ot_rate: weeklyOffOtRate,
      holiday_ot_rate: holidayOtRate,
      requires_manager_approval: true,
      requires_hr_approval: false,
      applies_to: { type: appliesToType, ids: selectedDepartments },
      effective_from: '2026-01-01',
      status: 'ACTIVE',
    });

    showToast(editingShiftId ? `Shift ${shiftCode} updated successfully.` : `Shift ${shiftCode} created!`);
    setIsWizardOpen(false);
    loadShifts();
  };

  const handleDeleteShift = (shift: ShiftMaster) => {
    const res = attendanceRosterService.deleteShift(shift.id);
    showToast(res.message, res.success ? 'success' : 'error');
    loadShifts();
  };

  const filteredShifts = shifts.filter(s => {
    const matchesSearch =
      s.shift_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.shift_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (typeFilter !== 'ALL' && s.shift_type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb & Dominant CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <span>Attendance & Time</span>
            <span>/</span>
            <span>Configuration</span>
            <span>/</span>
            <span className="text-gray-900 font-bold">Shift Master</span>
            <Badge variant="gray" size="sm" className="text-[10px] font-mono ml-1">
              Tenant: {getActiveOrgId()}
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Shift Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure working schedules, grace thresholds, break modes, and cross-midnight shifts.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
          className="gap-2 rounded-xl text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-sm h-11 px-5"
        >
          <Plus className="w-4 h-4" />
          + Create Shift
        </Button>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search shifts by name, code, department..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {(['ALL', 'FIXED', 'ROTATIONAL', 'NIGHT_SHIFT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                  typeFilter === t ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                )}
              >
                {t === 'ALL' ? 'All Types' : t === 'NIGHT_SHIFT' ? 'Night Shift' : t}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadShifts}
            className="gap-1 text-xs rounded-xl border-gray-200 text-gray-600"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 3. Shifts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredShifts.map(shift => {
          const isNight = shift.cross_midnight || shift.shift_type === 'NIGHT_SHIFT';
          return (
            <Card
              key={shift.id}
              className="p-6 rounded-3xl bg-white border border-gray-200/80 hover:border-emerald-300 transition-all shadow-2xs space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      isNight ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                    )}
                  >
                    {isNight ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-gray-900">{shift.shift_name}</h3>
                      <Badge variant="gray" size="sm" className="font-mono text-[10px]">
                        {shift.shift_code}
                      </Badge>
                      <Badge
                        variant={shift.status === 'ACTIVE' ? 'emerald' : 'gray'}
                        size="sm"
                        className="text-[10px]"
                      >
                        {shift.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{shift.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(shift)}
                    className="h-8 w-8 p-0 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-600"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteShift(shift)}
                    className="h-8 w-8 p-0 rounded-xl border-rose-200 hover:bg-rose-50 text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Visual Shift Timing Bar */}
              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900 font-mono text-sm">{shift.start_time}</span>
                  <div className="flex-1 mx-4 h-0.5 bg-emerald-300 relative flex items-center justify-center">
                    <span className="bg-white px-2 text-[10px] font-bold text-emerald-800 rounded-full border border-emerald-200">
                      {Math.floor(shift.net_working_minutes / 60)}h {shift.net_working_minutes % 60}m net
                    </span>
                  </div>
                  <span className="font-bold text-gray-900 font-mono text-sm">
                    {shift.end_time} {isNight && <span className="text-[10px] text-indigo-700 font-sans block text-right">(Next Day)</span>}
                  </span>
                </div>
              </div>

              {/* Rules Summary Pill Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase">Grace In</span>
                  <span className="font-bold text-gray-900">{shift.grace_in_minutes} mins</span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase">Break Mode</span>
                  <span className="font-bold text-gray-900">{shift.break_mode}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase">Full Day Min</span>
                  <span className="font-bold text-gray-900">{shift.min_hours_full_day}h threshold</span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase">Overtime</span>
                  <span className="font-bold text-emerald-800">{shift.ot_enabled ? `>${shift.min_ot_threshold_minutes}m (1.5x)` : 'Disabled'}</span>
                </div>
              </div>

              {/* Scope & Applicability Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-gray-400" />
                  Applies to: <strong className="text-gray-700">{shift.applies_to.type}</strong>
                </span>
                <span className="text-[11px] text-gray-400 font-mono">v{shift.version} • Effective {shift.effective_from}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 4. 5-STEP CREATE/EDIT SHIFT WIZARD MODAL */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title={editingShiftId ? `Edit Shift Profile (${shiftCode})` : "Create New Shift Profile"}
        size="lg"
      >
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 text-xs">
            {[
              { s: 1, label: '1. Basic Info' },
              { s: 2, label: '2. Timing & Midnight' },
              { s: 3, label: '3. Grace & Rules' },
              { s: 4, label: '4. Break Mode' },
              { s: 5, label: '5. Overtime & Scope' },
            ].map(item => (
              <div key={item.s} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    wizardStep === item.s
                      ? "bg-[#07563D] text-white"
                      : wizardStep > item.s
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {wizardStep > item.s ? <Check className="w-3 h-3" /> : item.s}
                </div>
                <span className={cn("hidden sm:inline font-semibold", wizardStep === item.s ? "text-gray-900 font-bold" : "text-gray-400")}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* STEP 1: BASIC INFO */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Step 1: Shift Identification</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Shift Name</label>
                  <input
                    type="text"
                    value={shiftName}
                    onChange={e => setShiftName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Shift Code</label>
                  <input
                    type="text"
                    value={shiftCode}
                    onChange={e => setShiftCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1">Shift Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['FIXED', 'ROTATIONAL', 'NIGHT_SHIFT', 'FLEXIBLE', 'SPLIT_SHIFT', 'OPEN_SHIFT'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setShiftType(t)}
                        className={cn(
                          "p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer",
                          shiftType === t ? "border-[#07563D] bg-emerald-50 text-[#07563D]" : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        {t === 'NIGHT_SHIFT' ? 'Night / 24x7' : t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  variant="primary"
                  onClick={() => setWizardStep(2)}
                  className="gap-2 bg-[#07563D] text-white text-xs font-bold rounded-xl"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: TIMING & MIDNIGHT */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Step 2: Working Hours & Schedule</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Shift Start Time (Check-In)</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Shift End Time (Check-Out)</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                  />
                </div>

                <div className="sm:col-span-2 p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={crossMidnight}
                      onChange={e => setCrossMidnight(e.target.checked)}
                      className="rounded text-[#07563D] focus:ring-[#07563D]"
                    />
                    This shift spans across midnight (e.g. 22:00 PM to 06:00 AM next day)
                  </label>
                  {crossMidnight && (
                    <div className="pt-2 border-t border-gray-200 text-xs text-indigo-900">
                      <p className="font-semibold">Attendance Cutoff Hour: 06:00 AM</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        Punches after midnight will be automatically grouped into the shift start date's attendance card.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setWizardStep(1)} className="text-xs rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button variant="primary" onClick={() => setWizardStep(3)} className="bg-[#07563D] text-white text-xs font-bold rounded-xl">
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: GRACE & THRESHOLDS */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Step 3: Grace & Attendance Thresholds</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Check-in Grace Period (Mins)</label>
                  <input
                    type="number"
                    value={graceInMinutes}
                    onChange={e => setGraceInMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                  />
                  <span className="text-[11px] text-gray-400">Punches within {graceInMinutes}m marked On-Time</span>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Late Threshold (Mins)</label>
                  <input
                    type="number"
                    value={lateThresholdMinutes}
                    onChange={e => setLateThresholdMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                  />
                  <span className="text-[11px] text-gray-400">Arrival after {lateThresholdMinutes}m triggers Late mark</span>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Full Day Minimum (Hours)</label>
                  <input
                    type="number"
                    value={minHoursFullDay}
                    onChange={e => setMinHoursFullDay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Half Day Minimum (Hours)</label>
                  <input
                    type="number"
                    value={minHoursHalfDay}
                    onChange={e => setMinHoursHalfDay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center justify-between">
                <span>Rule Preview:</span>
                <span>8h+ = PRESENT | 4h-7h59 = HALF DAY | &lt;4h = ABSENT</span>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setWizardStep(2)} className="text-xs rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button variant="primary" onClick={() => setWizardStep(4)} className="bg-[#07563D] text-white text-xs font-bold rounded-xl">
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: BREAK CONFIGURATION */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Step 4: Break & Meal Policies</h3>
              <div className="grid grid-cols-2 gap-2">
                {(['FIXED', 'FLEXIBLE', 'PUNCH_BASED', 'NO_DEDUCTION'] as const).map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBreakMode(b)}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer",
                      breakMode === b ? "border-[#07563D] bg-emerald-50 text-[#07563D]" : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    {b === 'FIXED' ? 'Fixed Lunch (60m)' : b === 'PUNCH_BASED' ? 'Factory Punch-Based Break' : b}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Total Break Duration (Minutes)</label>
                <input
                  type="number"
                  value={breakDurationMinutes}
                  onChange={e => setBreakDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setWizardStep(3)} className="text-xs rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button variant="primary" onClick={() => setWizardStep(5)} className="bg-[#07563D] text-white text-xs font-bold rounded-xl">
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: OVERTIME & SCOPE */}
          {wizardStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Step 5: Overtime & Applicability Scope</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">OT Min Threshold</label>
                  <input
                    type="number"
                    value={minOtThresholdMinutes}
                    onChange={e => setMinOtThresholdMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200"
                  />
                  <span className="text-[10px] text-gray-400">OT starts after {minOtThresholdMinutes}m past shift end</span>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Weekday OT Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weekdayOtRate}
                    onChange={e => setWeekdayOtRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Weekend OT Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weeklyOffOtRate}
                    onChange={e => setWeeklyOffOtRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              {/* Applicability Scope */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-900 block">Who Does This Shift Apply To?</span>
                <div className="flex gap-3 text-xs">
                  {(['ORGANIZATION', 'DEPARTMENTS', 'LOCATIONS'] as const).map(t => (
                    <label key={t} className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-700">
                      <input
                        type="radio"
                        name="scope"
                        checked={appliesToType === t}
                        onChange={() => setAppliesToType(t)}
                        className="text-[#07563D]"
                      />
                      {t === 'ORGANIZATION' ? 'Entire Company (All)' : t}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-emerald-800 font-semibold pt-1">
                  ✓ Estimated Impact: Currently applies to 680 Employees across 2 locations.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setWizardStep(4)} className="text-xs rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveShift}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-xl px-6 gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save & Publish Shift
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
