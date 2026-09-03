import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  Laptop,
  Plus,
  Calendar,
  MapPin,
  FileText,
  Check,
  X,
  Building2,
  Info,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { WfhRequest, WfhMode } from '../../types/workOvertime';
import { workOvertimeService } from '../../services/workOvertimeService';
import { api } from '../../services/api';
import { useEmployees } from '../../hooks/useEmployees';

export const WfhRequestsView: React.FC = () => {
  const { showToast } = useToast();
  const [wfhList, setWfhList] = useState<WfhRequest[]>(() => workOvertimeService.getWfhRequests());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'MY_REQUESTS' | 'APPROVED' | 'ALL'>('PENDING');

  const activeComp = api.getActiveCompany();
  const { employees } = useEmployees({ companyId: activeComp?.id });
  const currentEmp = employees[0] || { id: 'emp-admin-001', display_name: 'Dharun B', employee_code: 'JCS-017', department_name: 'Engineering & Management' };

  const [selectedEmpId, setSelectedEmpId] = useState(currentEmp.id);
  const [mode, setMode] = useState<WfhMode>('FULL_DAY');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [workPlan, setWorkPlan] = useState('');
  const [locationCity, setLocationCity] = useState('Coimbatore');

  const refreshList = () => {
    setWfhList(workOvertimeService.getWfhRequests());
  };

  useEffect(() => {
    const handleUpdate = () => refreshList();
    window.addEventListener('work-overtime:updated', handleUpdate);
    return () => window.removeEventListener('work-overtime:updated', handleUpdate);
  }, []);

  const handleApprove = async (id: string) => {
    await workOvertimeService.approveWfhRequest(id, currentEmp.display_name || (currentEmp as any).name || 'Department Manager');
    showToast('Work from Home request approved and roster location updated to REMOTE!');
    refreshList();
  };

  const handleReject = async (id: string) => {
    await workOvertimeService.rejectWfhRequest(id, currentEmp.display_name || (currentEmp as any).name || 'Department Manager');
    showToast('Work from Home request rejected');
    refreshList();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !workPlan.trim()) {
      showToast('Please provide both the reason and daily work plan');
      return;
    }

    const emp = employees.find(e => e.id === selectedEmpId) || currentEmp;

    await workOvertimeService.submitWfhRequest({
      tenant_id: 'org-joy-01',
      employee_id: emp.id,
      employee_name: emp.display_name || `${(emp as any).first_name || ''} ${(emp as any).last_name || ''}`.trim() || (emp as any).name || 'Employee',
      employee_code: (emp as any).employee_code,
      department: emp.department_name || (emp as any).department || 'Operations',
      mode,
      start_date: startDate,
      end_date: endDate,
      days_count: mode === 'FULL_DAY' ? 1 : 4,
      reason,
      work_plan: workPlan,
      location_city: locationCity,
      status: 'PENDING',
      remaining_wfh_quota: 4,
    });

    showToast('WFH request submitted for manager approval');
    setIsModalOpen(false);
    setReason('');
    setWorkPlan('');
    refreshList();
  };

  const filteredRequests = wfhList.filter(req => {
    if (activeTab === 'PENDING') return req.status === 'PENDING';
    if (activeTab === 'MY_REQUESTS') return req.employee_id === currentEmp.id;
    if (activeTab === 'APPROVED') return req.status === 'APPROVED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Work From Home (WFH) Management</h2>
            <Badge variant="outline" size="sm">
              Live DB Outbox
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Empower hybrid and remote workers with transparent approval workflows, policy quotas, and automatic attendance status synchronization.
          </p>
        </div>

        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
          className="bg-[#07563D] hover:bg-[#064e37]"
        >
          Apply Remote / WFH
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-2">
          {(
            [
              { id: 'PENDING', label: 'Pending Approvals', count: wfhList.filter(w => w.status === 'PENDING').length },
              { id: 'APPROVED', label: 'Approved WFH Logs', count: wfhList.filter(w => w.status === 'APPROVED').length },
              { id: 'MY_REQUESTS', label: 'My Applications' },
              { id: 'ALL', label: 'All Applications' },
            ] as Array<{ id: 'PENDING' | 'MY_REQUESTS' | 'APPROVED' | 'ALL'; label: string; count?: number }>
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
              <TableHead>Mode & Dates</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Business Deliverables Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                  <Laptop className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-medium">No WFH requests found in this queue</p>
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
                    <div className="text-[10px] text-gray-500">{req.department}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-gray-900">{req.start_date} {req.end_date !== req.start_date ? `to ${req.end_date}` : ''}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{req.mode} • {req.days_count} Day(s)</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-700">{req.location_city}</div>
                    <div className="text-[10px] text-emerald-600 font-bold">Remote Mesh</div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="font-semibold text-gray-900 truncate">{req.reason}</div>
                    <div className="text-[10px] text-gray-500 truncate" title={req.work_plan}>{req.work_plan}</div>
                  </TableCell>
                  <TableCell>
                    {req.status === 'APPROVED' ? (
                      <Badge variant="success">Approved</Badge>
                    ) : req.status === 'PENDING' ? (
                      <Badge variant="warning">Pending</Badge>
                    ) : (
                      <Badge variant="danger">Rejected</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    {req.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-700 hover:bg-rose-50 h-7 text-xs border-rose-200"
                          onClick={() => handleReject(req.id)}
                        >
                          <X className="w-3.5 h-3.5 mr-0.5" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#07563D] hover:bg-[#064e37] h-7 text-xs"
                          onClick={() => handleApprove(req.id)}
                        >
                          <Check className="w-3.5 h-3.5 mr-0.5" /> Approve
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-medium">
                        {req.approver_name ? `By ${req.approver_name}` : 'Completed'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Submit WFH Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Work From Home Application</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">WFH Mode</label>
                  <select
                    value={mode}
                    onChange={e => setMode(e.target.value as WfhMode)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  >
                    <option value="FULL_DAY">Full Day Remote</option>
                    <option value="HALF_DAY">Half Day (First / Second Half)</option>
                    <option value="RECURRING">Weekly Recurring Window</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Remote Working City</label>
                  <input
                    type="text"
                    value={locationCity}
                    onChange={e => setLocationCity(e.target.value)}
                    placeholder="e.g. Coimbatore / Bangalore"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Remote Work</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Family commitments / focused deep work sprint"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Key Deliverables & Daily Work Plan</label>
                <textarea
                  value={workPlan}
                  onChange={e => setWorkPlan(e.target.value)}
                  placeholder="Outline tasks, sprint deliverables, and scheduled team sync meetings..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium h-20"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-[#07563D] hover:bg-[#064e37]">
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
