// src/features/talent/recruitment/ReferralsManager.tsx
// ============================================================================
// Joy PeopleHR — Employee Referral Program & Rewards Hub
// Track referred talent, referral pipeline stages, and reward eligibility
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  Share2,
  Plus,
  Search,
  Award,
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  Gift,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { Candidate, JobOpening } from '../../../types/ats';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { hrEventBus } from '../../../services/hrEventBus';

interface ReferralItem {
  id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  job_title: string;
  department_name: string;
  referrer_employee_name: string;
  referrer_employee_id?: string;
  referred_date: string;
  current_stage: string;
  reward_amount: number;
  reward_status: 'Eligible' | 'Processing' | 'Paid' | 'Pending Hire';
}

export const ReferralsManager: React.FC = () => {
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [referrerName, setReferrerName] = useState('Dharun Joy');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cList, jList] = await Promise.all([
        recruitmentService.getCandidates(),
        recruitmentService.getJobs(),
      ]);
      setCandidates(cList);
      setJobs(jList);
      if (jList.length > 0 && !selectedJobId) {
        setSelectedJobId(jList[0].id);
      }

      // Filter candidates that came via Referral
      const refCandidates = cList.filter(c => c.source_type === 'Referral');
      const refItems: ReferralItem[] = refCandidates.map(c => ({
        id: `REF-${c.id.slice(-4).toUpperCase()}`,
        candidate_name: c.display_name || `${c.first_name} ${c.last_name}`,
        candidate_email: c.email,
        candidate_phone: c.phone,
        job_title: c.applied_job_title || 'Software Engineer',
        department_name: c.department_name || 'Engineering',
        referrer_employee_name: c.referral_employee_name || 'Employee Referrer',
        referred_date: c.created_at.split('T')[0],
        current_stage: c.current_stage,
        reward_amount: 50000,
        reward_status: c.current_stage === 'Hired' ? 'Eligible' : 'Pending Hire',
      }));
      setReferrals(refItems);
    } catch (err) {
      console.error('[ReferralsManager] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('recruitment.*', () => {
      loadData();
    });
    return () => unsub();
  }, []);

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName || !candidateEmail) return;

    const [first, ...rest] = candidateName.split(' ');
    const last = rest.join(' ') || 'Candidate';
    const matchedJob = jobs.find(j => j.id === selectedJobId);

    try {
      await recruitmentService.createCandidate({
        first_name: first,
        last_name: last,
        email: candidateEmail,
        phone: candidatePhone,
        source_type: 'Referral',
        referral_employee_name: referrerName,
        applied_job_id: selectedJobId,
        applied_job_title: matchedJob?.job_title || 'Position',
        department_name: matchedJob?.department_name || 'Engineering',
        current_stage: 'New',
      });

      showToast(`Referral submitted for ${candidateName}!`);
      setIsSubmitModalOpen(false);
      setCandidateName('');
      setCandidateEmail('');
      setCandidatePhone('');
      loadData();
    } catch {
      showToast('Error submitting referral', 'error');
    }
  };

  const totalReferrals = referrals.length;
  const hiredReferrals = referrals.filter(r => r.current_stage === 'Hired').length;
  const totalRewardsPaid = hiredReferrals * 50000;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Employee Referral Program</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Reward employees for introducing top-tier talent into the hiring pipeline.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsSubmitModalOpen(true)}
          className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Submit New Referral
        </Button>
      </div>

      {/* Referral KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Total Referrals</span>
            <Share2 className="w-4 h-4 text-[#07563D]" />
          </div>
          <div className="text-2xl font-black text-gray-900">{totalReferrals}</div>
          <p className="text-[11px] text-gray-400">Candidates referred by internal employees</p>
        </Card>

        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Active In Pipeline</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{totalReferrals - hiredReferrals}</div>
          <p className="text-[11px] text-gray-400">Currently in screening / interview rounds</p>
        </Card>

        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Successful Hires</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{hiredReferrals}</div>
          <p className="text-[11px] text-gray-400">Converted to full-time employees</p>
        </Card>

        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Total Referral Payouts</span>
            <Gift className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">INR {totalRewardsPaid.toLocaleString()}</div>
          <p className="text-[11px] text-gray-400">Standard reward: INR 50,000 / hire</p>
        </Card>
      </div>

      {/* Referrals Master Table */}
      <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-gray-400">Loading referral records...</div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <Share2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-900">No Referrals Submitted Yet</h4>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Employees can refer peers for open headcount positions and earn bonus rewards upon successful hire.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Submit First Referral
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-gray-700">Candidate</TableHead>
                <TableHead className="font-bold text-gray-700">Target Role</TableHead>
                <TableHead className="font-bold text-gray-700">Referred By</TableHead>
                <TableHead className="font-bold text-gray-700">Date Referred</TableHead>
                <TableHead className="font-bold text-gray-700">Pipeline Stage</TableHead>
                <TableHead className="font-bold text-gray-700">Reward Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map(r => (
                <TableRow key={r.id} className="hover:bg-emerald-50/40 transition-colors">
                  <TableCell>
                    <div className="font-bold text-gray-900 text-xs">{r.candidate_name}</div>
                    <div className="text-[11px] text-gray-400">{r.candidate_email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-800">{r.job_title}</div>
                    <div className="text-[11px] text-gray-400">{r.department_name}</div>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-gray-900">
                    {r.referrer_employee_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-700">
                    {r.referred_date}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.current_stage === 'Hired' ? 'emerald' : 'blue'} className="text-[10px]">
                      {r.current_stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.reward_status === 'Eligible' ? 'emerald' : 'gray'}
                      className="text-[10px]"
                    >
                      {r.reward_status} (INR {r.reward_amount.toLocaleString()})
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal: Submit Referral */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Employee Referral"
        description="Enter candidate details and target role to introduce talent to the recruitment team"
      >
        <form onSubmit={handleSubmitReferral} className="p-6 space-y-4 max-h-[80vh] overflow-auto">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Candidate Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Senthil Kumar"
              value={candidateName}
              onChange={e => setCandidateName(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Candidate Email *</label>
              <input
                type="email"
                placeholder="senthil.k@example.com"
                value={candidateEmail}
                onChange={e => setCandidateEmail(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Candidate Phone</label>
              <input
                type="text"
                placeholder="+91 98400 55667"
                value={candidatePhone}
                onChange={e => setCandidatePhone(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Target Job Opening *</label>
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
            >
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.job_title} ({j.department_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Referring Employee Name *</label>
            <input
              type="text"
              value={referrerName}
              onChange={e => setReferrerName(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSubmitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Submit Referral
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
