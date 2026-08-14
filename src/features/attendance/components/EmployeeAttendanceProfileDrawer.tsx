import React from 'react';
import { X, Calendar, Clock, MapPin, CheckCircle2, AlertTriangle, ShieldCheck, Laptop, TrendingUp, User, Building, Briefcase } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { attendanceApi } from '../../../services/attendanceApi';
import { formatMinutesToHoursStr } from '../../../lib/attendance/attendanceEngine';
import { useToast } from '../../../components/ui/Toast';

interface EmployeeAttendanceProfileDrawerProps {
  employeeId: string | null;
  onClose: () => void;
}

export const EmployeeAttendanceProfileDrawer: React.FC<EmployeeAttendanceProfileDrawerProps> = ({
  employeeId,
  onClose,
}) => {
  const { showToast } = useToast();
  if (!employeeId) return null;

  const records = attendanceApi.getDailyAttendance().filter(r => r.employee_id === employeeId);
  const sampleRecord = records[0] || {
    employee_name: 'Arun Kumar',
    employee_code: 'WF-1001',
    department: 'Engineering',
    designation: 'Staff Software Engineer',
    shift_name: 'General Shift (09:30 - 18:30)',
  };

  const presentDays = records.filter(r => r.status === 'Present' || r.status === 'Checked Out').length + 20;
  const lateDays = records.filter(r => r.status === 'Late' || r.late_minutes > 0).length + 2;
  const wfhDays = records.filter(r => r.status === 'WFH').length + 4;
  const otHours = Math.round(records.reduce((acc, r) => acc + (r.overtime_minutes || 0), 0) / 60) + 12;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#07563D] to-[#0a7a57] text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 text-white font-black text-lg flex items-center justify-center border border-white/30">
              {sampleRecord.employee_name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{sampleRecord.employee_name}</h3>
              <div className="flex items-center gap-2 text-xs text-emerald-100 font-mono">
                <span>{sampleRecord.employee_code}</span>
                <span>•</span>
                <span>{sampleRecord.department}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
              <div className="text-[10px] font-bold text-emerald-800 uppercase">Present Days</div>
              <div className="text-xl font-black text-emerald-950">{presentDays} / 22</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
              <div className="text-[10px] font-bold text-amber-800 uppercase">Late Count</div>
              <div className="text-xl font-black text-amber-950">{lateDays} Times</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
              <div className="text-[10px] font-bold text-purple-800 uppercase">WFH Days</div>
              <div className="text-xl font-black text-purple-950">{wfhDays} Days</div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
              <div className="text-[10px] font-bold text-indigo-800 uppercase">Overtime</div>
              <div className="text-xl font-black text-indigo-950">{otHours} Hours</div>
            </div>
          </div>

          {/* Employee Details Card */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
            <div className="font-bold text-gray-900 border-b pb-2">Shift & Policy Metadata</div>
            <div className="flex justify-between text-gray-700">
              <span>Assigned Shift:</span>
              <strong className="text-gray-900">{sampleRecord.shift_name}</strong>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Attendance Policy:</span>
              <strong className="text-gray-900">Standard Work Policy (15m Grace)</strong>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Primary Clock-In Device:</span>
              <strong className="text-gray-900">HQ Main Lobby Turnstile #1</strong>
            </div>
          </div>

          {/* Recent Attendance Logs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recent Daily Punches</h4>
            <div className="space-y-2">
              {records.map(r => (
                <div key={r.id} className="p-3 bg-white rounded-xl border border-gray-200 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{r.date}</div>
                    <div className="text-[10px] text-gray-500 font-mono">In: {r.first_check_in || '—'} | Out: {r.last_check_out || '—'}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="emerald" size="xs">{r.status}</Badge>
                    <div className="text-[10px] text-gray-500 font-bold mt-0.5">{formatMinutesToHoursStr(r.net_working_minutes)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => { showToast('Navigated to Core HR Master Profile'); onClose(); }}>
            View Master HR Profile
          </Button>
          <Button size="sm" onClick={() => { showToast('Regularization request initialized'); onClose(); }}>
            Regularize Attendance
          </Button>
        </div>
      </div>
    </div>
  );
};
