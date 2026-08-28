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

export const WfhRequestsView: React.FC = () => {
  const { showToast } = useToast();
  const [wfhList, setWfhList] = useState<WfhRequest[]>(() => workOvertimeService.getWfhRequests());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'MY_REQUESTS' | 'APPROVED' | 'ALL'>('PENDING');

  const [mode, setMode] = useState<WfhMode>('FULL_DAY');
  const [startDate, setStartDate] = useState('2026-08-28');
  const [endDate, setEndDate] = useState('2026-08-28');
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

  const handleApprove = (id: string) => {
    workOvertimeService.approveWfhRequest(id, 'Vikramaditya Roy (HOD)');
    showToast('Work from Home request approved and roster location updated to REMOTE!');
    refreshList();
  };

  const handleReject = (id: string) => {
    workOvertimeService.rejectWfhRequest(id, 'Vikramaditya Roy (HOD)');
    showToast('Work from Home request rejected');
    refreshList();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !workPlan.trim()) {
      showToast('Please provide both the reason and daily work plan');
      return;
    }

    workOvertimeService.submitWfhRequest({
      tenant_id: 'default-tenant',
      employee_id: 'emp-001',
      employee_name: 'Arun Kumar',
      department: 'Engineering',
      mode,
      start_date: startDate,
      end_date: endDate,
      days_count: mode === 'FULL_DAY' ? 1 : 4,
      reason,
      work_plan: workPlan,
      location_city: locationCity,
      status: 'PENDING',
      remaining_wfh_quota: 3,
    });

    showToast('WFH request submitted for manager approval');
    setIsModalOpen(false);
    setReason('');
    setWorkPlan('');
    refreshList();
  };

  const filteredRequests = wfhList.filter(req => {
    if (activeTab === 'PENDING') return req.status === 'PENDING';
    if (activeTab === 'MY_REQUESTS') return req.employee_id === 'emp-001';
    if (activeTab === 'APPROVED') return req.status === 'APPROVED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Work From Home (WFH) & Hybrid Desk</h2>
            <Badge variant="outline" size="sm">
              Work Location Workflow
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            WFH configures remote roster work-location. Actual presence, check-in, check-out and work hours remain recorded via live attendance.
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          + Request WFH
        </Button>
      </div>

      {/* Quota Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monthly WFH Allowance</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">4 Days / Month</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">3 Days Remaining in August</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active WFH Today</div>
          <div className="text-2xl font-black text-[#07563D] mt-0.5">2 Employees</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Remote Location Tagged</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Consecutive Days Limit</div>
          <div className="text-2xl font-black text-blue-700 mt-0.5">Max 3 Days</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Policy compliance rule</div>
        </Card>
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
            {wfhList.filter(r => r.status === 'PENDING').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('MY_REQUESTS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'MY_REQUESTS' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          My WFH Requests
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'APPROVED' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Approved Remote Schedule
        </button>

        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'ALL' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Requests ({wfhList.length})
        </button>
      </div>

      {/* Requests Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead className="font-bold text-xs text-gray-700">Employee & Dept</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Dates & Duration</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">WFH Mode</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Reason</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Work Plan / Deliverables</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Location</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Status</TableHead>
              <TableHead className="font-bold text-xs text-gray-700 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map(req => (
              <TableRow key={req.id} className="hover:bg-gray-50/60 transition-colors">
                <TableCell>
                  <div className="font-bold text-xs text-gray-900">{req.employee_name}</div>
                  <div className="text-[10px] text-gray-500">{req.department}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">
                    {req.start_date} {req.end_date !== req.start_date && `→ ${req.end_date}`}
                  </div>
                  <div className="text-[10px] text-gray-500">{req.days_count} Day(s)</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" size="sm">
                    {req.mode.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-gray-700 max-w-[200px] truncate" title={req.reason}>
                    {req.reason}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-gray-700 max-w-[220px] truncate" title={req.work_plan}>
                    {req.work_plan}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-medium text-gray-800 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {req.location_city}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === 'APPROVED' ? 'emerald' : req.status === 'REJECTED' ? 'rose' : 'amber'} size="sm">
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {req.status === 'PENDING' ? (
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
                      {req.approver_name ? `Approved by ${req.approver_name}` : 'Processed'}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* WFH Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Request Work From Home (WFH)</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">WFH Mode</label>
                  <select
                    value={mode}
                    onChange={e => setMode(e.target.value as WfhMode)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  >
                    <option value="FULL_DAY">Full Day</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="RECURRING">Recurring Hybrid</option>
                  </select>
                </div>
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
                <label className="block font-bold text-gray-700 mb-1">Remote Working City / Location</label>
                <input
                  type="text"
                  value={locationCity}
                  onChange={e => setLocationCity(e.target.value)}
                  placeholder="e.g. Coimbatore, Home Address"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Remote Work</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Explain why WFH is required..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium h-16"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Deliverable Work Plan</label>
                <textarea
                  value={workPlan}
                  onChange={e => setWorkPlan(e.target.value)}
                  placeholder="Specify key tasks and deliverable milestones planned for this remote day..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium h-16"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
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
