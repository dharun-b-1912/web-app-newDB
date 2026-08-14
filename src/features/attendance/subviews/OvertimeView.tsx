import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { TrendingUp, Plus, Check, X, Clock, Calendar, DollarSign } from 'lucide-react';
import { OvertimeRequest } from '../../../types/attendance';
import { attendanceApi } from '../../../services/attendanceApi';
import { useToast } from '../../../components/ui/Toast';

export const OvertimeView: React.FC = () => {
  const { showToast } = useToast();
  const [otList, setOtList] = useState<OvertimeRequest[]>(() => attendanceApi.getOvertimeRequests());
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const [date, setDate] = useState('2026-08-14');
  const [startTime, setStartTime] = useState('06:30 PM');
  const [endTime, setEndTime] = useState('09:30 PM');
  const [estHours, setEstHours] = useState(3);
  const [reason, setReason] = useState('');
  const [compType, setCompType] = useState<'Paid Overtime' | 'Comp Off' | 'Unpaid'>('Paid Overtime');

  const refreshList = () => {
    setOtList(attendanceApi.getOvertimeRequests());
  };

  const handleApprove = (id: string) => {
    attendanceApi.approveOvertime(id, 'Approved');
    showToast('Overtime request approved and mapped to payroll compensation engine!');
    refreshList();
  };

  const handleReject = (id: string) => {
    attendanceApi.approveOvertime(id, 'Rejected');
    showToast('Overtime request rejected');
    refreshList();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please provide business reason for overtime');
      return;
    }
    attendanceApi.submitOvertime({
      employee_id: 'emp-001',
      employee_name: 'Arun Kumar',
      date,
      start_time: startTime,
      end_time: endTime,
      estimated_hours: estHours,
      actual_hours: estHours,
      reason,
      manager_name: 'Vikramaditya Roy',
      compensation_type: compType,
    });
    showToast('Overtime request logged for manager approval');
    setIsRequestModalOpen(false);
    refreshList();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Overtime Management Engine</h2>
          <p className="text-xs text-gray-500 mt-1">
            Track extended hours beyond shift thresholds, pre-approval workflows, and payroll compensation mapping
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsRequestModalOpen(true)}>
          New Overtime Pre-Approval Request
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Overtime Hours (This Month)</div>
          <div className="text-2xl font-black text-gray-900">142.5 Hrs</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">Across 28 Engineers & Analysts</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Approved Payroll Overtime</div>
          <div className="text-2xl font-black text-emerald-700">118.0 Hrs</div>
          <div className="text-[10px] text-gray-500 mt-1">1.5x Hourly Rate Multiplier</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Comp-Off Credits Generated</div>
          <div className="text-2xl font-black text-purple-700">24.5 Days</div>
          <div className="text-[10px] text-gray-500 mt-1">Credited to Leave Bank</div>
        </Card>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900">Overtime Requests & Approvals Queue</h3>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date & Time Slot</TableHead>
              <TableHead>Hours Logged</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Compensation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {otList.map(item => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-bold text-gray-900 text-xs">{item.employee_name}</div>
                  <div className="text-[10px] text-gray-500">Manager: {item.manager_name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">{item.date}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{item.start_time} - {item.end_time}</div>
                </TableCell>
                <TableCell className="text-xs font-bold text-indigo-900">{item.estimated_hours} Hours</TableCell>
                <TableCell className="max-w-xs">
                  <p className="text-xs text-gray-700">{item.reason}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="purple" size="xs">{item.compensation_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.status === 'Approved' ? 'emerald' : item.status === 'Rejected' ? 'rose' : 'amber'} size="sm">
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {item.status === 'Pending' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="xs" variant="outline" className="text-emerald-700" onClick={() => handleApprove(item.id)}>
                        Approve
                      </Button>
                      <Button size="xs" variant="outline" className="text-rose-700" onClick={() => handleReject(item.id)}>
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-medium">Processed</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Request Overtime Approval</h3>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Overtime Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#07563D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#07563D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Est. Hours</label>
                  <input
                    type="number"
                    value={estHours}
                    onChange={e => setEstHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Compensation Type</label>
                <select
                  value={compType}
                  onChange={e => setCompType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                >
                  <option value="Paid Overtime">Paid Overtime (1.5x Payroll Bonus)</option>
                  <option value="Comp Off">Comp-Off Credit (Add 1 Day Leave)</option>
                  <option value="Unpaid">Unpaid Overtime (Project Track Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Task Justification</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Describe critical project task requiring extended hours..."
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Submit Overtime
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
