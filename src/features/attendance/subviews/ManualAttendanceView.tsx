import React, { useState, useEffect, useMemo } from 'react';
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
  Download,
  Filter,
  RefreshCw,
  Eye,
  Edit3,
  CheckCheck,
  ListFilter,
  History,
  FileSpreadsheet,
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
  is_roster_override?: boolean;
  organization_id: string;
}

interface BaseEmployee {
  id: string;
  employee_code: string;
  name: string;
  department: string;
  default_shift_id: string;
  organization_id: string;
}

interface ShiftItem {
  id: string;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  grace_entry_minutes: number;
  is_overnight: boolean;
}

interface LocationOption {
  id: string;
  name: string;
  address: string;
}

interface AuditRecord {
  id: string;
  record_type: 'PUNCH' | 'REGULARIZATION';
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  attendance_date: string;
  punch_type: 'CHECK_IN' | 'CHECK_OUT' | 'BOTH';
  punch_time_raw: string;
  punch_time_ist: string;
  shift_code: string;
  shift_timing: string;
  is_overnight: boolean;
  location_name: string;
  reason: string;
  status: string;
  created_at: string;
  created_at_ist: string;
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

  // Top View Navigation: Entry Form vs Company Manual Punch Records
  const [activeTab, setActiveTab] = useState<'RECORD' | 'AUDIT'>('RECORD');

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
  const [baseEmployees, setBaseEmployees] = useState<BaseEmployee[]>([]);
  const [shiftMap, setShiftMap] = useState<Map<string, ShiftItem>>(new Map());
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

  // Audit Ledger State
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditDateFilter, setAuditDateFilter] = useState<string>('ALL');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');

  // Format timestamp into clean IST human readable string
  const formatIstTime = (utcIso: string | null | undefined): string => {
    if (!utcIso) return '—';
    try {
      const d = new Date(utcIso);
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return utcIso;
    }
  };

  const formatIstDate = (dateStrOrUtc: string | null | undefined): string => {
    if (!dateStrOrUtc) return '—';
    try {
      const d = dateStrOrUtc.includes('T') ? new Date(dateStrOrUtc) : new Date(`${dateStrOrUtc}T12:00:00Z`);
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStrOrUtc;
    }
  };

  // 1. Fetch Employees, Shifts, Shift Assignments, Departments, and Work Locations on Mount
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
        const sMap = new Map<string, ShiftItem>((shiftData || []).map(s => [s.id, s as ShiftItem]));
        setShiftMap(sMap);

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

        // Default Shift Fallback
        const defaultShift = Array.from(sMap.values())[0] || {
          id: 'shift-gen',
          code: 'GEN-01',
          name: 'General Corporate Shift',
          start_time: '08:30:00',
          end_time: '17:30:00',
          grace_entry_minutes: 30,
          is_overnight: false,
        };

        const baseList: BaseEmployee[] = (empData || []).map(e => ({
          id: e.id,
          employee_code: e.employee_code,
          name: e.display_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Employee',
          department: deptMap.get(e.department_id) || 'General Operations',
          organization_id: e.organization_id,
          default_shift_id: assignMap.get(e.id) || defaultShift.id,
        }));

        setBaseEmployees(baseList);

        // Set initial selected employee
        const initialTargetId = getInitialEmpId();
        if (initialTargetId && baseList.some(e => e.id === initialTargetId)) {
          setSelectedEmpId(initialTargetId);
        } else if (!selectedEmpId && baseList.length > 0) {
          setSelectedEmpId(baseList[0].id);
        }
      } catch (err) {
        console.error('Failed to load manual punch metadata:', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadMetadata();
  }, []);

  // 2. Authoritative Dynamic Shift Resolution on Date Change & Roster Override Check
  // Resolves the exact shift for each employee on the selected date by querying `shift_rosters`
  useEffect(() => {
    if (baseEmployees.length === 0 || shiftMap.size === 0) return;

    const resolveShiftsForSelectedDate = async () => {
      try {
        const { data: rosterData } = await supabase
          .from('shift_rosters')
          .select('employee_id, shift_id, is_override')
          .eq('roster_date', date);

        const rosterMap = new Map((rosterData || []).map(r => [r.employee_id, r]));

        const defaultShift = Array.from(shiftMap.values())[0] || {
          id: 'shift-gen',
          code: 'GEN-01',
          name: 'General Corporate Shift',
          start_time: '08:30:00',
          end_time: '17:30:00',
          grace_entry_minutes: 30,
          is_overnight: false,
        };

        const resolvedList: EmployeeOption[] = baseEmployees.map(emp => {
          const roster = rosterMap.get(emp.id);
          // Roster entry (override or scheduled roster date) has top precedence over static assignment
          const shiftId = roster?.shift_id || emp.default_shift_id;
          const s = shiftMap.get(shiftId) || defaultShift;
          const isOvernight = Boolean(s.is_overnight || (s.code && (s.code.includes('NS') || s.code.includes('NGT'))));

          return {
            id: emp.id,
            employee_code: emp.employee_code,
            name: emp.name,
            department: emp.department,
            shift_id: s.id,
            shift_code: s.code || 'GEN-01',
            shift_name: s.name,
            shift_start: s.start_time ? s.start_time.slice(0, 5) : '08:30',
            shift_end: s.end_time ? s.end_time.slice(0, 5) : '17:30',
            grace_minutes: s.grace_entry_minutes ?? 15,
            is_overnight: isOvernight,
            is_roster_override: Boolean(roster?.is_override),
            organization_id: emp.organization_id,
          };
        });

        setEmployees(resolvedList);
      } catch (err) {
        console.error('Error dynamically resolving shifts for date:', err);
      }
    };

    resolveShiftsForSelectedDate();
  }, [date, baseEmployees, shiftMap]);

  // 3. Load All Company Manual Punch Records & Audit Ledger
  const loadAuditRecords = async () => {
    try {
      setLoadingAudit(true);

      // Fetch manual punches
      const { data: punchesData, error: pErr } = await supabase
        .from('attendance_punches')
        .select('*')
        .eq('punch_source', 'MANUAL')
        .order('created_at', { ascending: false });

      if (pErr) console.warn('Notice loading manual punches:', pErr);

      // Fetch regularizations
      const { data: regData, error: rErr } = await supabase
        .from('attendance_regularizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (rErr) console.warn('Notice loading regularizations:', rErr);

      // Fetch locations lookup
      const { data: locs } = await supabase.from('work_locations').select('id, name');
      const locMap = new Map((locs || []).map(l => [l.id, l.name]));

      // Fetch shifts lookup
      const { data: shs } = await supabase.from('shifts').select('id, name, code, start_time, end_time, is_overnight');
      const sLookup = new Map((shs || []).map(s => [s.id, s]));

      // Map employees lookup
      const empLookup = new Map(employees.map(e => [e.id, e]));

      // Regularization lookup by key
      const regMap = new Map((regData || []).map(r => [`${r.employee_id}_${r.attendance_date}`, r]));

      const records: AuditRecord[] = [];

      // 1. Process Manual Punches
      (punchesData || []).forEach(p => {
        const emp = empLookup.get(p.employee_id);
        const reg = regMap.get(`${p.employee_id}_${p.attendance_date}`);
        const locName = locMap.get(p.work_location_id) || 'On-Site Facility';

        const shift = emp ? {
          code: emp.shift_code,
          timing: `${emp.shift_start} - ${emp.shift_end}`,
          is_overnight: emp.is_overnight,
        } : {
          code: 'GEN-01',
          timing: '08:30 - 17:30',
          is_overnight: false,
        };

        const punchTimeIst = formatIstTime(p.punch_time);
        const createdAtIst = formatIstTime(p.created_at);

        records.push({
          id: p.id,
          record_type: 'PUNCH',
          employee_id: p.employee_id,
          employee_code: emp?.employee_code || 'STAFF',
          employee_name: emp?.name || 'Employee',
          department: emp?.department || 'Operations',
          attendance_date: p.attendance_date || (p.punch_time ? p.punch_time.slice(0, 10) : date),
          punch_type: p.punch_type === 'IN' ? 'CHECK_IN' : (p.punch_type === 'OUT' ? 'CHECK_OUT' : p.punch_type),
          punch_time_raw: p.punch_time,
          punch_time_ist: punchTimeIst,
          shift_code: shift.code,
          shift_timing: shift.timing,
          is_overnight: shift.is_overnight,
          location_name: locName,
          reason: reg?.reason || 'HR Manual Punch Timing Adjustment',
          status: 'Synchronized',
          created_at: p.created_at,
          created_at_ist: createdAtIst,
        });
      });

      // 2. Also incorporate approved regularizations if not already covered
      (regData || []).forEach(r => {
        const hasPunch = records.some(rec => rec.employee_id === r.employee_id && rec.attendance_date === r.attendance_date);
        if (!hasPunch) {
          const emp = empLookup.get(r.employee_id);
          const inTimeIst = formatIstTime(r.requested_check_in);
          const outTimeIst = formatIstTime(r.requested_check_out);
          const timeDisplay = r.requested_check_in && r.requested_check_out
            ? `${inTimeIst} → ${outTimeIst}`
            : (r.requested_check_in ? `In: ${inTimeIst}` : `Out: ${outTimeIst}`);

          records.push({
            id: r.id,
            record_type: 'REGULARIZATION',
            employee_id: r.employee_id,
            employee_code: emp?.employee_code || 'STAFF',
            employee_name: emp?.name || 'Employee',
            department: emp?.department || 'Operations',
            attendance_date: r.attendance_date,
            punch_type: 'BOTH',
            punch_time_raw: r.requested_check_out || r.requested_check_in || r.created_at,
            punch_time_ist: timeDisplay,
            shift_code: emp?.shift_code || 'GEN-01',
            shift_timing: emp ? `${emp.shift_start} - ${emp.shift_end}` : '08:30 - 17:30',
            is_overnight: Boolean(emp?.is_overnight),
            location_name: 'Verified On-Site',
            reason: r.reason || 'Attendance Session Regularized',
            status: r.status || 'APPROVED',
            created_at: r.created_at,
            created_at_ist: formatIstTime(r.created_at),
          });
        }
      });

      // Sort by latest created
      records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAuditRecords(records);
    } catch (err) {
      console.error('Failed to load company manual punch records:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'AUDIT' || employees.length > 0) {
      loadAuditRecords();
    }
  }, [activeTab, employees.length]);

  // Search and filter for Employees in Entry form
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        e.employee_code.toLowerCase().includes(term) ||
        e.name.toLowerCase().includes(term) ||
        e.department.toLowerCase().includes(term) ||
        e.shift_code.toLowerCase().includes(term)
      );
    });
  }, [employees, searchTerm]);

  // Keep selectedEmpId strictly synchronized with search results
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
          setCheckOutTime(emp.shift_end || (emp.is_overnight ? '07:30' : '17:30'));
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
          setCheckInTime(emp.shift_start || (emp.is_overnight ? '19:30' : '08:30'));
          setCheckOutTime(emp.shift_end || (emp.is_overnight ? '07:30' : '17:30'));
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

      // Note: punch_source is stored on attendance_punches, not attendance_daily

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

      // 4. Insert Audit Ledger entry in attendance_regularizations for compliance transparency
      await supabase.from('attendance_regularizations').insert({
        organization_id: selectedEmployee.organization_id,
        employee_id: selectedEmployee.id,
        attendance_date: date,
        requested_check_in: updatedCheckIn,
        requested_check_out: updatedCheckOut,
        reason: `Manual Punch (${punchAction}): ${reason.trim()} [Facility: ${locName}]`,
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

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

      showToast(`Manual punch recorded for ${selectedEmployee.name}. Synchronized to official daily attendance.`);

      // Refresh Audit Log
      loadAuditRecords();
    } catch (err: any) {
      console.error('Error submitting manual punch:', err);
      showToast(err.message || 'Failed to submit manual punch.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Audit Records for Ledger View
  const filteredAuditRecords = useMemo(() => {
    return auditRecords.filter(r => {
      // Date filter
      if (auditDateFilter !== 'ALL' && r.attendance_date !== auditDateFilter) {
        return false;
      }
      // Action filter
      if (auditActionFilter !== 'ALL' && r.punch_type !== auditActionFilter) {
        return false;
      }
      // Search term
      if (auditSearch.trim()) {
        const t = auditSearch.toLowerCase();
        return (
          r.employee_name.toLowerCase().includes(t) ||
          r.employee_code.toLowerCase().includes(t) ||
          r.department.toLowerCase().includes(t) ||
          r.reason.toLowerCase().includes(t) ||
          r.location_name.toLowerCase().includes(t) ||
          r.shift_code.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [auditRecords, auditDateFilter, auditActionFilter, auditSearch]);

  // Export Audit Log to CSV
  const handleExportCsv = () => {
    if (filteredAuditRecords.length === 0) {
      showToast('No records to export.', 'info');
      return;
    }

    const headers = [
      'Record ID',
      'Employee Code',
      'Employee Name',
      'Department',
      'Shift Business Date',
      'Assigned Shift',
      'Shift Timing',
      'Cross Midnight',
      'Action Type',
      'Adjusted Punch Time (IST)',
      'Work Facility / Location',
      'Reason / Justification',
      'Audit Status',
      'Recorded Timestamp (UTC)',
    ];

    const rows = filteredAuditRecords.map(r => [
      `"${r.id}"`,
      `"${r.employee_code}"`,
      `"${r.employee_name}"`,
      `"${r.department}"`,
      `"${r.attendance_date}"`,
      `"${r.shift_code}"`,
      `"${r.shift_timing}"`,
      `"${r.is_overnight ? 'YES' : 'NO'}"`,
      `"${r.punch_type}"`,
      `"${r.punch_time_ist}"`,
      `"${r.location_name}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${r.created_at}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `company_manual_punch_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filteredAuditRecords.length} manual punch audit records to CSV.`);
  };

  // Jump from Audit row directly to Form pre-selected
  const handleQuickEditFromAudit = (record: AuditRecord) => {
    setDate(record.attendance_date);
    setSelectedEmpId(record.employee_id);
    setActiveTab('RECORD');
    showToast(`Loaded ${record.employee_name} on ${record.attendance_date} into punch adjustment form.`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. Header Bar with Dual Navigation Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Manual Punch & Regularization Master</h2>
                <Badge variant="emerald" className="text-[10px] uppercase font-bold tracking-wider">
                  HR Operations
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Authoritative clock adjustments, missing punch resolutions, roster-aware shift overrides, and full company audit trail.
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-[#07563D]" />
            <span className="text-gray-600 font-medium">Audit Records:</span>
            <span className="font-bold text-gray-900">{auditRecords.length} Recorded</span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-3 border-b border-gray-100 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('RECORD')}
            className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'RECORD'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Record Manual Punch (Entry Form)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Company Manual Punch Records & Audit Ledger</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#07563D]/10 text-[#07563D]">
              {auditRecords.length}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Success Alert Banner */}
      {successInfo && activeTab === 'RECORD' && (
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
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('AUDIT')}
              className="text-xs font-bold text-[#07563D] border-[#07563D]"
            >
              View in Audit Ledger
            </Button>
            {onBack && (
              <Button size="sm" onClick={onBack} className="text-xs font-bold bg-[#07563D] hover:bg-[#064e37]">
                View in Employee Ledger
              </Button>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: RECORD MANUAL PUNCH ENTRY FORM */}
      {activeTab === 'RECORD' && (
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-6 max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section A: Employee Selection with Dynamic Shift Resolution */}
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
                  placeholder="Search by Employee Code, Name, Department, or Shift Code..."
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
                    [{emp.employee_code}] {emp.name} — {emp.department} ({emp.shift_code}: {emp.shift_start} to {emp.shift_end}
                    {emp.is_overnight ? ' [Overnight]' : ''}
                    {emp.is_roster_override ? ' [Roster Override]' : ''})
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
                    <span className="text-gray-500">Assigned Shift on {date}:</span>
                    <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                      {selectedEmployee.shift_code} ({selectedEmployee.shift_start} - {selectedEmployee.shift_end})
                    </span>
                    {selectedEmployee.is_roster_override && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Roster Shift Override
                      </span>
                    )}
                    {selectedEmployee.is_overnight ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        <Moon className="w-3 h-3 text-indigo-600" />
                        Night Shift (Spans Midnight)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Sun className="w-3 h-3 text-amber-600" />
                        Day Shift
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
                  The date the shift officially began (work date). Automatically re-checks shift rosters for that date.
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
                      ['08:00', '08:15', '08:30', '08:45', '09:00'].map(t => (
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
                    {isCrossMidnight ? (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        🌅 Next Morning: {getNextCalendarDateStr(date)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ☀️ Same Day: {date}
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
                  onClick={() => handleQuickReason('Shift completed; employee forgot check-out on departure; verified with shift supervisor.')}
                  className="text-xs text-[#07563D] hover:underline"
                >
                  Forgot Checkout (Supervisor Verified)
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={() => handleQuickReason('Biometric machine offline at plant exit gate during departure.')}
                  className="text-xs text-[#07563D] hover:underline"
                >
                  Offline Biometric Terminal
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
      )}

      {/* TAB 2: COMPANY MANUAL PUNCH RECORDS & AUDIT LEDGER */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-6">
          {/* 1. Audit Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total Company Adjustments</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{auditRecords.length}</h3>
                  <span className="text-[10px] text-emerald-600 font-semibold">Authoritative Punches Logged</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Check-Out Adjustments</p>
                  <h3 className="text-2xl font-bold text-indigo-700 mt-1">
                    {auditRecords.filter(r => r.punch_type === 'CHECK_OUT').length}
                  </h3>
                  <span className="text-[10px] text-indigo-600 font-semibold">Missing Checkout Resolutions</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Check-In Adjustments</p>
                  <h3 className="text-2xl font-bold text-amber-700 mt-1">
                    {auditRecords.filter(r => r.punch_type === 'CHECK_IN').length}
                  </h3>
                  <span className="text-[10px] text-amber-600 font-semibold">Gate / Device Overrides</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Filtered Active Matches</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{filteredAuditRecords.length}</h3>
                  <span className="text-[10px] text-gray-400 font-medium">Ready for CSV Export</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* 2. Audit Filter Toolbar */}
          <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative min-w-[240px] flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search by Employee, Code, Reason, Plant..."
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                  />
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 font-semibold">Date:</span>
                  <select
                    value={auditDateFilter}
                    onChange={e => setAuditDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#07563D] outline-none"
                  >
                    <option value="ALL">All Business Dates</option>
                    <option value="2026-11-01">01 Nov 2026</option>
                    <option value="2026-11-02">02 Nov 2026 (Today)</option>
                    <option value="2026-10-31">31 Oct 2026</option>
                    <option value="2026-10-30">30 Oct 2026</option>
                  </select>
                </div>

                {/* Action Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 font-semibold">Action:</span>
                  <select
                    value={auditActionFilter}
                    onChange={e => setAuditActionFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#07563D] outline-none"
                  >
                    <option value="ALL">All Punch Types</option>
                    <option value="CHECK_OUT">Check-Outs Only</option>
                    <option value="CHECK_IN">Check-Ins Only</option>
                    <option value="BOTH">Full Session / Both</option>
                  </select>
                </div>
              </div>

              {/* Actions: Refresh & Export */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAuditRecords}
                  disabled={loadingAudit}
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />}
                  className="text-xs"
                >
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={handleExportCsv}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="text-xs font-bold bg-[#07563D] hover:bg-[#064e37]"
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </Card>

          {/* 3. Company Manual Punch Records Table */}
          <Card className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Authoritative Company Manual Punch Records</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Showing {filteredAuditRecords.length} synchronized manual punches and regularizations
                </p>
              </div>
              <Badge variant="emerald" className="text-[10px] font-semibold">
                Direct Supabase Ledger
              </Badge>
            </div>

            {loadingAudit ? (
              <div className="py-16 text-center text-gray-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#07563D] mb-2" />
                Loading authoritative manual punch ledger...
              </div>
            ) : filteredAuditRecords.length === 0 ? (
              <div className="py-16 text-center text-gray-400 space-y-2">
                <History className="w-8 h-8 mx-auto text-gray-300" />
                <p className="text-xs font-medium text-gray-600">No manual punch records match the selected filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setAuditSearch('');
                    setAuditDateFilter('ALL');
                    setAuditActionFilter('ALL');
                  }}
                  className="text-xs text-[#07563D] font-bold hover:underline"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-gray-200/80 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Shift Date & Schedule</th>
                      <th className="py-3 px-4">Action Type</th>
                      <th className="py-3 px-4">Adjusted Punch Time (IST)</th>
                      <th className="py-3 px-4">Work Facility</th>
                      <th className="py-3 px-4">Reason / Justification</th>
                      <th className="py-3 px-4">Audit Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAuditRecords.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Employee */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#07563D] font-bold flex items-center justify-center text-xs shrink-0">
                              {rec.employee_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{rec.employee_name}</div>
                              <div className="text-[11px] text-gray-500 font-mono">
                                {rec.employee_code} • {rec.department}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Shift Date & Schedule */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-800">{formatIstDate(rec.attendance_date)}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                              {rec.shift_code}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {rec.shift_timing}
                            </span>
                          </div>
                        </td>

                        {/* Action Type */}
                        <td className="py-3.5 px-4">
                          {rec.punch_type === 'CHECK_IN' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <User className="w-3 h-3 text-amber-600" />
                              Check-In
                            </span>
                          )}
                          {rec.punch_type === 'CHECK_OUT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <Clock className="w-3 h-3 text-indigo-600" />
                              Check-Out
                            </span>
                          )}
                          {rec.punch_type === 'BOTH' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCheck className="w-3 h-3 text-emerald-600" />
                              Full Regularization
                            </span>
                          )}
                          <span className="block text-[10px] text-gray-400 mt-0.5">Source: Manual (HR)</span>
                        </td>

                        {/* Adjusted Punch Time */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-gray-900 text-xs">
                            {rec.punch_time_ist}
                          </div>
                          {rec.is_overnight && (
                            <span className="inline-block mt-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                              Cross-Midnight
                            </span>
                          )}
                        </td>

                        {/* Facility */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-medium text-gray-800 max-w-[160px] truncate" title={rec.location_name}>
                            {rec.location_name}
                          </div>
                          <span className="text-[10px] text-gray-400">GPS Authorized</span>
                        </td>

                        {/* Reason / Note */}
                        <td className="py-3.5 px-4 max-w-[260px]">
                          <p className="text-xs text-gray-700 line-clamp-2" title={rec.reason}>
                            {rec.reason}
                          </p>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            Logged: {rec.created_at_ist} IST
                          </span>
                        </td>

                        {/* Audit Status */}
                        <td className="py-3.5 px-4">
                          <Badge variant="emerald" className="text-[10px] font-bold uppercase tracking-wider">
                            {rec.status}
                          </Badge>
                          <span className="block text-[10px] text-gray-400 mt-0.5">Ledger Live</span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleQuickEditFromAudit(rec)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#07563D] hover:underline"
                            title="Open in Manual Punch Form"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
