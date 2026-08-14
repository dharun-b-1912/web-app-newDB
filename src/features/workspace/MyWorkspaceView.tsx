import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Clock, Calendar, FileText, CheckCircle2, AlertCircle, Award, UserCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';

export const MyWorkspaceView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);

  const handleClockToggle = () => {
    if (!clockedIn) {
      const now = new Date().toLocaleTimeString();
      setClockInTime(now);
      setClockedIn(true);
      showToast(`Clocked IN successfully at ${now}`);
    } else {
      setClockedIn(false);
      showToast('Clocked OUT successfully');
    }
  };

  const [clockInTime, setClockInTime] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'My Personal Workspace' }]} />

      {/* Header Profile Card */}
      <Card className="p-6 bg-gradient-to-r from-[#073B2A] to-[#0B563D] text-white space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name || 'Administrator'} src={user?.avatar_url} size="xl" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">{user?.name}</h1>
                <Badge variant="emerald" className="bg-emerald-400 text-[#073B2A] font-bold">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">{user?.email}</p>
              <div className="text-[11px] text-emerald-300 font-mono mt-1">
                Roles: {(user?.roles || []).map(r => r.name).join(', ') || 'Employee'}
              </div>
            </div>
          </div>

          {/* Clock In / Out Control */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-2 shrink-0 w-full sm:w-auto">
            <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Attendance Clock</div>
            <div className="text-xl font-mono font-bold text-white">
              {clockedIn ? `In since ${clockInTime}` : 'Not Clocked In'}
            </div>
            <Button
              onClick={handleClockToggle}
              variant={clockedIn ? 'danger' : 'default'}
              size="sm"
              className={clockedIn ? '' : 'bg-emerald-400 text-[#073B2A] hover:bg-emerald-300'}
            >
              {clockedIn ? 'Clock Out' : 'Clock In Now'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Casual Leave Balance</div>
          <div className="text-2xl font-black text-gray-900">8 / 12 Days</div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-1">
            <div className="bg-[#07563D] h-full w-[66%]" />
          </div>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sick Leave Balance</div>
          <div className="text-2xl font-black text-gray-900">10 / 12 Days</div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-1">
            <div className="bg-[#07563D] h-full w-[83%]" />
          </div>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Next Salary Payday</div>
          <div className="text-2xl font-black text-[#07563D]">Aug 31, 2026</div>
          <p className="text-[11px] text-gray-400">Direct Deposit scheduled</p>
        </Card>
      </div>
    </div>
  );
};
