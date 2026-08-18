// src/features/talent/recruitment/RequisitionManager.tsx
// ============================================================================
// WorkForceOS — Requisition Master & Multi-Tier Approval Lifecycle
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  DollarSign,
  User,
  Users,
  ChevronRight,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import { Requisition, RequisitionPriority, RequisitionType } from '../../../types/ats';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

export const RequisitionManager: React.FC = () => {
  const { showToast } = useToast();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReqForApproval, setSelectedReqForApproval] = useState<Requisition | null>(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Form States
  const [jobTitle, setJobTitle] = useState('');
  const [departmentName, setDepartmentName] = useState('Engineering');
  const [locationName, setLocationName] = useState('Coimbatore HQ Campus');
  const [numberOfPositions, setNumberOfPositions] = useState(1);
  const [requisitionType, setRequisitionType] = useState<RequisitionType>('New Position');
  const [priority, setPriority] = useState<RequisitionPriority>('Medium');
  const [budget, setBudget] = useState(1800000);
  const [minSalary, setMinSalary] = useState(1200000);
  const [maxSalary, setMaxSalary] = useState(1800000);
  const [hiringManagerName, setHiringManagerName] = useState('Dharun Joy');
  const [jobDescription, setJobDescription] = useState('');
  const [businessJustification, setBusinessJustification] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await recruitmentService.getRequisitions({ status: statusFilter, search });
      setRequisitions(list);
    } catch (err) {
      console.error('[RequisitionManager] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, search]);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('recruitment.*', () => {
      loadData();
    });
    return () => unsub();
  }, []);

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle) return;

    try {
      await recruitmentService.createRequisition({
        job_title: jobTitle,
        department_name: departmentName,
        location_name: locationName,
        number_of_positions: numberOfPositions,
        requisition_type: requisitionType,
        priority,
        budget,
        min_salary: minSalary,
        max_salary: maxSalary,
        hiring_manager_name: hiringManagerName,
        job_description: jobDescription,
        business_justification: businessJustification,
      });

      showToast(`Requisition for ${jobTitle} submitted for multi-tier approval!`);
      setIsCreateModalOpen(false);
      setJobTitle('');
      setJobDescription('');
      setBusinessJustification('');
      loadData();
    } catch {
      showToast('Error creating requisition', 'error');
    }
  };

  const handleApproveStep = async (reqId: string, stepOrder: number) => {
    try {
      await recruitmentService.approveRequisitionStep(reqId, stepOrder, approvalComments || 'Approved by reviewer');
      showToast('Requisition approval step confirmed!');
      setSelectedReqForApproval(null);
      setApprovalComments('');
      loadData();
    } catch {
      showToast('Error approving requisition', 'error');
    }
  };

  const handleRejectRequisition = async (reqId: string) => {
    if (!rejectionReason.trim()) return;
    try {
      await recruitmentService.rejectRequisition(reqId, rejectionReason, 'HR Reviewer');
      showToast('Requisition rejected with recorded justification', 'error');
      setSelectedReqForApproval(null);
      setRejectionReason('');
      setIsRejecting(false);
      loadData();
    } catch {
      showToast('Error rejecting requisition', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search requisitions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D] w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-2 text-xs rounded-xl border border-gray-200 bg-white font-bold text-gray-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Open">Open</option>
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Create Requisition
        </Button>
      </div>

      {/* Requisitions Data Table */}
      <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-gray-400">Loading requisitions...</div>
        ) : requisitions.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <FileCheck2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-900">No Job Requisitions Found</h4>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Submit headcount requisitions for manager, department head, and HR approval.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Create First Requisition
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-gray-700">Requisition & Role</TableHead>
                <TableHead className="font-bold text-gray-700">Department</TableHead>
                <TableHead className="font-bold text-gray-700 text-center">Openings</TableHead>
                <TableHead className="font-bold text-gray-700">Budget (CTC)</TableHead>
                <TableHead className="font-bold text-gray-700">Approvals</TableHead>
                <TableHead className="font-bold text-gray-700">Status</TableHead>
                <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisitions.map(req => {
                const approvedCount = (req.approval_workflow || []).filter(w => w.status === 'Approved').length;
                const totalSteps = req.approval_workflow?.length || 3;
                return (
                  <TableRow key={req.id} className="hover:bg-emerald-50/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-gray-400">{req.id}</span>
                        <Badge variant={req.priority === 'Urgent' ? 'rose' : 'gray'} size="sm" className="text-[9px]">
                          {req.priority}
                        </Badge>
                      </div>
                      <div className="font-bold text-gray-900 text-xs mt-0.5">{req.job_title}</div>
                      <div className="text-[11px] text-gray-400">{req.requisition_type} • {req.job_level}</div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-800 font-medium">
                      {req.department_name}
                      <div className="text-[11px] text-gray-400">{req.location_name}</div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-gray-900">
                      {req.number_of_positions}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-gray-800">
                      INR {req.budget?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#07563D]">
                          {approvedCount}/{totalSteps}
                        </span>
                        <span className="text-[10px] text-gray-400">Steps</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={req.status === 'Approved' ? 'emerald' : req.status === 'Rejected' ? 'rose' : 'amber'}
                        className="text-[10px]"
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'Pending Approval' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReqForApproval(req)}
                          className="text-xs font-bold text-[#07563D] border-emerald-300 rounded-xl"
                        >
                          Review & Approve
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReqForApproval(req)}
                          className="text-xs text-gray-500 hover:text-gray-900"
                        >
                          View Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal: Create Requisition */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Job Headcount Requisition"
        description="Submit requisition for workforce planning, budget validation, and multi-tier approvals"
      >
        <form onSubmit={handleCreateRequisition} className="p-6 space-y-4 max-h-[80vh] overflow-auto">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Job Title *</label>
            <input
              type="text"
              placeholder="e.g. Lead Distributed Backend Engineer"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
              <select
                value={departmentName}
                onChange={e => setDepartmentName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product & Design">Product & Design</option>
                <option value="People & HR">People & HR</option>
                <option value="Finance & Legal">Finance & Legal</option>
                <option value="Sales & Marketing">Sales & Marketing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Location Campus</label>
              <input
                type="text"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Headcount</label>
              <input
                type="number"
                min="1"
                value={numberOfPositions}
                onChange={e => setNumberOfPositions(Number(e.target.value))}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Requisition Type</label>
              <select
                value={requisitionType}
                onChange={e => setRequisitionType(e.target.value as RequisitionType)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
              >
                <option value="New Position">New Position</option>
                <option value="Replacement">Replacement</option>
                <option value="Expansion">Expansion</option>
                <option value="Backfill">Backfill</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as RequisitionPriority)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
              >
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Annual Budget (INR) *</label>
              <input
                type="number"
                step="50000"
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Hiring Manager</label>
              <input
                type="text"
                value={hiringManagerName}
                onChange={e => setHiringManagerName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Business Justification</label>
            <textarea
              placeholder="Explain why this position is required, impact on team delivery, and hiring goals..."
              value={businessJustification}
              onChange={e => setBusinessJustification(e.target.value)}
              rows={2}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Submit Requisition
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Requisition Approval & Review */}
      {selectedReqForApproval && (
        <Modal
          isOpen={!!selectedReqForApproval}
          onClose={() => setSelectedReqForApproval(null)}
          title={`Requisition Review: ${selectedReqForApproval.job_title}`}
          description={`ID: ${selectedReqForApproval.id} • Budget: INR ${selectedReqForApproval.budget?.toLocaleString()}`}
        >
          <div className="p-6 space-y-5">
            {/* Approval Workflow Chain */}
            <div className="space-y-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-200/80">
              <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Multi-Tier Approval Chain</h5>
              {(selectedReqForApproval.approval_workflow || []).map((step, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200/80 text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{step.role}:</span>{' '}
                    <span className="text-gray-600">{step.approver_name}</span>
                  </div>
                  <Badge variant={step.status === 'Approved' ? 'emerald' : 'amber'} size="sm" className="text-[9px]">
                    {step.status}
                  </Badge>
                </div>
              ))}
            </div>

            {isRejecting ? (
              <div className="space-y-3 p-4 bg-rose-50 rounded-2xl border border-rose-200">
                <label className="block text-xs font-bold text-rose-900">Rejection Justification *</label>
                <textarea
                  placeholder="Provide detailed feedback on why this requisition cannot be approved (budget, headcount limits, timing)..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 text-xs rounded-xl border border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsRejecting(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleRejectRequisition(selectedReqForApproval.id)}
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Review Comments (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Approved within Q3 hiring budget"
                  value={approvalComments}
                  onChange={e => setApprovalComments(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
                />
              </div>
            )}

            {!isRejecting && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejecting(true)}
                  className="text-rose-600 border-rose-300 hover:bg-rose-50 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Reject Requisition
                </Button>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedReqForApproval(null)}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleApproveStep(selectedReqForApproval.id, 0)}
                    className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Step
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
