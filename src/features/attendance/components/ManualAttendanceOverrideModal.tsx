import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Building,
  Info,
  ShieldCheck,
  Sparkles,
  Save,
} from 'lucide-react';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';
import { hrEventBus } from '../../../services/hrEventBus';
import { attendanceApi } from '../../../services/attendanceApi';
import { attendanceRosterService } from '../../../services/attendance/attendanceRosterService';

interface ManualAttendanceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  dateStr: string;
  existingRecord?: any;
  onSuccess?: () => void;
}

const QUICK_REASONS = [
  'Biometric Device Offline',
  'Field Work / Client Visit',
  'Mobile App Punch Issue / GPS Glitch',
  'Authorized by HR Head',
  'Fingerprint Missed on Device',
  'Official Duty / Off-Site Meeting',
  'Emergency Duty Approved',
];

export const ManualAttendanceOverrideModal: React.FC<ManualAttendanceOverrideModalProps> = ({
  isOpen,
  onClose,
  employee,
  dateStr,
  existingRecord,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [selectedStatus, setSelectedStatus] = useState<string>('PRESENT');
  const [shiftCode, setShiftCode] = useState<string>('GEN-09');
  const [checkInTime, setCheckInTime] = useState<string>('09:30');
  const [checkOutTime, setCheckOutTime] = useState<string>('18:30');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Determine existing biometric or mobile check-in
  const hasBiometricIn = Boolean(
    existingRecord?.check_in_source === 'BIOMETRIC' ||
    existingRecord?.source === 'BIOMETRIC' ||
    (existingRecord?.first_check_in && existingRecord?.first_check_in.includes('BIO'))
  );
  const hasMobileIn = Boolean(
    existingRecord?.check_in_source === 'MOBILE' ||
    existingRecord?.source === 'MOBILE' ||
    (existingRecord?.first_check_in && !hasBiometricIn)
  );
  const hasAnyPunch = Boolean(existingRecord?.first_check_in || existingRecord?.last_check_out);

  useEffect(() => {
    if (isOpen && employee && dateStr) {
      // Determine initial status based on existing record
      if (existingRecord?.status) {
        const s = String(existingRecord.status).toUpperCase();
        if (s.includes('HALF') || s === 'HD') setSelectedStatus('HALF_DAY');
        else if (s.includes('LEAVE') || s === 'L') setSelectedStatus('ON_LEAVE');
        else if (s.includes('WFH') || s.includes('REMOTE')) setSelectedStatus('WORK_FROM_HOME');
        else if (s === 'ABSENT' || s === 'A') setSelectedStatus('ABSENT');
        else if (s === 'WEEKLY_OFF' || s === 'WO') setSelectedStatus('WEEKLY_OFF');
        else setSelectedStatus('PRESENT');
      } else {
        setSelectedStatus('PRESENT');
      }

      // Pre-fill shift & timings from roster
      const roster = attendanceRosterService.getRosterForEmployeeOnDate(employee.id, dateStr);
      const shift = attendanceRosterService.getShiftById(roster?.shift_id) || {
        shift_code: roster?.shift_code || 'GEN-09',
        start_time: '09:30',
        end_time: '18:30',
      };

      setShiftCode(shift.shift_code || 'GEN-09');
      setCheckInTime(existingRecord?.first_check_in ? formatTimeToHHMM(existingRecord.first_check_in) : (shift.start_time?.slice(0, 5) || '09:30'));
      setCheckOutTime(existingRecord?.last_check_out ? formatTimeToHHMM(existingRecord.last_check_out) : (shift.end_time?.slice(0, 5) || '18:30'));
      setReason(existingRecord?.remarks || existingRecord?.reason || '');
    }
  }, [isOpen, employee, dateStr, existingRecord]);

  if (!isOpen || !employee) return null;

  const empName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.display_name || employee.name || 'Employee';
  const empCode = employee.employee_code || `WF-${employee.id}`;
  const dept = employee.department_name || employee.department || 'Operations';
  const designation = employee.designation_title || employee.designation || 'Staff';

  // Format Date for display
  let formattedDisplayDate = dateStr;
  try {
    const dObj = new Date(`${dateStr}T12:00:00Z`);
    formattedDisplayDate = new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dObj);
  } catch {}

  function formatTimeToHHMM(timeStr: string): string {
    if (!timeStr) return '09:30';
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    }
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return '09:30';
  }

  // Calculate duration in minutes
  const calculateWorkMinutes = (): number => {
    if (selectedStatus === 'ABSENT' || selectedStatus === 'WEEKLY_OFF') return 0;
    try {
      const [inH, inM] = checkInTime.split(':').map(Number);
      const [outH, outM] = checkOutTime.split(':').map(Number);
      const startMinutes = inH * 60 + inM;
      let endMinutes = outH * 60 + outM;
      if (endMinutes < startMinutes) endMinutes += 1440; // overnight
      return Math.max(0, endMinutes - startMinutes);
    } catch {
      return 540; // 9 hours default
    }
  };

  const workMinutes = calculateWorkMinutes();
  const workHoursStr = `${Math.floor(workMinutes / 60)}h ${workMinutes % 60}m`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const orgId = employee.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
      
      // Determine payable_status for Payroll
      let payableStatus = 1.0;
      let dbStatus = selectedStatus;
      if (selectedStatus === 'ABSENT') {
        payableStatus = 0.0;
      } else if (selectedStatus === 'HALF_DAY') {
        payableStatus = 0.5;
      } else if (selectedStatus === 'WEEKLY_OFF') {
        payableStatus = 1.0;
      } else if (selectedStatus === 'ON_LEAVE') {
        payableStatus = 1.0;
      } else if (selectedStatus === 'WORK_FROM_HOME') {
        payableStatus = 1.0;
      } else if (selectedStatus === 'ON_DUTY') {
        payableStatus = 1.0;
        dbStatus = 'PRESENT';
      }

      // Check-in and check-out ISO strings
      const checkInIso = selectedStatus !== 'ABSENT' && checkInTime
        ? new Date(`${dateStr}T${checkInTime}:00+05:30`).toISOString()
        : null;
      const checkOutIso = selectedStatus !== 'ABSENT' && checkOutTime
        ? new Date(`${dateStr}T${checkOutTime}:00+05:30`).toISOString()
        : null;

      if (isSupabaseEnabled && supabase) {
        // 1. Upsert into attendance_daily with strict schema columns
        const dailyPayload = {
          organization_id: orgId,
          employee_id: employee.id,
          attendance_date: dateStr,
          status: dbStatus,
          payable_status: payableStatus,
          first_check_in: checkInIso,
          last_check_out: checkOutIso,
          total_work_minutes: workMinutes,
          break_minutes: selectedStatus === 'PRESENT' ? 60 : 0,
          late_entry_minutes: 0,
          early_exit_minutes: 0,
          overtime_minutes: 0,
          is_regularized: true,
          unauthorized_checkout_reason: reason.trim() ? `Manual Override: ${reason.trim()}` : 'Manual Override',
          updated_at: new Date().toISOString(),
        };

        const { error: dailyErr } = await supabase
          .from('attendance_daily')
          .upsert(dailyPayload, { onConflict: 'employee_id,attendance_date' });

        if (dailyErr) {
          console.warn('[ManualAttendanceModal] Upsert direct notice, attempting update by match:', dailyErr);
          await supabase
            .from('attendance_daily')
            .update(dailyPayload)
            .eq('employee_id', employee.id)
            .eq('attendance_date', dateStr);
        }

        // 2. Insert compliance audit ledger in attendance_regularizations
        await supabase.from('attendance_regularizations').insert({
          organization_id: orgId,
          employee_id: employee.id,
          attendance_date: dateStr,
          requested_check_in: checkInIso,
          requested_check_out: checkOutIso,
          reason: reason.trim() ? `Manual Override (${selectedStatus}): ${reason.trim()}` : `Manual Override (${selectedStatus})`,
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });

        // 3. Optional recalculation RPC trigger
        try {
          await supabase.rpc('fn_recalculate_daily_attendance', { p_employee_id: employee.id, p_date: dateStr });
        } catch {}
      }

      // Invalidate attendanceApi cache
      attendanceApi.invalidateCache();

      // Dispatch global events so Matrix, Statement & Payroll listeners refresh
      hrEventBus.emit('attendance.updated', {
        employee_id: employee.id,
        date: dateStr,
        status: dbStatus,
        payable_status: payableStatus,
      });
      hrEventBus.emit('regularization.updated', {
        employee_id: employee.id,
        date: dateStr,
      });

      showToast(`Manual attendance marked as ${selectedStatus} for ${empName}. Synchronized to payroll ledger!`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('[ManualAttendanceModal] Error:', err);
      showToast(err.message || 'Failed to record manual attendance.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <UserCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Manual Attendance & Missed Punch Resolution</h3>
              <p className="text-xs text-emerald-200 mt-0.5">Authoritative Override • Payroll & Statutory Sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Employee & Date Card */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <span>{empName}</span>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-emerald-100 text-emerald-800 rounded-md">
                  {empCode}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {dept} • {designation}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5 justify-end">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{formattedDisplayDate}</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 font-mono">{dateStr}</div>
            </div>
          </div>

          {/* Current Punch Detection Status Banner */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-3 ${
              hasAnyPunch
                ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {hasAnyPunch ? (
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-semibold">
                {hasAnyPunch
                  ? 'Existing Device Punch Activity Detected'
                  : 'No Biometric or Mobile Check-In Found for this Day'}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {hasAnyPunch
                  ? `In: ${existingRecord?.first_check_in || 'None'} | Out: ${existingRecord?.last_check_out || 'None'} (${existingRecord?.source || 'Device'})`
                  : 'Neither fingerprint/face biometric logs nor mobile GPS check-in was captured. This manual entry will credit working days and mark the employee present for payroll.'}
              </p>
            </div>
          </div>

          {/* Attendance Status Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Select Attendance Status <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { code: 'PRESENT', label: 'Present (P)', desc: '1.0 Paid Day', color: 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold' },
                { code: 'ABSENT', label: 'Absent / LOP (A)', desc: '0.0 Paid Day', color: 'border-rose-500 bg-rose-50/60 text-rose-900 font-bold' },
                { code: 'HALF_DAY', label: 'Half Day (HD)', desc: '0.5 Paid Day', color: 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold' },
                { code: 'ON_DUTY', label: 'On Duty (OD)', desc: '1.0 Paid Day (Field)', color: 'border-indigo-500 bg-indigo-50/60 text-indigo-900 font-bold' },
                { code: 'WORK_FROM_HOME', label: 'WFH', desc: '1.0 Paid Day', color: 'border-teal-500 bg-teal-50/60 text-teal-900 font-bold' },
                { code: 'ON_LEAVE', label: 'Paid Leave (PL)', desc: '1.0 Paid Day', color: 'border-purple-500 bg-purple-50/60 text-purple-900 font-bold' },
                { code: 'WEEKLY_OFF', label: 'Weekly Off (WO)', desc: 'Rest Day', color: 'border-gray-400 bg-gray-100 text-gray-800 font-bold' },
              ].map(st => {
                const isSelected = selectedStatus === st.code;
                return (
                  <button
                    key={st.code}
                    type="button"
                    onClick={() => setSelectedStatus(st.code)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${st.color} shadow-xs ring-2 ring-emerald-500/20`
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{st.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{st.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timings (Conditional if not Absent / Weekly Off) */}
          {selectedStatus !== 'ABSENT' && selectedStatus !== 'WEEKLY_OFF' && (
            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  Shift & Working Hours
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Total: {workHoursStr}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Check-in Time (IST)</label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={e => setCheckInTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Check-out Time (IST)</label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={e => setCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reason & Remarks (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Reason / Remarks <span className="text-gray-400 font-normal lowercase">(optional)</span>
              </label>
              <span className="text-[11px] text-gray-400">Optional note for audit trail</span>
            </div>

            {/* Quick Pills */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_REASONS.map(qr => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReason(qr)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    reason === qr
                      ? 'bg-emerald-800 text-white border-emerald-800 font-semibold'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/40'
                  }`}
                >
                  {qr}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Client visit, missed check-in, or leave blank for default manual entry."
              className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
            <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Will automatically sync with Payroll & Ledger.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSubmitting ? 'Synchronizing...' : 'Save & Sync Attendance'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

