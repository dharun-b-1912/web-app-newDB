import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Calendar, Plus, Clock, Users, Award, AlertTriangle, CheckCircle2, MessageSquare, Star } from 'lucide-react';
import { atsService } from '../../../services/atsService';
import { Interview, InterviewRoundType } from '../../../types/ats';
import { useToast } from '../../../components/ui/Toast';

export const InterviewManager: React.FC = () => {
  const { showToast } = useToast();
  const interviews = atsService.getInterviews();
  const candidates = atsService.getCandidates();
  const jobs = atsService.getJobs();

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  // Form
  const [form, setForm] = useState({
    candidate_id: candidates[0]?.id || '',
    job_id: jobs[0]?.id || '',
    round_type: 'Technical Round 1' as InterviewRoundType,
    date: new Date().toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '15:00',
    location_or_link: 'https://meet.google.com/abc-defg-hij',
    interviewer_names: 'Anand V. (Eng Lead), Priyesh K. (Architect)',
  });

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const cand = candidates.find(c => c.id === form.candidate_id);
    const job = jobs.find(j => j.id === form.job_id);

    try {
        const panelMembers = form.interviewer_names.split(',').map((name, i) => ({
          user_id: `emp-0${i + 2}`,
          interviewer_id: `emp-0${i + 2}`,
          name: name.trim(),
          interviewer_name: name.trim(),
          email: 'interviewer@acme.com',
          interviewer_email: 'interviewer@acme.com',
          role: 'Technical Lead',
          is_required: true,
          accepted: true,
        }));

        const created = atsService.scheduleInterview({
          application_id: 'app-01',
          candidate_id: form.candidate_id,
          candidate_name: cand?.full_name || 'Candidate',
          candidate_email: cand?.email || 'cand@example.com',
          job_id: form.job_id,
          job_title: job?.job_title || 'Software Role',
          round_name: form.round_type,
          round_type: form.round_type,
          round_number: 1,
          date: form.date,
          start_time: form.start_time,
          end_time: form.end_time,
          timezone: 'IST',
          panel: panelMembers,
          interviewers: panelMembers,
          mode: 'Online',
          location_or_link: form.location_or_link,
        });

      showToast(`Interview scheduled for ${created.candidate_name}!`);
      setIsScheduleOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error scheduling interview');
    }
  };

  const submitScorecard = (interviewId: string, rating: number, recommendation: any) => {
    atsService.submitInterviewFeedback(interviewId, {
      interview_id: interviewId,
      interviewer_id: 'emp-02',
      interviewer_name: 'Anand V.',
      overall_rating: rating,
      recommendation,
      technical_skills_rating: rating,
      communication_rating: rating,
      problem_solving_rating: rating,
      culture_fit_rating: rating,
      strengths: 'Strong React architecture knowledge and clean code practices.',
      areas_for_improvement: 'Can deepen cloud infrastructure knowledge.',
      detailed_notes: 'Candidate performed exceptionally well during the live coding exercise.',
      submitted_at: new Date().toISOString(),
    });

    showToast('Interview Scorecard & Feedback submitted successfully!');
    setSelectedInterview(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#07563D]" /> Interview Operations & Conflict Engine
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Schedule round panels, detect interviewer calendar conflicts, and record structured feedback scorecards
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsScheduleOpen(true)}>
          Schedule Interview
        </Button>
      </div>

      {/* Scheduled Interviews Matrix */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Interview ID</TableHead>
              <TableHead>Candidate & Role</TableHead>
              <TableHead>Round Type</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Interviewers / Panel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Scorecard</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interviews.map(inv => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs font-bold text-gray-900">{inv.id}</TableCell>
                <TableCell>
                  <div className="font-bold text-gray-900 text-sm">{inv.candidate_name}</div>
                  <div className="text-xs text-gray-500">{inv.job_title}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="purple" size="sm">{inv.round_type}</Badge>
                </TableCell>
                <TableCell className="text-xs font-semibold text-gray-800">
                  {inv.date} ({inv.start_time} - {inv.end_time})
                </TableCell>
                <TableCell className="text-xs text-gray-700">
                  {(inv.interviewers || inv.panel || []).map(i => i.interviewer_name || i.name).join(', ')}
                </TableCell>
                <TableCell>
                  <Badge variant={inv.status === 'Completed' ? 'emerald' : 'amber'} size="sm">
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setSelectedInterview(inv)}>
                    Scorecard Form
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* SCHEDULE MODAL */}
      <Modal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} title="Schedule Round Panel Interview" size="md">
        <form onSubmit={handleSchedule} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-gray-700">Select Candidate *</label>
            <Select
              value={form.candidate_id}
              onChange={e => setForm({ ...form, candidate_id: e.target.value })}
              options={candidates.map(c => ({ value: c.id, label: `${c.full_name} (${c.email})` }))}
            />
          </div>
          <div>
            <label className="font-bold text-gray-700">Select Job Opening *</label>
            <Select
              value={form.job_id}
              onChange={e => setForm({ ...form, job_id: e.target.value })}
              options={jobs.map(j => ({ value: j.id, label: j.job_title }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700">Round Type</label>
              <Select
                value={form.round_type}
                onChange={e => setForm({ ...form, round_type: e.target.value as InterviewRoundType })}
                options={[
                  { value: 'HR Screening', label: 'HR Screening' },
                  { value: 'Technical Round 1', label: 'Technical Round 1' },
                  { value: 'Technical Round 2', label: 'Technical Round 2' },
                  { value: 'System Design', label: 'System Design' },
                  { value: 'Hiring Manager Round', label: 'Hiring Manager Round' },
                  { value: 'Culture Fit', label: 'Culture Fit' },
                ]}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700">Date</label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="font-bold text-gray-700">Start Time</label>
              <Input value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="font-bold text-gray-700">End Time</label>
              <Input value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="font-bold text-gray-700">Interviewer Panel Names (Comma separated)</label>
            <Input value={form.interviewer_names} onChange={e => setForm({ ...form, interviewer_names: e.target.value })} />
          </div>
          <div>
            <label className="font-bold text-gray-700">Meeting Link / Location</label>
            <Input value={form.location_or_link} onChange={e => setForm({ ...form, location_or_link: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
            <Button type="submit">Confirm Schedule</Button>
          </div>
        </form>
      </Modal>

      {/* SCORECARD FEEDBACK MODAL */}
      {selectedInterview && (
        <Modal isOpen={Boolean(selectedInterview)} onClose={() => setSelectedInterview(null)} title={`Submit Interview Scorecard: ${selectedInterview.round_type}`} size="lg">
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-bold text-gray-900">{selectedInterview.candidate_name}</p>
              <p className="text-gray-500">{selectedInterview.job_title} • {selectedInterview.date}</p>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-gray-800 block">Overall Score Rating:</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Button key={star} size="sm" variant="outline" onClick={() => submitScorecard(selectedInterview.id, star, 'Strong Hire')}>
                    <Star className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400 inline" /> {star} Star
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedInterview(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
