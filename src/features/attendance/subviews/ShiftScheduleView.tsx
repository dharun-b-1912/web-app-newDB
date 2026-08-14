import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Clock, Plus, Moon, Sun, Calendar, RefreshCw, Users } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const ShiftScheduleView: React.FC = () => {
  const { showToast } = useToast();

  const shifts = [
    {
      id: 'shift-gen',
      name: 'General Day Shift',
      timing: '09:30 AM - 06:30 PM',
      gross_hours: '9 Hours',
      break_duration: '45 Mins',
      weekly_off: 'Saturday & Sunday',
      assigned_count: 312,
      is_night_shift: false,
    },
    {
      id: 'shift-night',
      name: 'US Operations Night Shift',
      timing: '10:00 PM - 06:00 AM (Next Day)',
      gross_hours: '8 Hours',
      break_duration: '45 Mins',
      weekly_off: 'Sunday & Monday',
      assigned_count: 64,
      is_night_shift: true,
    },
    {
      id: 'shift-flexi',
      name: 'Engineering Flexible Core Hours',
      timing: 'Core Hours: 11:00 AM - 04:00 PM',
      gross_hours: '8 Hours Net',
      break_duration: 'Flexible',
      weekly_off: 'Saturday & Sunday',
      assigned_count: 52,
      is_night_shift: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Shift Rostering & Schedule Engine</h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure shift timing, night shifts spanning midnight (22:00 -&gt; 06:00), break durations, rotational schedules, and weekly offs
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Creating new shift schedule template...')}>
          Create Shift Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shifts.map(shift => (
          <Card key={shift.id} className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4 hover:border-[#07563D] transition-all">
            <div className="flex items-center justify-between">
              <span className={`p-2 rounded-xl ${shift.is_night_shift ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                {shift.is_night_shift ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </span>
              <Badge variant={shift.is_night_shift ? 'purple' : 'emerald'} size="xs">
                {shift.assigned_count} Employees
              </Badge>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-gray-900">{shift.name}</h3>
              <div className="text-sm font-bold font-mono text-emerald-800 mt-1">{shift.timing}</div>
            </div>

            <div className="pt-2 border-t text-xs space-y-1.5 text-gray-600">
              <div className="flex justify-between">
                <span>Gross Duration:</span>
                <strong className="text-gray-900">{shift.gross_hours}</strong>
              </div>
              <div className="flex justify-between">
                <span>Break Allowance:</span>
                <strong className="text-gray-900">{shift.break_duration}</strong>
              </div>
              <div className="flex justify-between">
                <span>Weekly Off Days:</span>
                <strong className="text-gray-900">{shift.weekly_off}</strong>
              </div>
            </div>

            <Button variant="outline" size="xs" className="w-full" onClick={() => showToast(`Managing roster for ${shift.name}`)}>
              Manage Shift Roster
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
