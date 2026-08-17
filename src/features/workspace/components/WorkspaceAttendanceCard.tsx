import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Clock, CheckCircle2, LogIn, LogOut, MapPin, Calendar, Sun, Coffee } from 'lucide-react';
import { AttendanceDaily } from '../../../types/attendance';

interface Props {
  attendanceState: 'NotCheckedIn' | 'CheckedIn' | 'CheckedOut' | 'OnLeave' | 'Holiday' | 'WeeklyOff';
  todayAttendance: AttendanceDaily | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  isProcessing: boolean;
}

export const WorkspaceAttendanceCard: React.FC<Props> = ({
  attendanceState,
  todayAttendance,
  onCheckIn,
  onCheckOut,
  isProcessing,
}) => {
  const [elapsedText, setElapsedText] = useState<string>('00h 00m 00s');

  // Live timer when CheckedIn
  useEffect(() => {
    if (attendanceState !== 'CheckedIn' || !todayAttendance?.first_check_in) return;

    const calculateElapsed = () => {
      const now = new Date();
      const parts = todayAttendance.first_check_in.split(':');
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parseInt(parts[1].slice(0, 2), 10);
        const isPM = todayAttendance.first_check_in.toLowerCase().includes('pm') && h < 12;
        const isAM = todayAttendance.first_check_in.toLowerCase().includes('am') && h === 12;
        if (isPM) h += 12;
        if (isAM) h = 0;

        const checkInDate = new Date();
        checkInDate.setHours(h, m, 0, 0);

        const diffMs = Math.max(0, now.getTime() - checkInDate.getTime());
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        setElapsedText(`${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [attendanceState, todayAttendance?.first_check_in]);

  return (
    <Card className="p-6 bg-gradient-to-br from-[#073B2A] to-[#0A543B] text-white shadow-md rounded-2xl border border-emerald-900/40">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Status & Timing Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
              Today's Attendance Control
            </span>
          </div>

          {attendanceState === 'NotCheckedIn' && (
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Not Checked In
              </h2>
              <p className="text-xs text-emerald-200">
                You haven't marked your presence for today yet.
              </p>
            </div>
          )}

          {attendanceState === 'CheckedIn' && (
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Checked In
                </h2>
                <span className="text-sm font-bold text-emerald-300">
                  at {todayAttendance?.first_check_in}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Working Elapsed: <strong className="text-white font-bold">{elapsedText}</strong></span>
              </div>
            </div>
          )}

          {attendanceState === 'CheckedOut' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Day Completed
                </h2>
              </div>
              <p className="text-xs text-emerald-200">
                {todayAttendance?.first_check_in} → {todayAttendance?.last_check_out} ({Math.floor((todayAttendance?.gross_working_minutes || 480) / 60)}h {(todayAttendance?.gross_working_minutes || 480) % 60}m)
              </p>
            </div>
          )}

          {attendanceState === 'OnLeave' && (
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Coffee className="w-6 h-6 text-amber-300" />
                On Approved Leave
              </h2>
              <p className="text-xs text-emerald-200">
                Your approved leave is active for today. No check-in required.
              </p>
            </div>
          )}

          {/* Secondary details */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-emerald-200/90 pt-1">
            <span className="flex items-center gap-1">
              <Sun className="w-3 h-3 text-emerald-400" />
              Shift: {todayAttendance?.shift_name || 'General Shift (09:30 - 18:30)'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              Location: Office Web Check-In
            </span>
          </div>
        </div>

        {/* Right Interactive CTA */}
        <div className="self-start md:self-center">
          {attendanceState === 'NotCheckedIn' && (
            <Button
              size="lg"
              onClick={onCheckIn}
              disabled={isProcessing}
              className="bg-emerald-400 hover:bg-emerald-300 text-[#073B2A] font-black text-sm px-6 py-3 shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {isProcessing ? 'Recording Check In...' : 'Check In Now'}
            </Button>
          )}

          {attendanceState === 'CheckedIn' && (
            <Button
              size="lg"
              onClick={onCheckOut}
              disabled={isProcessing}
              className="bg-rose-500 hover:bg-rose-600 text-white font-black text-sm px-6 py-3 shadow-lg hover:shadow-rose-600/20 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isProcessing ? 'Recording Check Out...' : 'Check Out'}
            </Button>
          )}

          {attendanceState === 'CheckedOut' && (
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-center text-xs font-bold text-emerald-200">
              Shift Recorded Successfully
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
