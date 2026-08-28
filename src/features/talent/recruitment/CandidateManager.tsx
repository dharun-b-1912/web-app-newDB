// src/features/talent/recruitment/CandidateManager.tsx
// ============================================================================
// Joy PeopleHR — Candidate Master & Kanban Pipeline Management
// Table View, Kanban Stage Pipeline, Profile Drawer & 1-Click Employee Conversion
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Avatar } from '../../../components/ui/Avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  Users,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Calendar,
  Award,
  ChevronRight,
  MoreVertical,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { Candidate, CandidateStage, JobOpening } from '../../../types/ats';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { CandidateProfileDrawer } from './CandidateProfileDrawer';
import { InterviewScorecardModal } from './InterviewScorecardModal';
import { OfferCreateWorkspace } from './OfferCreateWorkspace';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

const KANBAN_STAGES: { id: CandidateStage; label: string }[] = [
  { id: 'New', label: 'Applied' },
  { id: 'Screening', label: 'Screening' },
  { id: 'Shortlisted', label: 'Shortlisted' },
  { id: 'Assessment', label: 'Assessment' },
  { id: 'Interview', label: 'Interview' },
  { id: 'Selected', label: 'Selected' },
  { id: 'Offer', label: 'Offer' },
  { id: 'Preboarding', label: 'Preboarding' },
  { id: 'Hired', label: 'Hired' },
];

export const CandidateManager: React.FC<{ initialStageFilter?: string }> = ({ initialStageFilter }) => {
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState(initialStageFilter || 'ALL');
  const [jobFilter, setJobFilter] = useState('ALL');

  // Selected Candidate for Profile Drawer
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Quick Add Candidate Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentDesignation, setCurrentDesignation] = useState('');
  const [skillsText, setSkillsText] = useState('React, TypeScript, Node.js');
  const [appliedJobId, setAppliedJobId] = useState('');

  // Modals for Offer / Schedule
  const [candidateForOffer, setCandidateForOffer] = useState<Candidate | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [candList, jobList] = await Promise.all([
        recruitmentService.getCandidates({ stage: stageFilter, jobId: jobFilter, search }),
        recruitmentService.getJobs(),
      ]);
      setCandidates(candList);
      setJobs(jobList);
      if (jobList.length > 0 && !appliedJobId) {
        setAppliedJobId(jobList[0].id);
      }
    } catch (err) {
      console.error('[CandidateManager] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialStageFilter) {
      setStageFilter(initialStageFilter);
    }
  }, [initialStageFilter]);

  useEffect(() => {
    loadData();
  }, [stageFilter, jobFilter, search]);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('recruitment.*', () => {
      loadData();
    });
    return () => unsub();
  }, []);

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email) return;

    const matchedJob = jobs.find(j => j.id === appliedJobId);
    const skillsArray = skillsText.split(',').map(s => s.trim()).filter(Boolean);

    try {
      await recruitmentService.createCandidate({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        current_company: currentCompany,
        current_designation: currentDesignation,
        skills: skillsArray,
        applied_job_id: appliedJobId,
        applied_job_title: matchedJob?.job_title || 'Software Engineer',
        department_name: matchedJob?.department_name || 'Engineering',
        current_stage: 'New',
      });

      showToast(`Candidate ${firstName} ${lastName} registered in pipeline!`);
      setIsAddModalOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCurrentCompany('');
      setCurrentDesignation('');
      loadData();
    } catch {
      showToast('Error registering candidate', 'error');
    }
  };

  const handleStageMove = async (candidateId: string, newStage: CandidateStage) => {
    try {
      await recruitmentService.updateCandidateStage(candidateId, newStage, `Moved to ${newStage}`);
      showToast(`Moved to ${newStage}`);
      loadData();
    } catch {
      showToast('Error updating stage', 'error');
    }
  };

  const openCandidateProfile = (cand: Candidate) => {
    setSelectedCandidate(cand);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Filter Bar & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate by name, email, skill..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D] w-64"
            />
          </div>

          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="p-2 text-xs rounded-xl border border-gray-200 bg-white font-bold text-gray-700"
          >
            <option value="ALL">All Stages ({candidates.length})</option>
            {KANBAN_STAGES.map(s => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={jobFilter}
            onChange={e => setJobFilter(e.target.value)}
            className="p-2 text-xs rounded-xl border border-gray-200 bg-white font-bold text-gray-700 max-w-xs truncate"
          >
            <option value="ALL">All Job Openings</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>
                {j.job_title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1',
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <List className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1',
                viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Pipeline Kanban
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Add Candidate
          </Button>
        </div>
      </div>

      {/* 2. Main View Mode (Table or Kanban) */}
      {viewMode === 'table' ? (
        <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs font-bold text-gray-400">Loading candidate records...</div>
          ) : candidates.length === 0 ? (
            <div className="p-12 text-center max-w-sm mx-auto">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-900">No Candidates Found</h4>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Add candidates to your talent pipeline or publish job openings to start receiving applications.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
              >
                <Plus className="w-4 h-4" /> Add First Candidate
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-gray-700">Candidate</TableHead>
                  <TableHead className="font-bold text-gray-700">Applied Role</TableHead>
                  <TableHead className="font-bold text-gray-700">Experience</TableHead>
                  <TableHead className="font-bold text-gray-700">Skills</TableHead>
                  <TableHead className="font-bold text-gray-700 text-center">Match Score</TableHead>
                  <TableHead className="font-bold text-gray-700">Stage</TableHead>
                  <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map(cand => (
                  <TableRow
                    key={cand.id}
                    onClick={() => openCandidateProfile(cand)}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={cand.display_name || `${cand.first_name} ${cand.last_name}`}
                          size="sm"
                          className="w-8 h-8 text-xs font-bold"
                        />
                        <div>
                          <div className="font-bold text-gray-900 text-xs">
                            {cand.display_name || `${cand.first_name} ${cand.last_name}`}
                          </div>
                          <div className="text-[11px] text-gray-400">{cand.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-gray-800">{cand.applied_job_title}</div>
                      <div className="text-[11px] text-gray-400">{cand.department_name}</div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 font-mono">
                      {cand.total_experience_years || 4.5} yrs
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap max-w-xs">
                        {(cand.skills || []).slice(0, 3).map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-[10px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="emerald" size="sm" className="text-[10px] font-mono">
                        {cand.match_score || 85}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cand.current_stage === 'Hired'
                            ? 'emerald'
                            : cand.current_stage === 'Offer'
                            ? 'emerald'
                            : cand.current_stage === 'Interview'
                            ? 'purple'
                            : 'blue'
                        }
                        className="text-[10px]"
                      >
                        {cand.current_stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          openCandidateProfile(cand);
                        }}
                        className="text-xs text-[#07563D] hover:bg-emerald-50 font-bold gap-1"
                      >
                        Inspect <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : (
        /* Kanban Pipeline View */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1400px]">
            {KANBAN_STAGES.map(stage => {
              const stageCandidates = candidates.filter(c => c.current_stage === stage.id);
              return (
                <div
                  key={stage.id}
                  className="w-72 shrink-0 bg-gray-50/70 p-3.5 rounded-3xl border border-gray-200/80 flex flex-col max-h-[75vh]"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider">{stage.label}</span>
                    <span className="text-xs font-mono font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                      {stageCandidates.length}
                    </span>
                  </div>

                  <div className="space-y-3 mt-3 overflow-y-auto pr-1 flex-1">
                    {stageCandidates.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400 italic">No candidates in {stage.label}</div>
                    ) : (
                      stageCandidates.map(cand => (
                        <Card
                          key={cand.id}
                          onClick={() => openCandidateProfile(cand)}
                          className="p-3.5 rounded-2xl border-gray-200/80 hover:border-emerald-400 transition cursor-pointer shadow-2xs bg-white space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-black text-gray-900">
                              {cand.display_name || `${cand.first_name} ${cand.last_name}`}
                            </h5>
                            <span className="text-[10px] font-mono text-[#07563D] font-bold">
                              {cand.match_score || 85}%
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-600 truncate">{cand.applied_job_title}</p>

                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            {(cand.skills || []).slice(0, 2).map((s, idx) => (
                              <span key={idx} className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-mono">
                                {s}
                              </span>
                            ))}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Candidate Profile Inspector Drawer */}
      <CandidateProfileDrawer
        candidate={selectedCandidate}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCandidateUpdated={() => {
          loadData();
          if (selectedCandidate) {
            recruitmentService.getCandidates().then(all => {
              setSelectedCandidate(all.find(c => c.id === selectedCandidate.id) || null);
            });
          }
        }}
        onCreateOffer={cand => {
          setCandidateForOffer(cand);
          setIsOfferModalOpen(true);
        }}
      />

      {/* Offer Create Workspace */}
      <OfferCreateWorkspace
        candidate={candidateForOffer}
        isOpen={isOfferModalOpen}
        onClose={() => {
          setIsOfferModalOpen(false);
          setCandidateForOffer(null);
        }}
        onOfferCreated={() => {
          loadData();
          if (selectedCandidate) {
            recruitmentService.getCandidates().then(all => {
              setSelectedCandidate(all.find(c => c.id === selectedCandidate.id) || null);
            });
          }
        }}
      />

      {/* Modal: Quick Add Candidate */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Candidate to Pipeline"
        description="Register a candidate profile, assign target role, and enter initial competencies"
      >
        <form onSubmit={handleCreateCandidate} className="p-6 space-y-4 max-h-[80vh] overflow-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Applying For Job Opening *</label>
            <select
              value={appliedJobId}
              onChange={e => setAppliedJobId(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
            >
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.job_title} ({j.department_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Current Company</label>
              <input
                type="text"
                placeholder="e.g. Infotech Systems"
                value={currentCompany}
                onChange={e => setCurrentCompany(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Current Title</label>
              <input
                type="text"
                placeholder="e.g. Senior Frontend Dev"
                value={currentDesignation}
                onChange={e => setCurrentDesignation(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Skills (Comma-separated)</label>
            <input
              type="text"
              value={skillsText}
              onChange={e => setSkillsText(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Save & Ingest Candidate
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
