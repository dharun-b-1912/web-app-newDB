// src/features/talent/recruitment/JobManager.tsx
// ============================================================================
// Joy PeopleHR — Job Openings Master & Multi-Channel Publishing Hub
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  Briefcase,
  Plus,
  Search,
  Share2,
  ExternalLink,
  Globe,
  MapPin,
  Clock,
  Layers,
  CheckCircle2,
  Eye,
  Building2,
  Copy,
} from 'lucide-react';
import { JobOpening, WorkMode, PublishingDestination } from '../../../types/ats';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

export const JobManager: React.FC = () => {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJobForPublish, setSelectedJobForPublish] = useState<JobOpening | null>(null);

  // Form States
  const [jobTitle, setJobTitle] = useState('');
  const [departmentName, setDepartmentName] = useState('Engineering');
  const [locationName, setLocationName] = useState('Coimbatore HQ Campus');
  const [workMode, setWorkMode] = useState<WorkMode>('Hybrid');
  const [numberOfOpenings, setNumberOfOpenings] = useState(1);
  const [minSalary, setMinSalary] = useState(1400000);
  const [maxSalary, setMaxSalary] = useState(2200000);
  const [jobDescription, setJobDescription] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await recruitmentService.getJobs({ status: statusFilter, search });
      setJobs(list);
    } catch (err) {
      console.error('[JobManager] load error:', err);
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

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle) return;

    try {
      await recruitmentService.createJob({
        job_title: jobTitle,
        department_name: departmentName,
        location_name: locationName,
        work_mode: workMode,
        number_of_openings: numberOfOpenings,
        min_salary: minSalary,
        max_salary: maxSalary,
        job_description: jobDescription,
      });
      showToast(`Job Opening ${jobTitle} published!`);
      setIsCreateModalOpen(false);
      setJobTitle('');
      setJobDescription('');
      loadData();
    } catch {
      showToast('Error creating job opening', 'error');
    }
  };

  const handleToggleChannel = async (jobId: string, destination: string, currentStatus: string) => {
    const nextPublish = currentStatus !== 'Published';
    try {
      await recruitmentService.toggleJobPublication(jobId, destination, nextPublish);
      showToast(`${destination} ${nextPublish ? 'published' : 'unpublished'} successfully!`);
      loadData();
      if (selectedJobForPublish) {
        const updated = await recruitmentService.getJobs();
        setSelectedJobForPublish(updated.find(j => j.id === jobId) || null);
      }
    } catch {
      showToast('Error updating channel publication', 'error');
    }
  };

  const handleCopyPublicLink = (job: JobOpening) => {
    const url = `https://careers.joycorporate.com/jobs/${job.id}`;
    navigator.clipboard.writeText(url);
    showToast('Public candidate application link copied to clipboard!');
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
              placeholder="Search jobs by title or code..."
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
            <option value="Open">Open Only</option>
            <option value="Draft">Drafts</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Create Job Opening
        </Button>
      </div>

      {/* Jobs Data Table */}
      <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-gray-400">Loading job openings...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-900">No Job Openings Active</h4>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Publish positions to your career portal and external job boards to start sourcing talent.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Create First Job
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-gray-700">Job Title & Code</TableHead>
                <TableHead className="font-bold text-gray-700">Department</TableHead>
                <TableHead className="font-bold text-gray-700">Work Mode</TableHead>
                <TableHead className="font-bold text-gray-700 text-center">Openings</TableHead>
                <TableHead className="font-bold text-gray-700">Salary Range (INR)</TableHead>
                <TableHead className="font-bold text-gray-700">Published Channels</TableHead>
                <TableHead className="font-bold text-gray-700">Status</TableHead>
                <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map(job => {
                const publishedChannels = (job.publications || []).filter(p => p.status === 'Published');
                return (
                  <TableRow key={job.id} className="hover:bg-emerald-50/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-gray-400">{job.job_code || job.id}</span>
                        <Badge variant="emerald" size="sm" className="text-[9px]">
                          {job.employment_type}
                        </Badge>
                      </div>
                      <div className="font-bold text-gray-900 text-xs mt-0.5">{job.job_title}</div>
                      <div className="text-[11px] text-gray-400">{job.location_name}</div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-800 font-medium">
                      {job.department_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="gray" size="sm" className="text-[9px]">
                        {job.work_mode || 'Hybrid'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs text-gray-900">
                      {job.number_of_openings}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-gray-800">
                      {(job.min_salary || 0) / 100000}L - {(job.max_salary || 0) / 100000}L
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[#07563D]">{publishedChannels.length}</span>
                        <span className="text-[10px] text-gray-400">Channels</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={job.status === 'Open' ? 'emerald' : 'gray'} className="text-[10px]">
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyPublicLink(job)}
                          className="text-xs text-gray-500 hover:text-gray-900 gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedJobForPublish(job)}
                          className="text-xs font-bold text-[#07563D] border-emerald-300 rounded-xl gap-1"
                        >
                          <Share2 className="w-3 h-3" />
                          Publish
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal: Create Job Opening */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Job Opening"
        description="Publish an approved headcount position to career channels and candidate sourcing pipelines"
      >
        <form onSubmit={handleCreateJob} className="p-6 space-y-4 max-h-[80vh] overflow-auto">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Job Title *</label>
            <input
              type="text"
              placeholder="e.g. Senior Backend Architect"
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
              <label className="block text-xs font-bold text-gray-700 mb-1">Work Mode</label>
              <select
                value={workMode}
                onChange={e => setWorkMode(e.target.value as WorkMode)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
              >
                <option value="Office">Office</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Openings</label>
              <input
                type="number"
                min="1"
                value={numberOfOpenings}
                onChange={e => setNumberOfOpenings(Number(e.target.value))}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Min CTC (INR)</label>
              <input
                type="number"
                step="50000"
                value={minSalary}
                onChange={e => setMinSalary(Number(e.target.value))}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Max CTC (INR)</label>
              <input
                type="number"
                step="50000"
                value={maxSalary}
                onChange={e => setMaxSalary(Number(e.target.value))}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Job Description & Requirements</label>
            <textarea
              placeholder="Detail the role responsibilities, required qualifications, and technology stack..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              rows={3}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Publish Job Opening
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Multi-Channel Publishing */}
      {selectedJobForPublish && (
        <Modal
          isOpen={!!selectedJobForPublish}
          onClose={() => setSelectedJobForPublish(null)}
          title={`Publish Channels: ${selectedJobForPublish.job_title}`}
          description="Manage automated job distribution across company career portal and job boards"
        >
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {(selectedJobForPublish.publications || [
                { destination: 'Career Portal', status: 'Published' },
                { destination: 'LinkedIn', status: 'Not Published' },
                { destination: 'Indeed', status: 'Not Published' },
                { destination: 'Naukri', status: 'Not Published' },
              ]).map((pub, idx) => {
                const isPub = pub.status === 'Published';
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-200/80 bg-white shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-xs">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">{pub.destination}</h5>
                        <p className="text-[10px] text-gray-400">
                          {isPub ? `Live on ${pub.destination}` : 'Ready for automated sync'}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={isPub ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleChannel(selectedJobForPublish.id, pub.destination, pub.status)}
                      className={cn(
                        'text-xs rounded-xl',
                        isPub ? 'text-gray-600 border-gray-200' : 'bg-[#07563D] text-white'
                      )}
                    >
                      {isPub ? 'Unpublish' : 'Publish'}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedJobForPublish(null)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
