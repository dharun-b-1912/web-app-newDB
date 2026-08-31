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
import { api } from '../../services/api';

export const OvertimeRequestsView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'MY_REQUESTS' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [requests, setRequests] = useState<OvertimeRequest[]>(() => workOvertimeService.getOvertimeRequests());
  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const activeComp = api.getActiveCompany();
  const employees = api.getEmployeesSync(activeComp?.id) || [];
  const currentEmp = employees[0] || {
    id: 'emp-admin-001',
    display_name: 'Dharun B',
    employee_code: 'JCS-017',
    department_name: 'Engineering & Management',
    designation_title: 'Engineering Lead',
  };

  // Individual Form State
  const [selectedEmpId, setSelectedEmpId] = useState(currentEmp.id);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:30');
  const [endTime, setEndTime] = useState('21:30');
  const [expectedHours, setExpectedHours] = useState(3.0);
  const [reasonType, setReasonType] = useState<OvertimeRequest['reason_type']>('PRODUCTION_TARGET');
  const [customReason, setCustomReason] = useState('');
  const [workType, setWorkType] = useState<OvertimeRequest['work_type']>('MANUFACTURING');
  const [productionLine, setProductionLine] = useState('Line B - High Speed Assembly');
  const [machineId, setMachineId] = useState('MCH-EXT-440');
  const [projectName, setProjectName] = useState('Joy PeopleHR — HR & Payroll SaaS');
  const [location, setLocation] = useState('Coimbatore HQ / Plant 1');
  const [compType, setCompType] = useState<CompensationType>('PAID_OVERTIME');

  // Bulk Form State
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set(employees.map(e => e.id)));
  const [bulkDate, setBulkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bulkStartTime, setBulkStartTime] = useState('22:00');
  const [bulkEndTime, setBulkEndTime] = useState('02:00');
  const [bulkHours, setBulkHours] = useState(4.0);

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

  const handleApprove = async (id: string) => {
    await workOvertimeService.approveOvertimeRequest(id, currentEmp.display_name || (currentEmp as any).name || 'Department Manager', approverComment);
    showToast('Overtime request approved and mapped to operational payroll engine!');
    setSelectedRequestForAction(null);
    setApproverComment('');
    refreshList();
  };

  const handleReject = async (id: string) => {
    await workOvertimeService.rejectOvertimeRequest(id, currentEmp.display_name || (currentEmp as any).name || 'Department Manager', approverComment);
    showToast('Overtime request rejected');
    setSelectedRequestForAction(null);
    setApproverComment('');
    refreshList();
  };

  const handleSubmitIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customReason.trim()) {
      showToast('Please provide an operational business rationale');
      return;
    }

    const emp = employees.find(e => e.id === selectedEmpId) || currentEmp;
    const estimatedCost = expectedHours * 350 * 1.5;

    await workOvertimeService.submitOvertimeRequest({
      tenant_id: 'org-joy-01',
      employee_id: emp.id,
      employee_name: emp.display_name || `${(emp as any).first_name || ''} ${(emp as any).last_name || ''}`.trim() || (emp as any).name || 'Employee',
      employee_code: emp.employee_code || `WF-${emp.id}`,
      department: emp.department_name || (emp as any).department || 'Operations',
      designation: emp.designation_title || (emp as any).designation || 'Staff Specialist',
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
    const selectedStaff = employees
      .filter(e => bulkSelectedIds.has(e.id))
      .map(e => ({
        id: e.id,
        name: e.display_name || `${(e as any).first_name || ''} ${(e as any).last_name || ''}`.trim() || (e as any).name || 'Employee',
        code: e.employee_code || `WF-${e.id}`,
        department: e.department_name || (e as any).department || 'Operations',
      }));

    if (selectedStaff.length === 0) {
      showToast('Please select at least one employee for bulk overtime dispatch');
      return;
    }

    const count = workOvertimeService.bulkAssignOvertime(selectedStaff, {
      date: bulkDate,
      start_time: bulkStartTime,
      end_time: bulkEndTime,
      expected_hours: bulkHours,
      reason_type: 'PRODUCTION_TARGET',
      custom_reason: 'Night Shift production surge for scheduled operational dispatch',
      work_type: 'MANUFACTURING',
      production_line: 'Line A - High Precision Operations',
      machine_id: 'PRESS-HYD-09',
      location: 'Plant 1 - Coimbatore',
    });

    showToast(`Successfully assigned and approved bulk overtime for ${count} personnel!`);
    setIsBulkModalOpen(false);
    refreshList();
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'MY_REQUESTS') return req.employee_id === currentEmp.id;
    if (activeTab === 'PENDING') return req.status === 'PENDING_MANAGER' || req.status === 'PENDING_HR' || req.status === 'SUBMITTED';
    if (activeTab === 'APPROVED') return req.status === 'APPROVED';
    if (activeTab === 'REJECTED') return req.status === 'REJECTED';
    return true;
  });

  const getStatusBadge = (status: OvertimeRequestStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'PENDING_MANAGER':
      case 'PENDING_HR':
      case 'SUBMITTED':
        return <Badge variant="warning">Pending Authorization</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Overtime Authorization Desk</h2>
            <Badge variant="outline" size="sm">
              Live DB Outbox
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review, pre-approve and bulk-allocate overtime shifts with strict policy enforcement and zero payroll variance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Users className="w-4 h-4" />}
            onClick={() => setIsBulkModalOpen(true)}
          >
            Bulk Shift Dispatch
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsIndividualModalOpen(true)}
          >
            Request Overtime
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-2">
          {(
            [
              { id: 'PENDING', label: 'Pending Approval', count: requests.filter(r => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_HR' || r.status === 'SUBMITTED').length },
              { id: 'APPROVED', label: 'Approved Logs', count: requests.filter(r => r.status === 'APPROVED').length },
              { id: 'MY_REQUESTS', label: 'My Submissions' },
              { id: 'REJECTED', label: 'Rejected' },
              { id: 'ALL', label: 'All Requests' },
            ] as Array<{ id: 'MY_REQUESTS' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'; label: string; count?: number }>
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#07563D] text-[#07563D]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-emerald-100 text-[#07563D]' : 'bg-gray-100 text-gray-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase">
              <TableHead className="pl-4">Request Ref</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Date & Window</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Reason & Context</TableHead>
              <TableHead>Compensation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-medium">No overtime records found in this queue</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map(req => (
                <TableRow key={req.id} className="text-xs hover:bg-gray-50/60 transition-colors">
                  <TableCell className="pl-4 font-mono font-bold text-[#07563D]">
                    {req.id}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-gray-900">{req.employee_name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{req.employee_code} • {req.department}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-gray-900">{req.date}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{req.start_time} - {req.end_time}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-black text-gray-900">{req.expected_hours}h</div>
                    {req.approved_hours !== undefined && (
                      <div className="text-[10px] text-emerald-600 font-bold">{req.approved_hours}h Apprv</div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="font-semibold text-gray-900 truncate">{req.reason_type.replace('_', ' ')}</div>
                    <div className="text-[10px] text-gray-500 truncate" title={req.custom_reason}>{req.custom_reason}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-gray-800">
                      {req.compensation_type === 'PAID_OVERTIME' ? 'Paid (1.5x)' : 'Comp-Off'}
                    </div>
                    {req.estimated_cost !== undefined && (
                      <div className="text-[10px] text-[#07563D] font-black">₹{req.estimated_cost.toFixed(2)}</div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell className="text-right pr-4">
                    {req.status === 'PENDING_MANAGER' || req.status === 'PENDING_HR' || req.status === 'SUBMITTED' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-700 hover:bg-emerald-50 h-7 text-xs border-emerald-300"
                          onClick={() => {
                            setSelectedRequestForAction(req);
                          }}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Authorize
                        </Button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-400 font-medium">
                        {req.approver_name ? `By ${req.approver_name}` : 'Completed'}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Authorization Modal */}
      {selectedRequestForAction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Review Overtime Authorization</h3>
              <button onClick={() => setSelectedRequestForAction(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="font-bold text-gray-900">{selectedRequestForAction.employee_name} ({selectedRequestForAction.employee_code})</div>
                <div className="text-gray-500 mt-0.5">{selectedRequestForAction.date} • {selectedRequestForAction.start_time} - {selectedRequestForAction.end_time} ({selectedRequestForAction.expected_hours}h)</div>
                <div className="text-gray-700 font-medium mt-1">"{selectedRequestForAction.custom_reason}"</div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Supervisor Decision Comment</label>
                <textarea
                  value={approverComment}
                  onChange={e => setApproverComment(e.target.value)}
                  placeholder="Enter decision rationale for payroll audit log..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium h-20 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                className="text-rose-700 border-rose-200 hover:bg-rose-50"
                onClick={() => handleReject(selectedRequestForAction.id)}
              >
                Reject Request
              </Button>
              <Button
                size="sm"
                className="bg-[#07563D] hover:bg-[#064e37]"
                onClick={() => handleApprove(selectedRequestForAction.id)}
              >
                Approve & Sync Payroll
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Request Modal */}
      {isIndividualModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Pre-Approval Overtime Request</h3>
              <button onClick={() => setIsIndividualModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIndividual} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Employee</label>
                <select
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || (emp as any).name || 'Employee'} ({emp.employee_code || emp.id}) - {emp.department_name || (emp as any).department || 'Operations'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Overtime Date</label>
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
                  <label className="block font-bold text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    value={expectedHours}
                    onChange={e => setExpectedHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Compensation Plan</label>
                  <select
                    value={compType}
                    onChange={e => setCompType(e.target.value as CompensationType)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  >
                    <option value="PAID_OVERTIME">Paid Overtime (1.5x Premium)</option>
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
                <Button size="sm" type="submit" className="bg-[#07563D] hover:bg-[#064e37]">
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
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Bulk Shift Overtime Dispatch</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={e => setBulkDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start</label>
                  <input
                    type="time"
                    value={bulkStartTime}
                    onChange={e => setBulkStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">End</label>
                  <input
                    type="time"
                    value={bulkEndTime}
                    onChange={e => setBulkEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-gray-700">Select Operating Personnel ({bulkSelectedIds.size} Selected)</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (bulkSelectedIds.size === employees.length) {
                        setBulkSelectedIds(new Set());
                      } else {
                        setBulkSelectedIds(new Set(employees.map(e => e.id)));
                      }
                    }}
                    className="text-[#07563D] font-bold text-[11px] hover:underline"
                  >
                    {bulkSelectedIds.size === employees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1 p-2 rounded-xl bg-gray-50 border border-gray-200">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={bulkSelectedIds.has(emp.id)}
                        onChange={() => {
                          const next = new Set(bulkSelectedIds);
                          if (next.has(emp.id)) next.delete(emp.id);
                          else next.add(emp.id);
                          setBulkSelectedIds(next);
                        }}
                        className="rounded text-[#07563D] focus:ring-[#07563D]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 truncate">{emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || (emp as any).name || 'Employee'}</div>
                        <div className="text-[10px] text-gray-500 truncate">{emp.employee_code || emp.id} • {emp.department_name || (emp as any).department || 'Operations'}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-100 text-xs space-y-1">
                <div className="flex justify-between font-medium text-emerald-900">
                  <span>Total Selected:</span>
                  <span className="font-bold">{bulkSelectedIds.size} Personnel</span>
                </div>
                <div className="flex justify-between font-medium text-emerald-900">
                  <span>Total Scheduled Hours:</span>
                  <span className="font-bold">{(bulkSelectedIds.size * bulkHours).toFixed(1)} Man-Hours</span>
                </div>
                <div className="flex justify-between font-medium text-emerald-900">
                  <span>Estimated Batch Payroll Cost:</span>
                  <span className="font-black text-[#07563D]">₹{(bulkSelectedIds.size * bulkHours * 350 * 1.5).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsBulkModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleBulkSubmit} className="bg-[#07563D] hover:bg-[#064e37]">
                Confirm & Dispatch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
