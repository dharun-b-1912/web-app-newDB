import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Plus, Search, Filter, FileCheck2, CheckCircle, XCircle, Clock, ArrowRight, Building2, User } from 'lucide-react';
import { atsService } from '../../../services/atsService';
import { Requisition, RequisitionType, RequisitionPriority } from '../../../types/ats';
import { useToast } from '../../../components/ui/Toast';

export const RequisitionManager: React.FC<{ onCreateJob?: (reqId: string) => void }> = ({ onCreateJob }) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);

  const requisitions = atsService.getRequisitions();

  // Form State
  const [formData, setFormData] = useState({
    job_title: '',
    company_name: 'Acme Technologies Pvt Ltd',
    business_unit: 'Core Product Engineering',
    department_name: 'Engineering',
    location_name: 'Coimbatore HQ - Tech Park',
    hiring_manager_name: 'Anand V.',
    recruiter_name: 'Dharun Joy',
    designation_title: 'Senior Software Engineer',
    job_level: 'L5',
    employment_type: 'Full Time',
    number_of_positions: 1,
    requisition_type: 'New Position' as RequisitionType,
    replacement_employee_name: '',
    reason_for_hiring: '',
    priority: 'High' as RequisitionPriority,
    expected_joining_date: '2026-10-01',
    budget: 2400000,
    min_salary: 1800000,
    max_salary: 2400000,
    currency: 'INR',
    required_skills: 'React, TypeScript, Node.js',
    preferred_skills: 'AWS, Tailwind CSS',
    education: "Bachelor's Degree in CS/IT",
    job_description: 'Responsible for leading key full-stack software initiatives.',
    responsibilities: 'Develop high quality web applications; Mentor junior developers.',
    qualifications: '4+ years software engineering experience.',
  });

  const handleCreateRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = atsService.createRequisition({
        company_id: 'comp-01',
        company_name: formData.company_name,
        business_unit: formData.business_unit,
        department_id: 'dept-eng',
        department_name: formData.department_name,
        location_id: 'loc-01',
        location_name: formData.location_name,
        hiring_manager_id: 'emp-02',
        hiring_manager_name: formData.hiring_manager_name,
        recruiter_id: 'emp-01',
        recruiter_name: formData.recruiter_name,
        job_title: formData.job_title,
        designation_id: 'desig-staffeng',
        designation_title: formData.designation_title,
        job_level: formData.job_level,
        employment_type: formData.employment_type,
        number_of_positions: Number(formData.number_of_positions),
        requisition_type: formData.requisition_type,
        replacement_employee_name: formData.replacement_employee_name,
        reason_for_hiring: formData.reason_for_hiring,
        priority: formData.priority,
        expected_joining_date: formData.expected_joining_date,
        budget: Number(formData.budget),
        min_salary: Number(formData.min_salary),
        max_salary: Number(formData.max_salary),
        currency: formData.currency,
        required_skills: formData.required_skills.split(',').map(s => s.trim()),
        preferred_skills: formData.preferred_skills.split(',').map(s => s.trim()),
        education: formData.education,
        job_description: formData.job_description,
        responsibilities: formData.responsibilities.split(';').map(s => s.trim()),
        qualifications: formData.qualifications.split(';').map(s => s.trim()),
        approval_workflow: [
          { role: 'Hiring Manager', approver_name: formData.hiring_manager_name, status: 'Approved' },
          { role: 'HR Head', approver_name: 'Arun Kumar', status: 'Pending' },
        ],
        created_by_name: 'Dharun Joy',
      });

      showToast(`Requisition ${created.id} submitted for approval`);
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error creating requisition');
    }
  };

  const handleApproveStep = (reqId: string, roleName: string) => {
    atsService.approveRequisitionStep(reqId, roleName, 'Arun Kumar');
    showToast(`Requisition ${reqId} approved by HR Head!`);
  };

  const filteredRequisitions = requisitions.filter(r => {
    const matchesSearch =
      r.job_title.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.department_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[#07563D]" /> Job Requisitions Engine
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Submit, approve, and convert internal hiring requests into active Job Openings
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Create Requisition
        </Button>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search Requisition ID, Title, Dept..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Submitted', label: 'Submitted' },
              { value: 'Pending Approval', label: 'Pending Approval' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Open', label: 'Open' },
              { value: 'Closed', label: 'Closed' },
            ]}
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Req ID</TableHead>
              <TableHead>Job Title & Dept</TableHead>
              <TableHead>Type & Priority</TableHead>
              <TableHead>Positions</TableHead>
              <TableHead>Budget Range</TableHead>
              <TableHead>Approval Workflow</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequisitions.map(req => (
              <TableRow key={req.id}>
                <TableCell className="font-mono text-xs font-bold text-gray-900">{req.id}</TableCell>
                <TableCell>
                  <div className="font-bold text-gray-900 text-sm">{req.job_title}</div>
                  <div className="text-xs text-gray-500">{req.department_name} • {req.location_name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{req.requisition_type}</div>
                  <Badge variant={req.priority === 'Urgent' ? 'rose' : req.priority === 'High' ? 'amber' : 'neutral'} size="sm">
                    {req.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-semibold text-gray-800">
                  {req.positions_filled} / {req.number_of_positions}
                </TableCell>
                <TableCell className="text-xs text-gray-700 font-medium">
                  ₹{(req.min_salary / 100000).toFixed(1)}L - ₹{(req.max_salary / 100000).toFixed(1)}L
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {(req.approval_workflow || []).map((step, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                        {step.status === 'Approved' ? (
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-500" />
                        )}
                        <span className="font-medium text-gray-700">{step.role}: {step.approver_name}</span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === 'Approved' || req.status === 'Open' ? 'emerald' : 'amber'} size="sm">
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedReq(req)}>
                    Details
                  </Button>
                  {(req.status === 'Approved' || req.status === 'Open') && onCreateJob && (
                    <Button size="sm" onClick={() => onCreateJob(req.id)}>
                      Create Job
                    </Button>
                  )}
                  {req.status === 'Pending Approval' && (
                    <Button size="sm" variant="secondary" onClick={() => handleApproveStep(req.id, 'HR Head')}>
                      Approve
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* CREATE REQUISITION MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Job Requisition" size="xl">
        <form onSubmit={handleCreateRequisition} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-gray-700">Job Title *</label>
              <Input
                value={formData.job_title}
                onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="e.g. Senior Frontend Architect"
                required
              />
            </div>
            <div>
              <label className="font-bold text-gray-700">Requisition Type</label>
              <Select
                value={formData.requisition_type}
                onChange={e => setFormData({ ...formData, requisition_type: e.target.value as RequisitionType })}
                options={[
                  { value: 'New Position', label: 'New Position' },
                  { value: 'Replacement', label: 'Replacement' },
                  { value: 'Expansion', label: 'Expansion' },
                  { value: 'Backfill', label: 'Backfill' },
                  { value: 'Campus Hiring', label: 'Campus Hiring' },
                  { value: 'Urgent Hiring', label: 'Urgent Hiring' },
                ]}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700">Department</label>
              <Input value={formData.department_name} onChange={e => setFormData({ ...formData, department_name: e.target.value })} />
            </div>
            <div>
              <label className="font-bold text-gray-700">Location</label>
              <Input value={formData.location_name} onChange={e => setFormData({ ...formData, location_name: e.target.value })} />
            </div>
            <div>
              <label className="font-bold text-gray-700">Number of Openings</label>
              <Input type="number" min={1} value={formData.number_of_positions} onChange={e => setFormData({ ...formData, number_of_positions: Number(e.target.value) })} />
            </div>
            <div>
              <label className="font-bold text-gray-700">Priority</label>
              <Select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as RequisitionPriority })}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Urgent', label: 'Urgent' },
                ]}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700">Min Salary (INR)</label>
              <Input type="number" value={formData.min_salary} onChange={e => setFormData({ ...formData, min_salary: Number(e.target.value) })} />
            </div>
            <div>
              <label className="font-bold text-gray-700">Max Salary (INR)</label>
              <Input type="number" value={formData.max_salary} onChange={e => setFormData({ ...formData, max_salary: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700">Required Skills (Comma separated)</label>
            <Input value={formData.required_skills} onChange={e => setFormData({ ...formData, required_skills: e.target.value })} />
          </div>

          <div>
            <label className="font-bold text-gray-700">Reason for Hiring</label>
            <Input value={formData.reason_for_hiring} onChange={e => setFormData({ ...formData, reason_for_hiring: e.target.value })} placeholder="Justification for budget approval..." />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Requisition</Button>
          </div>
        </form>
      </Modal>

      {/* REQUISITION DETAILS MODAL */}
      {selectedReq && (
        <Modal isOpen={Boolean(selectedReq)} onClose={() => setSelectedReq(null)} title={`Requisition Details: ${selectedReq.id}`} size="lg">
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
              <div>
                <span className="font-bold text-gray-500">Job Title:</span>
                <p className="text-sm font-extrabold text-gray-900">{selectedReq.job_title}</p>
              </div>
              <div>
                <span className="font-bold text-gray-500">Department:</span>
                <p className="text-sm font-semibold text-gray-800">{selectedReq.department_name}</p>
              </div>
              <div>
                <span className="font-bold text-gray-500">Hiring Manager:</span>
                <p className="text-sm font-semibold text-gray-800">{selectedReq.hiring_manager_name}</p>
              </div>
              <div>
                <span className="font-bold text-gray-500">Budget Range:</span>
                <p className="text-sm font-bold text-emerald-800">
                  ₹{(selectedReq.min_salary / 100000).toFixed(1)}L - ₹{(selectedReq.max_salary / 100000).toFixed(1)}L
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-gray-900">Required Skills:</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedReq.required_skills.map((s, idx) => (
                  <Badge key={idx} variant="emerald" size="sm">{s}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-gray-900">Reason for Hiring:</h4>
              <p className="text-gray-700 mt-1 bg-white p-3 rounded-xl border border-gray-200">{selectedReq.reason_for_hiring}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedReq(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
