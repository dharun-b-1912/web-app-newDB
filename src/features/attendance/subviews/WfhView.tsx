import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Laptop, Plus, Check, X, Calendar, MapPin } from 'lucide-react';
import { WfhRequest } from '../../../types/attendance';
import { attendanceApi } from '../../../services/attendanceApi';
import { useToast } from '../../../components/ui/Toast';

export const WfhView: React.FC = () => {
  const { showToast } = useToast();
  const [wfhList, setWfhList] = useState<WfhRequest[]>(() => attendanceApi.getWfhRequests());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [empName, setEmpName] = useState('Karthik Raja');
  const [fromDate, setFromDate] = useState('2026-08-18');
  const [toDate, setToDate] = useState('2026-08-20');
  const [days, setDays] = useState(3);
  const [reason, setReason] = useState('');
  const [loc, setLoc] = useState('Bengaluru Residence');

  const refreshList = () => {
    setWfhList(attendanceApi.getWfhRequests());
  };

  const handleApprove = (id: string) => {
    attendanceApi.approveWfh(id, 'Approved');
    showToast('WFH Request approved! Attendance status will automatically record WFH mode for approved dates.');
    refreshList();
  };

  const handleReject = (id: string) => {
    attendanceApi.approveWfh(id, 'Rejected');
    showToast('WFH Request rejected');
    refreshList();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please specify reason for WFH request');
      return;
    }
    attendanceApi.submitWfh({
      employee_id: 'emp-003',
      employee_name: empName,
      from_date: fromDate,
      to_date: toDate,
      total_days: days,
      reason,
      location: loc,
      work_type: 'Remote',
      manager_name: 'Arun Kumar',
    });
    showToast('WFH Request submitted to manager approval flow');
    setIsModalOpen(false);
    refreshList();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Work From Home (WFH) Management</h2>
          <p className="text-xs text-gray-500 mt-1">
            Remote & hybrid attendance tracking, policy quota checks, location check-ins, and manager workflow
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          New WFH Request
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monthly WFH Allowance</div>
          <div className="text-2xl font-black text-purple-900">8 Days / Month</div>
          <div className="text-[10px] text-purple-700 font-semibold mt-1">Enterprise Hybrid Policy</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Active Remote Employees Today</div>
          <div className="text-2xl font-black text-purple-700">38 Employees</div>
          <div className="text-[10px] text-gray-500 mt-1">GPS & IP Verified</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pending WFH Requests</div>
          <div className="text-2xl font-black text-amber-700">5 Requests</div>
          <div className="text-[10px] text-gray-500 mt-1">Awaiting Manager Sign-off</div>
        </Card>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900">WFH Requests & History</h3>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Dates & Duration</TableHead>
              <TableHead>Location & Work Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wfhList.map(req => (
              <TableRow key={req.id}>
                <TableCell>
                  <div className="font-bold text-gray-900 text-xs">{req.employee_name}</div>
                  <div className="text-[10px] text-gray-500">Manager: {req.manager_name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">{req.from_date} to {req.to_date}</div>
                  <div className="text-[10px] text-purple-700 font-bold">{req.total_days} Days WFH</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-gray-800 font-medium">{req.location}</div>
                  <Badge variant="purple" size="xs">{req.work_type}</Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="text-xs text-gray-700">{req.reason}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === 'Approved' ? 'emerald' : req.status === 'Rejected' ? 'rose' : 'amber'} size="sm">
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {req.status === 'Pending Approval' || req.status === 'Submitted' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="xs" variant="outline" className="text-emerald-700" onClick={() => handleApprove(req.id)}>
                        Approve
                      </Button>
                      <Button size="xs" variant="outline" className="text-rose-700" onClick={() => handleReject(req.id)}>
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-medium">Completed</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Apply for Work From Home (WFH)</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Employee Name</label>
                <input
                  type="text"
                  value={empName}
                  onChange={e => setEmpName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Total Days</label>
                  <input
                    type="number"
                    value={days}
                    onChange={e => setDays(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Remote Working Location</label>
                <input
                  type="text"
                  value={loc}
                  onChange={e => setLoc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason & Deliverables</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Describe reason for WFH request..."
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Submit WFH Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
