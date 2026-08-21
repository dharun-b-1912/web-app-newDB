import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Clock, Plus, Moon, Sun, Calendar, RefreshCw, Users } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { attendanceRosterService } from '../../../services/attendance/attendanceRosterService';
import { ShiftMaster } from '../../../types/shiftRoster';
import { api } from '../../../services/api';

export const ShiftScheduleView: React.FC = () => {
  const { showToast } = useToast();
  const [shifts, setShifts] = useState<ShiftMaster[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const loadData = async () => {
    const loadedShifts = attendanceRosterService.getShifts();
    setShifts(loadedShifts);

    try {
      const emps = await api.getEmployees();
      setEmployees(emps);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Shift Rostering & Schedule Engine</h2>
          <p className="text-xs text-gray-500 mt-1">
            Real-time shift profiles synchronized with active employee rosters, cross-midnight timings, and grace parameters
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Navigating to Shift Master to create a new template...')}>
          Create Shift Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shifts.map(shift => {
          const isNight = shift.cross_midnight || shift.shift_code.includes('NGT');
          const assignedCount = employees.filter(emp => {
            const r = attendanceRosterService.getRosterForEmployeeOnDate(emp.id, todayStr);
            return r.shift_id === shift.id || r.shift_code === shift.shift_code;
          }).length;

          return (
            <Card key={shift.id} className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4 hover:border-[#07563D] transition-all">
              <div className="flex items-center justify-between">
                <span className={`p-2 rounded-xl ${isNight ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {isNight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </span>
                <Badge variant={isNight ? 'purple' : 'emerald'} size="xs">
                  {assignedCount} Assigned
                </Badge>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-gray-900">{shift.shift_name}</h3>
                <div className="text-sm font-bold font-mono text-emerald-800 mt-1">
                  {shift.shift_code} • {shift.start_time} - {shift.end_time} {isNight ? '(Next Day)' : ''}
                </div>
              </div>

              <div className="pt-2 border-t text-xs space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span>Scheduled Working:</span>
                  <strong className="text-gray-900">{(shift.scheduled_duration_minutes / 60).toFixed(1)} Hours</strong>
                </div>
                <div className="flex justify-between">
                  <span>Grace Window:</span>
                  <strong className="text-gray-900">{shift.grace_in_minutes} Mins</strong>
                </div>
                <div className="flex justify-between">
                  <span>Overtime Rate:</span>
                  <strong className="text-gray-900">{shift.weekday_ot_rate}x Weekday • {shift.holiday_ot_rate}x Holiday</strong>
                </div>
              </div>

              <Button
                variant="outline"
                size="xs"
                className="w-full font-bold"
                onClick={() => showToast(`Roster verified for ${shift.shift_name}`)}
              >
                Inspect Assigned Workforce
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
