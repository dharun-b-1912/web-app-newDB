// src/features/talent/recruitment/InterviewManager.tsx
// ============================================================================
// WorkForceOS — Interview Management & Panel Scorecards
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  Calendar,
  Plus,
  Search,
  Clock,
  Video,
  Star,
  CheckCircle2,
  User,
  ChevronRight,
  ExternalLink,
  Award,
} from 'lucide-react';
import { Interview, Candidate, JobOpening } from '../../../types/ats';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { InterviewScorecardModal } from './InterviewScorecardModal';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

export const InterviewManager: React.FC = () => {
  const { showToast } = useToast();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedInterviewForScorecard, setSelectedInterviewForScorecard] = useState<Interview | null>(null);

  // Form States
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [roundName, setRoundName] = useState('Technical Round 1');
  const [interviewType, setInterviewType] = useState<'Video' | 'Phone' | 'In-Person'>('Video');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('11:00 AM');
  const [interviewerName, setInterviewerName] = useState('Dharun Joy');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/joy-interview-room');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [iList, cList, jList] = await Promise.all([
        recruitmentService.getInterviews({ status: statusFilter }),
        recruitmentService.getCandidates(),
        recruitmentService.getJobs(),
      ]);
      setInterviews(iList);
      setCandidates(cList);
      setJobs(jList);
      if (cList.length > 0 && !selectedCandidateId) {
        setSelectedCandidateId(cList[0].id);
      }
    } catch (err) {
      console.error('[InterviewManager] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('recruitment.*', () => {
      loadData();
    });
    return () => unsub();
  }, []);

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    const cand = candidates.find(c => c.id === selectedCandidateId);
    if (!cand) return;

    try {
      await recruitmentService.scheduleInterview({
        candidate_id: cand.id,
        candidate_name: cand.display_name || `${cand.first_name} ${cand.last_name}`,
        candidate_email: cand.email,
        job_id: cand.applied_job_id || 'JOB-2026-101',
        job_title: cand.applied_job_title || 'Position',
        round_name: roundName,
        interview_type: interviewType,
        scheduled_date: scheduledDate,
        start_time: startTime,
        interviewer_name: interviewerName,
        meeting_link: meetingLink,
      });

      // Move candidate stage to 'Interview'
      await recruitmentService.updateCandidateStage(cand.id, 'Interview', `Scheduled ${roundName}`);

      showToast(`Interview scheduled for ${cand.display_name || cand.first_name}!`);
      setIsScheduleModalOpen(false);
      loadData();
    } catch {
      showToast('Error scheduling interview', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-2 text-xs rounded-xl border border-gray-200 bg-white font-bold text-gray-700"
          >
            <option value="ALL">All Statuses ({interviews.length})</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsScheduleModalOpen(true)}
          className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Schedule Interview
        </Button>
      </div>

      {/* Interviews Table */}
      <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-gray-400">Loading interview schedules...</div>
        ) : interviews.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-900">No Interviews Scheduled</h4>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Schedule technical or culture rounds and submit structured 5-point evaluation scorecards.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsScheduleModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Schedule First Interview
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-gray-700">Candidate & Role</TableHead>
                <TableHead className="font-bold text-gray-700">Round & Type</TableHead>
                <TableHead className="font-bold text-gray-700">Interviewer</TableHead>
                <TableHead className="font-bold text-gray-700">Date & Time</TableHead>
                <TableHead className="font-bold text-gray-700">Scorecard Recommendation</TableHead>
                <TableHead className="font-bold text-gray-700">Status</TableHead>
                <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.map(i => (
                <TableRow key={i.id} className="hover:bg-emerald-50/40 transition-colors">
                  <TableCell>
                    <div className="font-bold text-gray-900 text-xs">{i.candidate_name}</div>
                    <div className="text-[11px] text-gray-400">{i.job_title}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-800">{i.round_name}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Video className="w-3 h-3 text-gray-400" /> {i.interview_type}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-800 font-medium">
                    {i.interviewer_name || 'Technical Lead'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-700">
                    {i.scheduled_date || i.date} • {i.start_time || i.time}
                  </TableCell>
                  <TableCell>
                    {i.overall_recommendation ? (
                      <Badge variant={i.overall_recommendation === 'Strong Hire' || i.overall_recommendation === 'Hire' ? 'emerald' : 'amber'} className="text-[10px]">
                        {i.overall_recommendation}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Pending feedback</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={i.status === 'Completed' ? 'emerald' : 'blue'} className="text-[10px]">
                      {i.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInterviewForScorecard(i)}
                      className="text-xs font-bold text-[#07563D] border-emerald-300 rounded-xl gap-1"
                    >
                      <Star className="w-3.5 h-3.5 fill-[#07563D]" />
                      {i.status === 'Completed' ? 'View Scorecard' : 'Submit Scorecard'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal: Schedule Interview */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Schedule Candidate Interview"
        description="Select candidate, assign interviewer panel, specify round type and meeting link"
      >
        <form onSubmit={handleScheduleInterview} className="p-6 space-y-4 max-h-[80vh] overflow-auto">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Select Candidate *</label>
            <select
              value={selectedCandidateId}
              onChange={e => setSelectedCandidateId(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
            >
              {candidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.display_name || `${c.first_name} ${c.last_name}`} — {c.applied_job_title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Round Name</label>
              <input
                type="text"
                value={roundName}
                onChange={e => setRoundName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Interview Type</label>
              <select
                value={interviewType}
                onChange={e => setInterviewType(e.target.value as any)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
              >
                <option value="Video">Video Call</option>
                <option value="Phone">Phone Discussion</option>
                <option value="In-Person">In-Person Campus</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Time *</label>
              <input
                type="text"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Interviewer Name</label>
            <input
              type="text"
              value={interviewerName}
              onChange={e => setInterviewerName(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Meeting Link</label>
            <input
              type="text"
              value={meetingLink}
              onChange={e => setMeetingLink(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Confirm & Send Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Evaluation Scorecard */}
      <InterviewScorecardModal
        interview={selectedInterviewForScorecard}
        isOpen={!!selectedInterviewForScorecard}
        onClose={() => setSelectedInterviewForScorecard(null)}
        onSubmitted={() => {
          loadData();
          setSelectedInterviewForScorecard(null);
        }}
      />
    </div>
  );
};
