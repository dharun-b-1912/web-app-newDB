import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { supabase } from '../../../lib/supabase';
import {
  Clock,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Search,
  Sparkles,
  Building2,
  FileCheck2,
  Moon,
  Sun,
} from 'lucide-react';

interface EmployeeOption {
  id: string;
  employee_code: string;
  name: string;
  department: string;
  shift_id: string;
  shift_code: string;
  shift_name: string;
  shift_start: string;
  shift_end: string;
  grace_minutes: number;
  is_overnight: boolean;
  organization_id: string;
}

interface LocationOption {
  id: string;
  name: string;
  address: string;
}

interface ManualAttendanceViewProps {
  onBack?: () => void;
  initialEmployeeId?: string;
  initialDate?: string;
}

export const ManualAttendanceView: React.FC<ManualAttendanceViewProps> = ({
  onBack,
  initialEmployeeId,
  initialDate,
}) => {
  const { showToast } = useToast();

  // URL Query param ?att_date=YYYY-MM-DD or props
  const getInitialDate = () => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) return initialDate;
    try {
      const params = new URLSearchParams(window.location.search);
      const qDate = params.get('att_date');
      if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) return qDate;
    } catch {}
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };

  const getInitialEmpId = (empList: EmployeeOption[] = []) => {
    if (initialEmployeeId) return initialEmployeeId;
    try {
      const params = new URLSearchParams(window.location.search);
      const qEmp = params.get('att_emp') || params.get('emp_id') || params.get('employee_id');
      if (qEmp) return qEmp;

      const qShift = params.get('att_shift') || params.get('shift');
      if (qShift && empList.length > 0) {
        const matchShiftEmp = empList.find(e => e.shift_code.toUpperCase() === qShift.toUpperCase());
        if (matchShiftEmp) return matchShiftEmp.id;
      }
    } catch {}
    return '';
  };

  const [date, setDate] = useState<string>(getInitialDate());
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(getInitialEmpId());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [punchAction, setPunchAction] = useState<'CHECK_IN' | 'CHECK_OUT' | 'BOTH'>('CHECK_IN');
  const [checkInTime, setCheckInTime] = useState<string>('08:20');
  const [checkOutTime, setCheckOutTime] = useState<string>('17:30');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [customLocationName, setCustomLocationName] = useState<string>('Propel Unit 1');
  const [reason, setReason] = useState<string>('Employee on-site at assigned plant on time; location mapping pending on mobile app.');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ empName: string; timeStr: string; status: string } | null>(null);

  // Fetch Employees, Shifts, Shift Assignments, Departments, and Work Locations from Supabase
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoadingInitial(true);

        // 1. Fetch Employees
        const { data: empData } = await supabase
          .from('employees')
          .select('id, employee_code, first_name, last_name, display_name, department_id, organization_id')
          .is('deleted_at', null)
          .order('employee_code', { ascending: true });

        // 2. Fetch Departments
        const { data: deptData } = await supabase.from('departments').select('id, name');
        const deptMap = new Map((deptData || []).map(d => [d.id, d.name]));

        // 3. Fetch Shifts
        const { data: shiftData } = await supabase
          .from('shifts')
          .select('id, name, code, start_time, end_time, grace_entry_minutes, is_overnight');
        const shiftMap = new Map((shiftData || []).map(s => [s.id, s]));

        // 4. Fetch Shift Assignments
        const { data: assignData } = await supabase
          .from('employee_shift_assignments')
          .select('employee_id, shift_id')
          .is('effective_to', null);
        const assignMap = new Map((assignData || []).map(a => [a.employee_id, a.shift_id]));

        // 5. Fetch Work Locations
        const { data: locData } = await supabase
          .from('work_locations')
          .select('id, name, address_line1')
          .eq('is_active', true)
          .order('name', { ascending: true });

        const mappedLocs: LocationOption[] = (locData || []).map(l => ({
          id: l.id,
          name: l.name,
          address: l.address_line1 || '',
        }));
        setLocations(mappedLocs);

        // Pre-select Propel Industries if present
        const propelLoc = mappedLocs.find(l => /propel/i.test(l.name));
        if (propelLoc) {
          setSelectedLocationId(propelLoc.id);
        } else if (mappedLocs.length > 0) {
          setSelectedLocationId(mappedLocs[0].id);
        }

        // Map Employee list
        const defaultShift = Array.from(shiftMap.values())[0] || {
          id: 'shift-gen',
          code: 'GEN-09',
          name: 'General Corporate Shift',
          start_time: '08:30:00',
          end_time: '17:30:00',
          grace_entry_minutes: 30,
          is_overnight: false,
        };

        const mappedEmps: EmployeeOption[] = (empData || []).map(e => {
          const assignedShiftId = assignMap.get(e.id);
          const s = (assignedShiftId ? shiftMap.get(assignedShiftId) : null) || defaultShift;
          const isOvernight = Boolean(s.is_overnight || (s.code && (s.code.includes('NS') || s.code.includes('NGT'))));
          return {
            id: e.id,
            employee_code: e.employee_code,
            name: e.display_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Employee',
            department: deptMap.get(e.department_id) || 'General Operations',
            shift_id: s.id,
            shift_code: s.code || 'GEN-09',
            shift_name: s.name,
            shift_start: s.start_time ? s.start_time.slice(0, 5) : '08:30',
            shift_end: s.end_time ? s.end_time.slice(0, 5) : '17:30',
            grace_minutes: s.grace_entry_minutes ?? 15,
            is_overnight: isOvernight,
            organization_id: e.organization_id,
          };
        });

        setEmployees(mappedEmps);

        // Pre-select targeted employee if provided by URL or props, else first matching
        const initialTargetId = getInitialEmpId(mappedEmps);
        if (initialTargetId && mappedEmps.some(e => e.id === initialTargetId)) {
          setSelectedEmpId(initialTargetId);
        } else if (!selectedEmpId && mappedEmps.length > 0) {
          setSelectedEmpId(mappedEmps[0].id);
        }
      } catch (err) {
        console.error('Failed to load manual punch metadata:', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadMetadata();
  }, []);

  const filteredEmployees = employees.filter(e => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.employee_code.toLowerCase().includes(term) ||
      e.name.toLowerCase().includes(term) ||
      e.department.toLowerCase().includes(term) ||
      e.shift_code.toLowerCase().includes(term)
    );
  });

  // Keep selectedEmpId strictly synchronized with search results:
  // Whenever the filtered list changes, ensure selectedEmpId is one of the visible matching employees!
  useEffect(() => {
    if (filteredEmployees.length > 0) {
      const isCurrentSelectedVisible = filteredEmployees.some(e => e.id === selectedEmpId);
      if (!isCurrentSelectedVisible) {
        setSelectedEmpId(filteredEmployees[0].id);
      }
    }
  }, [filteredEmployees, selectedEmpId]);

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);

  // Auto-detect existing daily record for selected employee on selected date to pre-configure action & times
  useEffect(() => {
    if (!selectedEmpId || !date) return;
    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) return;

    let isMounted = true;
    const inspectExisting = async () => {
      try {
        const { data: rec } = await supabase
          .from('attendance_daily')
          .select('first_check_in, last_check_out')
          .eq('employee_id', selectedEmpId)
          .eq('attendance_date', date)
          .maybeSingle();

        if (!isMounted) return;

        let existingFirstIn = rec?.first_check_in;
        let existingLastOut = rec?.last_check_out;

        if (!existingFirstIn) {
          const { data: punchIn } = await supabase
            .from('attendance_punches')
            .select('punch_time')
            .eq('employee_id', selectedEmpId)
            .or(`attendance_date.eq.${date},punch_time.gte.${date}T00:00:00Z`)
            .in('punch_type', ['IN', 'CHECK_IN'])
            .order('punch_time', { ascending: true })
            .limit(1)
            .maybeSingle();
          if (punchIn) {
            existingFirstIn = punchIn.punch_time;
          }
        }

        if (existingFirstIn && !existingLastOut) {
          // Employee already checked in but has NO checkout punch (Missing Punch / In-Shift)
          setPunchAction('CHECK_OUT');
          const inTimeIst = new Date(existingFirstIn).toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          setCheckInTime(inTimeIst);
          setCheckOutTime(emp.shift_end || '07:30');
        } else if (existingFirstIn && existingLastOut) {
          // Both punches exist (Editing/Regularizing full session)
          setPunchAction('BOTH');
          const inTimeIst = new Date(existingFirstIn).toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const outTimeIst = new Date(existingLastOut).toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          setCheckInTime(inTimeIst);
          setCheckOutTime(outTimeIst);
        } else {
          // No punches yet: default to check-in with shift start
          setPunchAction('CHECK_IN');
          setCheckInTime(emp.shift_start || '08:30');
          setCheckOutTime(emp.shift_end || '17:30');
        }
      } catch (err) {
        console.warn('Notice inspecting existing daily punch:', err);
      }
    };

    inspectExisting();
    return () => {
      isMounted = false;
    };
  }, [selectedEmpId, date, employees]);

  // Quick preset reason handler
  const handleQuickReason = (text: string) => {
    setReason(text);
  };

  // Convert "HH:MM" (24h) to UTC timestamp for the designated date
  const convertIstTimeToUtcIso = (dateStr: string, time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    const istEpoch = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+05:30`);
    return istEpoch.toISOString();
  };

  // Compute next calendar date string (YYYY-MM-DD) for cross-midnight checkouts
  const getNextCalendarDateStr = (dateStr: string) => {
    const dObj = new Date(`${dateStr}T00:00:00Z`);
    dObj.setUTCDate(dObj.getUTCDate() + 1);
    return dObj.toISOString().split('T')[0];
  };

  const isCrossMidnight = Boolean(
    selectedEmployee?.is_overnight ||
    (checkInTime && checkOutTime && checkOutTime < checkInTime)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      showToast('Please select a valid employee.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      setSuccessInfo(null);

      const resolvedLoc = locations.find(l => l.id === selectedLocationId);
      const locName = customLocationName.trim()
        ? `${resolvedLoc?.name || ''} (${customLocationName.trim()})`.trim()
        : (resolvedLoc?.name || 'On-Site Client Facility');

      // For cross-midnight / overnight shifts, the checkout occurs on the NEXT calendar morning!
      const checkOutDateStr = isCrossMidnight ? getNextCalendarDateStr(date) : date;

      const checkInUtc = convertIstTimeToUtcIso(date, checkInTime);
      const checkOutUtc = punchAction !== 'CHECK_IN' ? convertIstTimeToUtcIso(checkOutDateStr, checkOutTime) : null;

      // 1. Calculate Lateness vs Shift Start & Grace
      const [inH, inM] = checkInTime.split(':').map(Number);
      const checkInMinutes = inH * 60 + inM;
      const [sH, sM] = selectedEmployee.shift_start.split(':').map(Number);
      const shiftStartMinutes = sH * 60 + sM;
      const graceMinutes = selectedEmployee.grace_minutes || 15;

      let lateMinutes = 0;
      if (checkInMinutes > shiftStartMinutes + graceMinutes) {
        lateMinutes = checkInMinutes - shiftStartMinutes;
      }

      // 2. Insert authoritative Punch Record into attendance_punches
      if (punchAction === 'CHECK_IN' || punchAction === 'BOTH') {
        const { error: pInErr } = await supabase.from('attendance_punches').insert({
          organization_id: selectedEmployee.organization_id,
          employee_id: selectedEmployee.id,
          punch_time: checkInUtc,
          punch_type: 'CHECK_IN',
          verification_mode: 'GPS',
          punch_source: 'MANUAL',
          work_location_id: selectedLocationId || null,
          location_authorized: true,
          attendance_date: date,
          is_processed: true,
        });

        if (pInErr) console.warn('Notice on punch insert:', pInErr);
      }

      if (punchAction === 'CHECK_OUT' || punchAction === 'BOTH') {
        if (checkOutUtc) {
          const { error: pOutErr } = await supabase.from('attendance_punches').insert({
            organization_id: selectedEmployee.organization_id,
            employee_id: selectedEmployee.id,
            punch_time: checkOutUtc,
            punch_type: 'CHECK_OUT',
            verification_mode: 'GPS',
            punch_source: 'MANUAL',
            work_location_id: selectedLocationId || null,
            location_authorized: true,
            attendance_date: date, // Shift work date remains the work date!
            is_processed: true,
          });

          if (pOutErr) console.warn('Notice on checkout punch insert:', pOutErr);
        }
      }

      // 3. Upsert or update attendance_daily canonical ledger
      const { data: existingDaily } = await supabase
        .from('attendance_daily')
        .select('*')
        .eq('employee_id', selectedEmployee.id)
        .eq('attendance_date', date)
        .maybeSingle();

      const updatedCheckIn = (punchAction === 'CHECK_IN' || punchAction === 'BOTH') ? checkInUtc : (existingDaily?.first_check_in || checkInUtc);
      const updatedCheckOut = (punchAction === 'CHECK_OUT' || punchAction === 'BOTH') ? checkOutUtc : (existingDaily?.last_check_out || null);

      let totalWorkMinutes = existingDaily?.total_work_minutes || 0;
      if (updatedCheckIn && updatedCheckOut) {
        const diffMs = new Date(updatedCheckOut).getTime() - new Date(updatedCheckIn).getTime();
        if (diffMs > 0) {
          totalWorkMinutes = Math.round(diffMs / 60000);
        }
      }

      const dailyPayload: any = {
        organization_id: selectedEmployee.organization_id,
        employee_id: selectedEmployee.id,
        attendance_date: date,
        shift_id: selectedEmployee.shift_id,
        first_check_in: updatedCheckIn,
        last_check_out: updatedCheckOut,
        late_entry_minutes: lateMinutes,
        total_work_minutes: totalWorkMinutes,
        is_regularized: true,
        status: 'PRESENT',
        check_in_work_location_id: selectedLocationId || null,
        check_in_location_name: locName,
        updated_at: new Date().toISOString(),
      };

      if (punchAction === 'CHECK_IN') {
        dailyPayload.check_in_source = 'MANUAL';
      } else if (punchAction === 'CHECK_OUT') {
        dailyPayload.check_in_source = existingDaily?.check_in_source || 'MOBILE';
        dailyPayload.check_out_source = 'MANUAL';
      } else if (punchAction === 'BOTH') {
        dailyPayload.check_in_source = 'MANUAL';
        dailyPayload.check_out_source = 'MANUAL';
      }

      let canonicalDailyId = existingDaily?.id;
      if (existingDaily) {
        await supabase
          .from('attendance_daily')
          .update(dailyPayload)
          .eq('id', existingDaily.id);
      } else {
        const { data: newDaily } = await supabase
          .from('attendance_daily')
          .insert({
            ...dailyPayload,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        canonicalDailyId = newDaily?.id;
      }

      // Call database authoritative recalculation RPC
      if (canonicalDailyId) {
        try {
          await supabase.rpc('fn_recalculate_daily_attendance', { p_daily_id: canonicalDailyId });
        } catch (rpcErr) {
          console.warn('RPC recalculate notice:', rpcErr);
        }
      }

      const timingStatus = lateMinutes === 0 ? 'On Time' : `Late ${lateMinutes}m`;
      const actionSummary = punchAction === 'CHECK_IN'
        ? `Check-in at ${checkInTime} IST`
        : punchAction === 'CHECK_OUT'
          ? `Check-out at ${checkOutTime} IST (${isCrossMidnight ? 'Next Morning' : 'Same Day'})`
          : `${checkInTime} IST → ${checkOutTime} IST (${Math.floor(totalWorkMinutes / 60)}h ${totalWorkMinutes % 60}m)`;

      setSuccessInfo({
        empName: selectedEmployee.name,
        timeStr: `${actionSummary} (${locName})`,
        status: timingStatus,
      });

      showToast(`Manual punch successfully recorded for ${selectedEmployee.name}. Synchronized to official daily attendance.`);
    } catch (err: any) {
      console.error('Error submitting manual punch:', err);
      showToast(err.message || 'Failed to submit manual punch.', 'error');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="text-xs font-semibold"
            >
              Back to Ledger
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Manual Punch & Attendance Regularization</h2>
              <Badge variant="emerald" className="text-[10px] uppercase font-bold tracking-wider">HR Desk Master</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Authoritative HR clock-in/out override and missing punch resolution. Accurately handles Day Shifts and Overnight Cross-Midnight Shifts.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Success Alert Banner */}
      {successInfo && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs flex items-start justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-950">Manual Punch Successfully Recorded & Synchronized!</h4>
              <p className="text-xs text-emerald-800">
                Logged <span className="font-bold">{successInfo.timeStr}</span> for <span className="font-bold">{successInfo.empName}</span>.
                Status evaluated as <span className="font-bold">{successInfo.status}</span>.
                Official daily ledger updated; real-time dashboard and exports updated immediately.
              </p>
            </div>
          </div>
          {onBack && (
            <Button size="sm" onClick={onBack} className="text-xs font-bold bg-[#07563D] hover:bg-[#064e37] shrink-0">
              View in Employee Ledger
            </Button>
          )}
        </div>
      )}

      {/* 3. Main Form */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section A: Employee Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#07563D]" />
                1. Select Active Employee
              </label>
              <span className="text-[11px] text-gray-500 font-medium">
                {employees.length} Active Staff in Organization
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by Employee Code, Name, or Department..."
                value={searchTerm}
                onChange={e => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  if (val.trim()) {
                    const t = val.toLowerCase();
                    const matched = employees.filter(emp => (
                      emp.employee_code.toLowerCase().includes(t) ||
                      emp.name.toLowerCase().includes(t) ||
                      emp.department.toLowerCase().includes(t) ||
                      emp.shift_code.toLowerCase().includes(t)
                    ));
                    if (matched.length > 0) {
                      setSelectedEmpId(matched[0].id);
                    }
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
              />
            </div>

            <select
              value={selectedEmpId}
              onChange={e => {
                setSelectedEmpId(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#07563D] outline-none bg-white cursor-pointer"
              required
            >
              {filteredEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  [{emp.employee_code}] {emp.name} — {emp.department} ({emp.shift_code}: {emp.shift_start} to {emp.shift_end}{emp.is_overnight ? ' [Overnight]' : ''})
                </option>
              ))}
            </select>

            {selectedEmployee && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Employee:</span> <span className="font-bold text-gray-900">{selectedEmployee.name} ({selectedEmployee.employee_code})</span>
                </div>
                <div>
                  <span className="text-gray-500">Department:</span> <span className="font-semibold text-gray-800">{selectedEmployee.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Assigned Shift:</span>
                  <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                    {selectedEmployee.shift_code} ({selectedEmployee.shift_start} - {selectedEmployee.shift_end})
                  </span>
                  {selectedEmployee.is_overnight && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      <Moon className="w-3 h-3 text-indigo-600" />
                      Night Shift (Spans Midnight)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section B: Date and Direction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#07563D]" />
                2. Shift Business Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#07563D] outline-none"
                required
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                The date the shift officially began (work date).
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#07563D]" />
                3. Punch Action Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPunchAction('CHECK_IN')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    punchAction === 'CHECK_IN'
                      ? 'bg-[#07563D] text-white border-[#07563D] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Check-In
                </button>
                <button
                  type="button"
                  onClick={() => setPunchAction('CHECK_OUT')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    punchAction === 'CHECK_OUT'
                      ? 'bg-[#07563D] text-white border-[#07563D] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Check-Out
                </button>
                <button
                  type="button"
                  onClick={() => setPunchAction('BOTH')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    punchAction === 'BOTH'
                      ? 'bg-[#07563D] text-white border-[#07563D] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Full Session
                </button>
              </div>
            </div>
          </div>

          {/* Section C: Timing Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {(punchAction === 'CHECK_IN' || punchAction === 'BOTH') && (
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5">
                  Actual Check-In Time (IST)
                </label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={e => setCheckInTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#07563D] outline-none"
                  required
                />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {selectedEmployee?.is_overnight ? (
                    ['19:00', '19:15', '19:30', '19:42', '20:00'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCheckInTime(t)}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-900 text-[11px] font-semibold rounded-md border border-gray-200 transition-colors"
                      >
                        {t} PM
                      </button>
                    ))
                  ) : (
                    ['08:00', '08:15', '08:30', '09:00', '09:30'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCheckInTime(t)}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-900 text-[11px] font-semibold rounded-md border border-gray-200 transition-colors"
                      >
                        {t} AM
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {(punchAction === 'CHECK_OUT' || punchAction === 'BOTH') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Actual Check-Out Time (IST)
                  </label>
                  {isCrossMidnight && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      🌅 Next Morning: {getNextCalendarDateStr(date)}
                    </span>
                  )}
                </div>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={e => setCheckOutTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#07563D] outline-none"
                  required
                />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {selectedEmployee?.is_overnight ? (
                    ['07:00', '07:15', '07:30', '07:45', '08:00'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCheckOutTime(t)}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-900 text-[11px] font-semibold rounded-md border border-gray-200 transition-colors"
                      >
                        {t} AM (Next Day)
                      </button>
                    ))
                  ) : (
                    ['16:30', '17:00', '17:30', '18:00', '18:30'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCheckOutTime(t)}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-900 text-[11px] font-semibold rounded-md border border-gray-200 transition-colors"
                      >
                        {parseInt(t.split(':')[0]) - 12}:{t.split(':')[1]} PM
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cross-Midnight Guidance Notice */}
          {isCrossMidnight && (
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-indigo-900">
              <Moon className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Overnight Shift Cross-Midnight Handling:</span>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  This shift spans midnight. Check-in is anchored to <span className="font-bold font-mono">{date}</span> at <span className="font-mono font-bold">{checkInTime} IST</span>.
                  Check-out will be recorded on <span className="font-bold font-mono">{getNextCalendarDateStr(date)}</span> at <span className="font-mono font-bold">{checkOutTime} IST</span>.
                  The entire attendance session and working hours belong to work date <span className="font-bold font-mono">{date}</span> without creating conflicts on the next day.
                </p>
              </div>
            </div>
          )}

          {/* Section D: Location Mapping */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#07563D]" />
              4. Client Work Location / Plant Unit
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] text-gray-500 mb-1">Registered Enterprise Facility:</span>
                <select
                  value={selectedLocationId}
                  onChange={e => setSelectedLocationId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none bg-white"
                >
                  <option value="">— Select Registered Location —</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[11px] text-gray-500 mb-1">Specific Plant / Unit / Sub-location:</span>
                <input
                  type="text"
                  placeholder="e.g., Propel Unit 1, Main Assembly Line"
                  value={customLocationName}
                  onChange={e => setCustomLocationName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section E: Override Reason */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-[#07563D]" />
              5. Justification & Audit Note
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="State reason for manual attendance override..."
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none resize-none"
              required
            />
            <div className="flex gap-2 flex-wrap text-[11px]">
              <span className="text-gray-400 font-medium">Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleQuickReason('Shift completed; biometric device offline at plant exit gate.')}
                className="text-xs text-[#07563D] hover:underline"
              >
                Offline Biometric Terminal
              </button>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={() => handleQuickReason('Overnight shift checkout verified by shift supervisor.')}
                className="text-xs text-[#07563D] hover:underline"
              >
                Supervisor Verified Overnight Out
              </button>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={() => handleQuickReason('Mobile GPS geofence drift on remote client field site.')}
                className="text-xs text-[#07563D] hover:underline"
              >
                Mobile GPS Drift
              </button>
            </div>
          </div>

          {/* Section F: Action Submit */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#07563D]" />
              <span>Full compliance audit trail recorded with current HR session.</span>
            </div>
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="outline" type="button" onClick={onBack} className="text-xs">
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={submitting || !selectedEmployee}
                className="text-xs font-bold bg-[#07563D] hover:bg-[#064e37] px-6"
              >
                {submitting ? 'Recording Punch...' : 'Submit Manual Punch Record'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};
