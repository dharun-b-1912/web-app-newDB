import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  Clock,
  Plus,
  Check,
  X,
  Calendar,
  FileText,
  Factory,
  Users,
  AlertCircle,
  ShieldCheck,
  Building2,
  DollarSign,
  Send,
  Zap,
} from 'lucide-react';
import { OvertimeRequest, OvertimeRequestStatus, CompensationType } from '../../types/workOvertime';
import { workOvertimeService } from '../../services/workOvertimeService';

export const OvertimeRequestsView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'MY_REQUESTS' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [requests, setRequests] = useState<OvertimeRequest[]>(() => workOvertimeService.getOvertimeRequests());
  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Individual Form State
  const [date, setDate] = useState('2026-08-27');
  const [startTime, setStartTime] = useState('18:30');
  const [endTime, setEndTime] = useState('21:30');
  const [expectedHours, setExpectedHours] = useState(3.0);
  const [reasonType, setReasonType] = useState<OvertimeRequest['reason_type']>('PRODUCTION_TARGET');
  const [customReason, setCustomReason] = useState('');
  const [workType, setWorkType] = useState<OvertimeRequest['work_type']>('MANUFACTURING');
  const [productionLine, setProductionLine] = useState('Line B - High Speed Assembly');
  const [machineId, setMachineId] = useState('MCH-EXT-440');
  const [projectName, setProjectName] = useState('WorkForceOS Enterprise');
  const [location, setLocation] = useState('Coimbatore HQ / Plant 1');
  const [compType, setCompType] = useState<CompensationType>('PAID_OVERTIME');

  // Approver modal
  const [selectedRequestForAction, setSelectedRequestForAction] = useState<OvertimeRequest | null>(null);
  const [approverComment, setApproverComment] = useState('');

  const refreshList = () => {
    setRequests(workOvertimeService.getOvertimeRequests());
  };

  useEffect(() => {
    const handleUpdate = () => refreshList();
    window.addEventListener('work-overtime:updated', handleUpdate);
    return () => window.removeEventListener('work-overtime:updated', handleUpdate);
  }, []);

  const handleApprove = (id: string) => {
    workOvertimeService.approveOvertimeRequest(id, 'HOD / Department Manager', approverComment);
    showToast('Overtime request approved and mapped to operational payroll engine!');
    setSelectedRequestForAction(null);
    setApproverComment('');
    refreshList();
  };

  const handleReject = (id: string) => {
    workOvertimeService.rejectOvertimeRequest(id, 'HOD / Department Manager', approverComment);
    showToast('Overtime request rejected');
    setSelectedRequestForAction(null);
    setApproverComment('');
    refreshList();
  };

  const handleSubmitIndividual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customReason.trim()) {
      showToast('Please provide an operational business rationale');
      return;
    }

    const estimatedCost = expectedHours * 350 * 1.5;
    workOvertimeService.submitOvertimeRequest({
      tenant_id: 'default-tenant',
      employee_id: 'emp-001',
      employee_name: 'Arun Kumar',
      employee_code: 'JOY-0104',
      department: 'Engineering',
      designation: 'Senior Lead Engineer',
      date,
      start_time: startTime,
      end_time: endTime,
      expected_hours: expectedHours,
      reason_type: reasonType,
      custom_reason: customReason,
      work_type: workType,
      project_name: workType === 'PROJECT' ? projectName : undefined,
      production_line: workType === 'MANUFACTURING' ? productionLine : undefined,
      machine_id: workType === 'MANUFACTURING' ? machineId : undefined,
      location,
      status: 'PENDING_MANAGER',
      compensation_type: compType,
      estimated_cost: estimatedCost,
    });

    showToast('Overtime pre-approval request submitted for supervisor authorization');
    setIsIndividualModalOpen(false);
    setCustomReason('');
    refreshList();
  };

  const handleBulkSubmit = () => {
    const sampleStaff = [
      { id: 'emp-021', name: 'Ramesh Balan', code: 'JOY-0221', department: 'Manufacturing Ops' },
      { id: 'emp-022', name: 'Saravanan K', code: 'JOY-0222', department: 'Manufacturing Ops' },
      { id: 'emp-023', name: 'Velmurugan M', code: 'JOY-0223', department: 'Manufacturing Ops' },
      { id: 'emp-024', name: 'Praveen Chandran', code: 'JOY-0224', department: 'Manufacturing Ops' },
    ];

    const count = workOvertimeService.bulkAssignOvertime(sampleStaff, {
      date: '2026-08-27',
      start_time: '22:00',
      end_time: '02:00',
      expected_hours: 4.0,
      reason_type: 'PRODUCTION_TARGET',
      custom_reason: 'Night Shift production surge for Q3 export dispatch',
      work_type: 'MANUFACTURING',
      production_line: 'Line A - Press Stamping',
      machine_id: 'PRESS-HYD-09',
      location: 'Plant 1 - Coimbatore',
    });

    showToast(`Successfully assigned and approved bulk overtime for ${count} floor operators!`);
    setIsBulkModalOpen(false);
    refreshList();
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'MY_REQUESTS') return req.employee_id === 'emp-001';
    if (activeTab === 'PENDING') return req.status === 'PENDING_MANAGER' || req.status === 'PENDING_HR';
    if (activeTab === 'APPROVED') return req.status === 'APPROVED';
    if (activeTab === 'REJECTED') return req.status === 'REJECTED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Overtime Requests & Pre-Approval Workflow</h2>
          <p className="text-xs text-gray-500 mt-1">
            Planned & emergency overtime requests. Note: <span className="font-semibold text-gray-700">Requested OT ≠ Actual Work ≠ Payable OT</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Users className="w-4 h-4" />}
            onClick={() => setIsBulkModalOpen(true)}
          >
            Bulk Shift OT
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsIndividualModalOpen(true)}
          >
            + Request Overtime
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PENDING' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>Pending Approvals</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-gray-950 font-black">
            {requests.filter(r => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_HR').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('MY_REQUESTS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'MY_REQUESTS' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          My Requests
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'APPROVED' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Approved History
        </button>

        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'REJECTED' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Rejected
        </button>

        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'ALL' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Requests ({requests.length})
        </button>
      </div>

      {/* Requests Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead className="font-bold text-xs text-gray-700">Employee & Dept</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Date & Window</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Expected Hours</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Reason & Work Type</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Production / Project Target</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Compensation</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Status</TableHead>
              <TableHead className="font-bold text-xs text-gray-700 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-xs text-gray-500">
                  No overtime requests found in this view.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map(req => (
                <TableRow key={req.id} className="hover:bg-gray-50/60 transition-colors">
                  <TableCell>
                    <div className="font-bold text-xs text-gray-900">{req.employee_name}</div>
                    <div className="text-[10px] text-gray-500">
                      {req.employee_code} • {req.department}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-900">{req.date}</div>
                    <div className="text-[10px] font-mono text-gray-500">
                      {req.start_time} - {req.end_time}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-bold text-gray-900">{req.expected_hours}h</div>
                    {req.actual_hours && (
                      <div className="text-[10px] text-gray-500">Actual: {req.actual_hours}h</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-900">{req.reason_type.replace(/_/g, ' ')}</div>
                    <div className="text-[10px] text-gray-500 truncate max-w-[200px]" title={req.custom_reason}>
                      {req.custom_reason}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium text-gray-800">
                      {req.production_line || req.project_name || req.location}
                    </div>
                    {req.machine_id && <div className="text-[10px] text-gray-500">Machine: {req.machine_id}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={req.compensation_type === 'COMP_OFF' ? 'amber' : 'outline'} size="sm">
                      {req.compensation_type === 'COMP_OFF' ? 'Comp-Off Credit' : 'Paid Overtime'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        req.status === 'APPROVED'
                          ? 'emerald'
                          : req.status === 'REJECTED'
                          ? 'rose'
                          : 'amber'
                      }
                      size="sm"
                    >
                      {req.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === 'PENDING_MANAGER' || req.status === 'PENDING_HR' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApprove(req.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => handleReject(req.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-medium">
                        {req.approver_name ? `By ${req.approver_name}` : 'Processed'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Individual Request Modal */}
      {isIndividualModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Request Overtime Pre-Approval</h3>
              <button onClick={() => setIsIndividualModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIndividual} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Expected Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={expectedHours}
                    onChange={e => setExpectedHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Compensation</label>
                  <select
                    value={compType}
                    onChange={e => setCompType(e.target.value as CompensationType)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  >
                    <option value="PAID_OVERTIME">Paid Overtime (Payroll)</option>
                    <option value="COMP_OFF">Compensatory Off Credit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Reason Category</label>
                  <select
                    value={reasonType}
                    onChange={e => setReasonType(e.target.value as OvertimeRequest['reason_type'])}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  >
                    <option value="PRODUCTION_TARGET">Production Target Surge</option>
                    <option value="MACHINE_BREAKDOWN">Machine Breakdown</option>
                    <option value="PROJECT_RELEASE">Project Sprint Release</option>
                    <option value="CLIENT_SUPPORT">Client Support Escalation</option>
                    <option value="URGENT_DISPATCH">Urgent Logistics Dispatch</option>
                    <option value="OTHER">Other Operational Need</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Work Type / Environment</label>
                  <select
                    value={workType}
                    onChange={e => setWorkType(e.target.value as OvertimeRequest['work_type'])}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  >
                    <option value="MANUFACTURING">Manufacturing Floor</option>
                    <option value="PROJECT">IT / Project Work</option>
                    <option value="OFFICE">Corporate Office</option>
                    <option value="FIELD">Field Site</option>
                    <option value="REMOTE">Remote / WFH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Operational Business Rationale</label>
                <textarea
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Detail specific sprint goals, production batches or repair tasks..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium h-20"
                  required
                />
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800">Estimated Compensation:</span>
                <span className="font-black text-[#07563D]">₹{(expectedHours * 350 * 1.5).toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsIndividualModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Submit for Approval
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Shift Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Bulk Shift Overtime Dispatch</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Assign overtime simultaneously to all 4 operators on <span className="font-bold text-gray-900">Line A - Night Shift (22:00 - 02:00)</span> for production target fulfillment.
            </p>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
              <div className="flex justify-between font-medium text-gray-700">
                <span>Selected Operators:</span>
                <span className="font-bold text-gray-900">4 Specialists</span>
              </div>
              <div className="flex justify-between font-medium text-gray-700">
                <span>Total Overtime Hours:</span>
                <span className="font-bold text-gray-900">16.0 Man-Hours</span>
              </div>
              <div className="flex justify-between font-medium text-gray-700">
                <span>Estimated Batch Cost:</span>
                <span className="font-bold text-[#07563D]">₹5,600.00</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsBulkModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleBulkSubmit}>
                Confirm & Dispatch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
