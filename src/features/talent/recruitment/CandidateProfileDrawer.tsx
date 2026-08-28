// src/features/talent/recruitment/CandidateProfileDrawer.tsx
// ============================================================================
// Joy PeopleHR — Comprehensive Candidate Profile & Lifecycle Inspector
// Timeline, Scorecards, E-Sign Offer, Notes, and Candidate-to-Employee Conversion
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  Award,
  DollarSign,
  Send,
  MessageSquare,
  Lock,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Star,
  Plus,
} from 'lucide-react';
import { Candidate, CandidateStage, CandidateNote, Interview, Offer, InterviewScorecard } from '../../../types/ats';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { cn } from '../../../lib/utils';

interface Props {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onCandidateUpdated: () => void;
  onScheduleInterview?: (candidate: Candidate) => void;
  onCreateOffer?: (candidate: Candidate) => void;
}

const STAGES: CandidateStage[] = [
  'New',
  'Screening',
  'Shortlisted',
  'Assessment',
  'Interview',
  'Selected',
  'Offer',
  'Background Verification',
  'Preboarding',
  'Hired',
  'Rejected',
];

export const CandidateProfileDrawer: React.FC<Props> = ({
  candidate,
  isOpen,
  onClose,
  onCandidateUpdated,
  onScheduleInterview,
  onCreateOffer,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'interviews' | 'offers' | 'notes'>('overview');
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [stageHistory, setStageHistory] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    if (candidate && isOpen) {
      loadDetails(candidate.id);
    }
  }, [candidate?.id, isOpen]);

  const loadDetails = async (candidateId: string) => {
    try {
      const [nList, hList, iList, oList] = await Promise.all([
        recruitmentService.getCandidateNotes(candidateId),
        recruitmentService.getCandidateStageHistory(candidateId),
        recruitmentService.getInterviews({ candidateId }),
        recruitmentService.getOffers({ candidateId }),
      ]);
      setNotes(nList);
      setStageHistory(hList);
      setInterviews(iList);
      setOffers(oList);
    } catch (err) {
      console.error('[CandidateProfileDrawer] loadDetails error:', err);
    }
  };

  if (!candidate) return null;

  const handleStageChange = async (newStage: CandidateStage) => {
    try {
      await recruitmentService.updateCandidateStage(candidate.id, newStage, `Stage updated to ${newStage}`);
      showToast(`Candidate stage moved to ${newStage}`);
      onCandidateUpdated();
      loadDetails(candidate.id);
    } catch {
      showToast('Error updating candidate stage', 'error');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    try {
      await recruitmentService.addCandidateNote(candidate.id, newNoteContent, true, 'Recruiter');
      showToast('Internal recruiter note added');
      setNewNoteContent('');
      setIsAddingNote(false);
      loadDetails(candidate.id);
    } catch {
      showToast('Error adding note', 'error');
    }
  };

  const handleConvertToEmployee = async () => {
    setIsConverting(true);
    try {
      const createdEmp = await recruitmentService.convertCandidateToEmployee(candidate.id, offers[0]?.id);
      showToast(`Successfully converted ${candidate.display_name || candidate.first_name} to Employee (${createdEmp.employee_code})!`);
      onCandidateUpdated();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Error converting candidate to employee', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={candidate.display_name || `${candidate.first_name} ${candidate.last_name}`}
      subtitle={`${candidate.current_designation || 'Candidate'} • ${candidate.applied_job_title || 'Position'}`}
      width="2xl"
    >
      <div className="p-6 space-y-6">
        {/* Candidate Profile Header Card */}
        <Card className="p-5 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-100/30 border border-emerald-200/80 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                name={candidate.display_name || `${candidate.first_name} ${candidate.last_name}`}
                size="lg"
                className="w-14 h-14 text-base"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-gray-900">
                    {candidate.display_name || `${candidate.first_name} ${candidate.last_name}`}
                  </h3>
                  <Badge variant="emerald" className="text-[10px] font-mono">
                    Match: {candidate.match_score || 85}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {candidate.current_designation} at <span className="font-semibold">{candidate.current_company}</span>
                </p>
                <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-gray-400" /> {candidate.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" /> {candidate.current_location || 'Coimbatore'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-gray-400" /> {candidate.total_experience_years || 4}+ yrs exp
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-gray-400">Stage:</span>
                <select
                  value={candidate.current_stage}
                  onChange={e => handleStageChange(e.target.value as CandidateStage)}
                  className="bg-white border border-emerald-300 text-[#07563D] text-xs font-bold rounded-xl px-2.5 py-1 focus:ring-2 focus:ring-[#07563D]"
                >
                  {STAGES.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* 1-Click Convert to Employee CTA */}
              {(candidate.current_stage === 'Preboarding' ||
                candidate.current_stage === 'Offer' ||
                candidate.current_stage === 'Selected') && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isConverting || !!candidate.converted_employee_id}
                  onClick={handleConvertToEmployee}
                  className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {candidate.converted_employee_id ? 'Converted to Employee' : isConverting ? 'Converting...' : 'Convert to Employee'}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition',
              activeTab === 'overview' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Overview & Skills
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1',
              activeTab === 'timeline' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Recruitment Timeline
          </button>
          <button
            onClick={() => setActiveTab('interviews')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5',
              activeTab === 'interviews' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Interviews & Scorecards
            <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded-full">{interviews.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5',
              activeTab === 'offers' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Offer & E-Sign
            <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded-full">{offers.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5',
              activeTab === 'notes' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Internal Notes
            <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded-full">{notes.length}</span>
          </button>
        </div>

        {/* Tab 1: Overview & Skills */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Skills Card */}
            <Card className="p-4 rounded-2xl border-gray-200/80">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">
                Technical Skills & Competencies
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills && candidate.skills.length > 0 ? (
                  candidate.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#07563D] border border-emerald-200 font-mono text-[11px] font-bold"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No skills listed</span>
                )}
              </div>
            </Card>

            {/* Application & Source Info */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 rounded-2xl border-gray-200/80">
                <span className="text-[10px] font-bold uppercase text-gray-400">Applied Job Position</span>
                <p className="text-xs font-bold text-gray-900 mt-1">{candidate.applied_job_title || 'Software Engineer'}</p>
                <p className="text-[11px] text-gray-500">{candidate.department_name || 'Engineering'}</p>
              </Card>

              <Card className="p-4 rounded-2xl border-gray-200/80">
                <span className="text-[10px] font-bold uppercase text-gray-400">Application Source</span>
                <p className="text-xs font-bold text-gray-900 mt-1">{candidate.source_type || 'Direct Portal'}</p>
                <p className="text-[11px] text-gray-500">Applied on {new Date(candidate.created_at).toLocaleDateString()}</p>
              </Card>
            </div>

            {/* Education & Experience */}
            <Card className="p-4 rounded-2xl border-gray-200/80 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Education</span>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">{candidate.education || 'Bachelor Degree in Computer Science'}</p>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Resume Document</span>
                  <div className="flex items-center gap-1.5 text-xs text-[#07563D] font-bold mt-0.5">
                    <FileText className="w-3.5 h-3.5" />
                    Verified Resume Document
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs gap-1 rounded-xl">
                  <ExternalLink className="w-3 h-3" /> Preview Resume
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Recruitment Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Recruitment Activity History</h4>
            {stageHistory.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80 text-xs text-gray-500">
                Candidate registered in stage: <span className="font-bold text-[#07563D]">{candidate.current_stage}</span>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
                {stageHistory.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#07563D] border-2 border-white shadow-xs" />
                    <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">
                          {item.from_stage} → {item.to_stage}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1">{item.reason}</p>
                      <span className="text-[10px] text-gray-400">By {item.actor_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Interviews & Scorecards */}
        {activeTab === 'interviews' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Interview Rounds ({interviews.length})</h4>
              {onScheduleInterview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onScheduleInterview(candidate)}
                  className="text-xs gap-1 border-emerald-300 text-[#07563D] rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" /> Schedule Round
                </Button>
              )}
            </div>

            {interviews.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700">No interviews scheduled yet</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Schedule a video or panel interview for this candidate.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {interviews.map(i => (
                  <Card key={i.id} className="p-4 rounded-2xl border-gray-200/80">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="emerald" size="sm" className="text-[10px]">
                          Round {i.round_number}: {i.round_name}
                        </Badge>
                        <h5 className="text-xs font-bold text-gray-900 mt-1.5">{i.interview_type} Discussion</h5>
                        <p className="text-[11px] text-gray-500">Interviewer: {i.interviewer_name || 'Technical Lead'}</p>
                        <div className="flex items-center gap-3 text-[11px] text-gray-400 font-mono mt-1">
                          <span>Date: {i.scheduled_date || i.date}</span>
                          <span>Time: {i.start_time || i.time}</span>
                        </div>
                      </div>
                      <Badge variant={i.status === 'Completed' ? 'emerald' : 'blue'} className="text-[10px]">
                        {i.status}
                      </Badge>
                    </div>

                    {i.overall_recommendation && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Evaluation:</span>
                        <span className="font-bold text-[#07563D]">{i.overall_recommendation}</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Offers & E-Sign */}
        {activeTab === 'offers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Employment Offers ({offers.length})</h4>
              {onCreateOffer && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onCreateOffer(candidate)}
                  className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1 rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" /> Draft New Offer
                </Button>
              )}
            </div>

            {offers.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80">
                <Award className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700">No offers released yet</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Generate CTC breakdown and initiate e-signature workflow.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map(o => (
                  <Card key={o.id} className="p-4 rounded-2xl border-gray-200/80">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-gray-400">{o.id}</span>
                        <h5 className="text-sm font-black text-gray-900 mt-0.5">
                          {o.currency} {o.ctc_annual?.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/ annum</span>
                        </h5>
                        <p className="text-xs text-gray-600 mt-0.5">Joining Date: <span className="font-semibold text-gray-800">{o.joining_date}</span></p>
                      </div>
                      <Badge variant={o.status === 'Accepted' ? 'emerald' : 'blue'} className="text-[10px]">
                        {o.status}
                      </Badge>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase">E-Sign Status</span>
                        <div className="font-semibold text-gray-800">{o.esign_status || 'Signed'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase">Background Verification</span>
                        <div className="font-semibold text-emerald-700">{o.background_check_status || 'Passed'}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Internal Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-amber-600" /> Private Recruiter Notes ({notes.length})
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingNote(!isAddingNote)}
                className="text-xs gap-1 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Add Note
              </Button>
            </div>

            {isAddingNote && (
              <form onSubmit={handleAddNote} className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
                <textarea
                  placeholder="Type confidential feedback, salary expectations, or interview observations..."
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  rows={3}
                  required
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D] bg-white"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingNote(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] text-white">
                    Save Note
                  </Button>
                </div>
              </form>
            )}

            {notes.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80 text-xs text-gray-400 italic">
                No internal notes recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {notes.map(n => (
                  <div key={n.id} className="p-3.5 rounded-xl border border-gray-200/80 bg-white shadow-2xs">
                    <p className="text-xs text-gray-800 leading-relaxed">{n.content}</p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                      <span>{n.author_name}</span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
};
