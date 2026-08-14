import React, { useState } from 'react';
import { essApi } from '../../../services/essApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  Clock,
  Calendar,
  CircleDollarSign,
  Plus,
  CheckCircle2,
  Bell,
  Megaphone,
  Sparkles,
  ShieldCheck,
  FileText,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface EssDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const EssDashboardView: React.FC<EssDashboardViewProps> = ({ onNavigateTab }) => {
  const { showToast } = useToast();
  const profile = essApi.getProfile();
  const attendance = essApi.getAttendanceState();
  const leaveBalances = essApi.getLeaveBalances();

  const [clockedIn, setClockedIn] = useState(attendance.is_clocked_in);
  const [clockInTime, setClockInTime] = useState<string | undefined>(attendance.clock_in_time);

  const handleClockToggle = () => {
    if (!clockedIn) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setClockInTime(now);
      setClockedIn(true);
      showToast(`Clocked IN successfully at ${now}`);
    } else {
      setClockedIn(false);
      showToast('Clocked OUT successfully');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6">
      {/* Personalized Greeting Card */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>WorkForceOS ESS Portal</span>
            <span>•</span>
            <span>Asia/Kolkata (IST)</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{getGreeting()}, {profile.full_name.split(' ')[0]}!</h1>
          <p className="text-xs text-emerald-100/90 font-medium">
            {profile.designation} • {profile.department} • Manager: {profile.manager_name}
          </p>
        </div>

        {/* Attendance Clock Card */}
        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-2 shrink-0 min-w-[240px]">
          <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Today's Attendance Clock</div>
          <div className="text-lg font-mono font-black text-white">
            {clockedIn ? `In since ${clockInTime}` : 'Not Clocked In'}
          </div>
          <Button
            size="sm"
            onClick={handleClockToggle}
            className={clockedIn ? 'bg-rose-600 hover:bg-rose-500 text-white w-full' : 'bg-emerald-400 text-[#07563D] hover:bg-emerald-300 w-full font-extrabold'}
          >
            {clockedIn ? 'Check Out' : 'Check In Now'}
          </Button>
          <span className="text-[10px] text-emerald-100/80 block font-medium">Location: {attendance.location_status}</span>
        </div>
      </div>

      {/* Quick Action Buttons Ribbon */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3 overflow-x-auto scrollbar-none">
        <span className="text-xs font-black text-gray-400 uppercase tracking-wider shrink-0 mr-2">Quick Actions:</span>
        <Button size="sm" variant="outline" leftIcon={<Clock className="w-4 h-4" />} onClick={() => onNavigateTab?.('attendance')}>
          Check In / Out
        </Button>
        <Button size="sm" variant="outline" leftIcon={<Calendar className="w-4 h-4" />} onClick={() => onNavigateTab?.('leave')}>
          Apply Leave
        </Button>
        <Button size="sm" variant="outline" leftIcon={<CircleDollarSign className="w-4 h-4" />} onClick={() => onNavigateTab?.('payroll')}>
          View Payslip
        </Button>
        <Button size="sm" variant="outline" leftIcon={<Plus className="w-4 h-4" />} onClick={() => onNavigateTab?.('requests')}>
          New Request
        </Button>
        <Button size="sm" variant="outline" leftIcon={<FileText className="w-4 h-4" />} onClick={() => onNavigateTab?.('documents')}>
          My Documents
        </Button>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {leaveBalances.map((l, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase">{l.leave_type}</span>
              <Badge variant="emerald">{l.pending > 0 ? `${l.pending} Pending` : 'Available'}</Badge>
            </div>
            <div className="text-2xl font-black text-gray-900 font-mono">{l.available} / {l.total_entitlement} Days</div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-1">
              <div className="bg-[#07563D] h-full" style={{ width: `${(l.available / l.total_entitlement) * 100}%` }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Holiday & Action Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#07563D]" />
            <span>Upcoming Official Holiday</span>
          </h3>
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="font-sans font-bold text-emerald-900 text-sm block">Independence Day</span>
              <span className="text-emerald-700">15 August 2026 (Saturday)</span>
            </div>
            <Badge variant="emerald">National Holiday</Badge>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#07563D]" />
            <span>Employee Action Center (1 Pending Task)</span>
          </h3>
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between text-xs cursor-pointer" onClick={() => onNavigateTab?.('performance')}>
            <div>
              <span className="font-bold text-amber-900 block">Q3 Performance Self-Assessment</span>
              <span className="text-amber-700 text-[11px]">Due: August 25, 2026</span>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600" />
          </div>
        </div>
      </div>
    </div>
  );
};
