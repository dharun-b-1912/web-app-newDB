import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Briefcase, Plus, Search, Edit3, Eye, FileText, CheckCircle2, Building2, MapPin, Sparkles } from 'lucide-react';
import { atsService } from '../../../services/atsService';
import { JobOpening, WorkMode } from '../../../types/ats';
import { useToast } from '../../../components/ui/Toast';

export const JobManager: React.FC<{ onPublishJob?: (jobId: string) => void }> = ({ onPublishJob }) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('ALL');
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const jobs = atsService.getJobs();
  const reqs = atsService.getRequisitions().filter(r => r.status === 'Approved' || r.status === 'Open');

  const [selectedReqId, setSelectedReqId] = useState(reqs[0]?.id || '');

  const handleCreateJob = () => {
    if (!selectedReqId) {
      showToast('Please select an approved requisition.');
      return;
    }
    try {
      const created = atsService.createJobFromRequisition(selectedReqId);
      showToast(`Job Opening ${created.id} created successfully!`);
      setIsCreateOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error creating job');
    }
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch =
      j.job_title.toLowerCase().includes(search.toLowerCase()) ||
      j.id.toLowerCase().includes(search.toLowerCase()) ||
      j.requisition_id.toLowerCase().includes(search.toLowerCase());
    const matchesMode = workModeFilter === 'ALL' || j.work_mode === workModeFilter;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#07563D]" /> Job Openings & Description Builder
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure structured job profiles, work modes, and multi-channel publishing channels
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          New Job Opening
        </Button>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search Job ID, Title, Req ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={workModeFilter}
            onChange={e => setWorkModeFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Work Modes' },
              { value: 'Office', label: 'Office' },
              { value: 'Hybrid', label: 'Hybrid' },
              { value: 'Remote', label: 'Remote' },
              { value: 'Field', label: 'Field' },
              { value: 'Flexible', label: 'Flexible' },
            ]}
          />
        </div>
      </Card>

      {/* Jobs Grid / Table */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID & Req ID</TableHead>
              <TableHead>Job Title & Designation</TableHead>
              <TableHead>Work Mode & Type</TableHead>
              <TableHead>Openings</TableHead>
              <TableHead>Salary Range</TableHead>
              <TableHead>Publishing Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.map(job => {
              const activePubs = job.publications.filter(p => p.status === 'Published').length;
              return (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="font-mono text-xs font-bold text-gray-900">{job.id}</div>
                    <div className="text-[11px] text-gray-500">Req: {job.requisition_id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-gray-900 text-sm">{job.job_title}</div>
                    <div className="text-xs text-gray-500">{job.hiring_manager_name} (Hiring Manager)</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={job.work_mode === 'Remote' ? 'purple' : job.work_mode === 'Hybrid' ? 'emerald' : 'neutral'} size="sm">
                        {job.work_mode}
                      </Badge>
                      <span className="text-xs text-gray-600 font-medium">{job.employment_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-gray-900">
                    {job.positions_filled} / {job.number_of_openings} Filled
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-emerald-800">
                    ₹{(job.min_salary / 100000).toFixed(1)}L - ₹{(job.max_salary / 100000).toFixed(1)}L
                  </TableCell>
                  <TableCell>
                    <Badge variant={activePubs > 0 ? 'emerald' : 'amber'} size="sm">
                      {activePubs} Channels Published
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedJob(job)}>
                      Inspect JD
                    </Button>
                    {onPublishJob && (
                      <Button size="sm" onClick={() => onPublishJob(job.id)}>
                        Publish
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* CREATE JOB FROM APPROVED REQUISITION MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Job Opening from Approved Requisition" size="md">
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Select Approved Requisition *</label>
            <Select
              value={selectedReqId}
              onChange={e => setSelectedReqId(e.target.value)}
              options={reqs.map(r => ({
                value: r.id,
                label: `${r.id} - ${r.job_title} (${r.department_name})`,
              }))}
            />
          </div>
          <p className="text-gray-500">
            This will map requisition fields directly into a new Job Opening and generate structured description sections for publishing.
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateJob}>Generate Job Opening</Button>
          </div>
        </div>
      </Modal>

      {/* STRUCTURED JOB DESCRIPTION BUILDER INSPECTOR MODAL */}
      {selectedJob && (
        <Modal isOpen={Boolean(selectedJob)} onClose={() => setSelectedJob(null)} title={`Job Profile Builder: ${selectedJob.job_title}`} size="xl">
          <div className="space-y-6 text-xs max-h-[70vh] overflow-y-auto pr-2">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-[#07563D]">
              <div>
                <span className="font-bold uppercase text-[10px]">Job ID:</span>
                <p className="font-black text-sm">{selectedJob.id}</p>
              </div>
              <div>
                <span className="font-bold uppercase text-[10px]">Work Mode:</span>
                <p className="font-bold text-sm">{selectedJob.work_mode}</p>
              </div>
              <div>
                <span className="font-bold uppercase text-[10px]">Employment Type:</span>
                <p className="font-bold text-sm">{selectedJob.employment_type}</p>
              </div>
              <div>
                <span className="font-bold uppercase text-[10px]">Experience Level:</span>
                <p className="font-bold text-sm">{selectedJob.experience_years}</p>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h4 className="font-extrabold text-gray-900 text-sm mb-1">1. Job Summary</h4>
                <p className="text-gray-700 leading-relaxed">{selectedJob.summary}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h4 className="font-extrabold text-gray-900 text-sm mb-1">2. Key Responsibilities</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {(selectedJob.responsibilities || []).map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h4 className="font-extrabold text-gray-900 text-sm mb-1">3. Required Skills & Requirements</h4>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(selectedJob.required_skills || []).map((s, idx) => (
                    <Badge key={idx} variant="emerald" size="sm">{s}</Badge>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h4 className="font-extrabold text-gray-900 text-sm mb-1">4. Benefits & Perks</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {(selectedJob.benefits || []).map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedJob(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
