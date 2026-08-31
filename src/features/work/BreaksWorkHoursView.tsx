import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  Coffee,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Zap,
  X,
} from 'lucide-react';
import { WorkHourRecord, BreakPolicy, BreakRecord } from '../../types/workOvertime';
import { workOvertimeService } from '../../services/workOvertimeService';

export const BreaksWorkHoursView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [workHours, setWorkHours] = useState<WorkHourRecord[]>(() => workOvertimeService.getWorkHourRecords(new Date().toISOString().split('T')[0]));
  const [breakPolicy, setBreakPolicy] = useState<BreakPolicy>(() => workOvertimeService.getBreakPolicy());
  const [selectedRecord, setSelectedRecord] = useState<WorkHourRecord | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const refreshData = (date = selectedDate) => {
    setWorkHours(workOvertimeService.getWorkHourRecords(date));
    setBreakPolicy(workOvertimeService.getBreakPolicy());
  };

  useEffect(() => {
    refreshData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const handleUpdate = () => refreshData(selectedDate);
    window.addEventListener('work-overtime:updated', handleUpdate);
    return () => window.removeEventListener('work-overtime:updated', handleUpdate);
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Breaks & Work Hours Operational Center</h2>
            <Badge variant="outline" size="sm">
              Time Control Engine
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Calculates exact payable work hours from raw presence, applying paid allowances, unpaid deductions, core-hour rules and deficit tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          />
          <Button
            variant="outline"
            size="sm"
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            onClick={() => setIsConfigModalOpen(true)}
          >
            Break Policies
          </Button>
        </div>
      </div>

      {/* Break Policy Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Auto-Deduction Rule</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">{breakPolicy.automatic_break_minutes} Minutes</div>
          <div className="text-[10px] text-gray-500 mt-0.5">After {breakPolicy.automatic_break_after_hours}h Continuous Presence</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Paid Break Allowance</div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{breakPolicy.paid_break_allowance_minutes} Minutes / Day</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Credited towards payable work</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Core Working Hours</div>
          <div className="text-xl font-black text-blue-700 mt-0.5">
            {breakPolicy.core_hours_start} - {breakPolicy.core_hours_end}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Mandatory presence window</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max Unpaid Break Limit</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">{breakPolicy.max_unpaid_break_minutes} Minutes</div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Excess generates review exception</div>
        </Card>
      </div>

      {/* Visual Day-Timeline for Featured Record */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <span className="text-[10px] font-black tracking-widest text-[#07563D] uppercase">Interactive Day Timeline</span>
            <h3 className="text-sm font-bold text-gray-900">Arun Kumar — Today's Presence & Break Cycle</h3>
          </div>
          <Badge variant="emerald" size="sm">
            11.88h Payable Hours
          </Badge>
        </div>

        {/* Visual Timeline Bar */}
        <div className="space-y-2">
          <div className="h-9 w-full bg-gray-100 rounded-xl overflow-hidden flex border border-gray-200 p-1 gap-1">
            {/* Check in to Lunch */}
            <div className="bg-emerald-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold px-2 flex-3">
              Work: 08:52 - 13:00 (4h 08m)
            </div>
            {/* Lunch break */}
            <div className="bg-amber-400 rounded-lg flex items-center justify-center text-[10px] text-gray-950 font-bold px-2 flex-1">
              Lunch: 45m Unpaid
            </div>
            {/* Afternoon work */}
            <div className="bg-emerald-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold px-2 flex-3">
              Work: 13:45 - 16:15 (2h 30m)
            </div>
            {/* Tea Break */}
            <div className="bg-emerald-400 rounded-lg flex items-center justify-center text-[10px] text-emerald-950 font-bold px-2 flex-1">
              Tea: 15m Paid
            </div>
            {/* Post Shift Overtime */}
            <div className="bg-purple-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold px-2 flex-3">
              Approved Overtime: 18:00 - 21:30 (3h 30m)
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono px-1">
            <span>08:52 In</span>
            <span>13:00 Lunch</span>
            <span>13:45 Resume</span>
            <span>18:00 Shift End</span>
            <span>21:30 Out (3h OT)</span>
          </div>
        </div>
      </Card>

      {/* Work Hours & Breaks Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Work Hours & Break Deduction Ledger</h3>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead className="font-bold text-xs text-gray-700">Employee</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Scheduled</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Actual Presence</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Break Deductions (Unpaid)</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Paid Allowances</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Net Payable Work Hours</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Overtime Generated</TableHead>
                <TableHead className="font-bold text-xs text-gray-700 text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workHours.map(record => (
                <TableRow key={record.id} className="hover:bg-gray-50/60 transition-colors">
                  <TableCell>
                    <div className="font-bold text-xs text-gray-900">{record.employee_name}</div>
                    <div className="text-[10px] text-gray-500">
                      {record.employee_code} • {record.department}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-800">{record.scheduled_hours}h 00m</div>
                    <div className="text-[10px] text-gray-500">{record.shift_name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-bold text-gray-900">{record.actual_presence_hours}h</div>
                    <div className="text-[10px] font-mono text-gray-500">
                      {record.check_in} → {record.check_out}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-rose-600">
                      -{record.unpaid_break_hours * 60} Minutes
                    </div>
                    <div className="text-[10px] text-gray-500">Meal Interval</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-emerald-700">
                      +{record.paid_break_hours * 60} Minutes
                    </div>
                    <div className="text-[10px] text-gray-500">Tea / Rest Allowance</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-black text-gray-900">{record.payable_work_hours}h</div>
                    <div className="text-[10px] text-emerald-600 font-medium">Standard Hours Met</div>
                  </TableCell>
                  <TableCell>
                    {record.payable_ot_hours > 0 ? (
                      <Badge variant="emerald" size="sm">
                        +{record.payable_ot_hours}h Overtime
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">0.0h</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-[#07563D] hover:bg-emerald-50"
                      onClick={() => setSelectedRecord(record)}
                    >
                      Breakdown
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Break Policy Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Break & Work Hour Rules</h3>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Automatic Unpaid Break (Minutes)</label>
                <input
                  type="number"
                  value={breakPolicy.automatic_break_minutes}
                  onChange={e => setBreakPolicy({ ...breakPolicy, automatic_break_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Paid Break Allowance (Minutes)</label>
                <input
                  type="number"
                  value={breakPolicy.paid_break_allowance_minutes}
                  onChange={e => setBreakPolicy({ ...breakPolicy, paid_break_allowance_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Core Hours Start</label>
                  <input
                    type="text"
                    value={breakPolicy.core_hours_start}
                    onChange={e => setBreakPolicy({ ...breakPolicy, core_hours_start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Core Hours End</label>
                  <input
                    type="text"
                    value={breakPolicy.core_hours_end}
                    onChange={e => setBreakPolicy({ ...breakPolicy, core_hours_end: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsConfigModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  workOvertimeService.updateBreakPolicy(breakPolicy);
                  showToast('Break policy parameters updated successfully!');
                  setIsConfigModalOpen(false);
                  refreshData();
                }}
              >
                Save Break Policy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
