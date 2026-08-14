import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Check, X, Clock, FileText, Plus, ShieldCheck, AlertCircle } from 'lucide-react';
import { RegularizationRequest } from '../../../types/attendance';
import { attendanceApi } from '../../../services/attendanceApi';
import { useToast } from '../../../components/ui/Toast';

export const RegularizationView: React.FC = () => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<RegularizationRequest[]>(() => attendanceApi.getRegularizations());
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Form State
  const [empName, setEmpName] = useState('Ananya Deshmukh');
  const [date, setDate] = useState('2026-08-11');
  const [reqIn, setReqIn] = useState('09:30 AM');
  const [reqOut, setReqOut] = useState('06:30 PM');
  const [reason, setReason] = useState('');

  const refreshList = () => {
    setRequests(attendanceApi.getRegularizations());
  };

  const handleApprove = (id: string) => {
    attendanceApi.approveRegularization(id, 'Approved', 'Manager approved regularization request.');
    showToast('Regularization request approved and daily attendance recalculated!');
    refreshList();
  };

  const handleReject = (id: string) => {
    attendanceApi.approveRegularization(id, 'Rejected', 'Reason provided is insufficient per policy.');
    showToast('Regularization request rejected');
    refreshList();
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please specify reason for attendance regularization');
      return;
    }
    attendanceApi.submitRegularization({
      employee_id: 'emp-006',
      employee_name: empName,
      attendance_date: date,
      current_status: 'Missing Punch',
      requested_check_in: reqIn,
      requested_check_out: reqOut,
      reason,
      approver_name: 'Arun Kumar (Engineering Manager)',
    });
    showToast('Regularization request submitted to manager approval workflow');
    setIsSubmitModalOpen(false);
    setReason('');
    refreshList();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Attendance Regularization Center</h2>
          <p className="text-xs text-gray-500 mt-1">
            Correction requests for missing check-ins, early exits, wrong shift badges, and biometric sync glitches
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsSubmitModalOpen(true)}>
          New Regularization Request
        </Button>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900">Pending & Historical Regularizations</h3>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date & Current Status</TableHead>
              <TableHead>Requested Punch</TableHead>
              <TableHead>Reason & Document</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead>Approval Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map(req => (
              <TableRow key={req.id}>
                <TableCell>
                  <div className="font-bold text-gray-900 text-xs">{req.employee_name}</div>
                  <div className="text-[10px] text-gray-500">Approver: {req.approver_name || 'HR Manager'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">{req.attendance_date}</div>
                  <Badge variant="rose" size="xs">{req.current_status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono text-emerald-800 font-bold">In: {req.requested_check_in}</div>
                  <div className="text-xs font-mono text-gray-800 font-bold">Out: {req.requested_check_out}</div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="text-xs text-gray-700 line-clamp-2">{req.reason}</p>
                </TableCell>
                <TableCell className="text-xs text-gray-500">{req.submitted_at}</TableCell>
                <TableCell>
                  <Badge
                    variant={req.status === 'Approved' ? 'emerald' : req.status === 'Rejected' ? 'rose' : 'amber'}
                    size="sm"
                  >
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {req.status === 'Pending Manager' || req.status === 'Submitted' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => handleApprove(req.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        className="text-rose-700 border-rose-300 hover:bg-rose-50"
                        leftIcon={<X className="w-3.5 h-3.5" />}
                        onClick={() => handleReject(req.id)}
                      >
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

      {/* Submit Regularization Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Submit Attendance Regularization</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Employee Name</label>
                <input
                  type="text"
                  value={empName}
                  onChange={e => setEmpName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Attendance Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Current Status</label>
                  <input
                    type="text"
                    disabled
                    value="Missing Punch"
                    className="w-full px-3 py-2 border bg-gray-50 rounded-xl text-xs text-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Requested Check-In</label>
                  <input
                    type="text"
                    value={reqIn}
                    onChange={e => setReqIn(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Requested Check-Out</label>
                  <input
                    type="text"
                    value={reqOut}
                    onChange={e => setReqOut(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Detailed Reason & Business Justification</label>
                <textarea
                  rows={3}
                  placeholder="Explain reason for missing punch or late arrival..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsSubmitModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
