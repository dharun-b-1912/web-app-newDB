// src/features/talent/recruitment/AtsDashboard.tsx
// ============================================================================
// Joy PeopleHR — Recruitment & ATS 2.0 Command Center & Executive Overview
// Realtime Live Database Aggregations, Clickable Funnel & Aging Positions SLA
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Briefcase,
  FileCheck2,
  Users,
  Calendar,
  Award,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  TrendingUp,
  Percent,
  XCircle,
  UserCheck,
  Building2,
  MapPin,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { Candidate, JobOpening, Requisition, Interview, Offer, AtsOverviewMetrics } from '../../../types/ats';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

interface Props {
  onNavigateTab: (tabId: string, filterPayload?: any) => void;
  onOpenCreateRequisition?: () => void;
  onOpenCreateJob?: () => void;
  onOpenAddCandidate?: () => void;
}

export const AtsDashboard: React.FC<Props> = ({
  onNavigateTab,
  onOpenCreateRequisition,
  onOpenCreateJob,
  onOpenAddCandidate,
}) => {
  const [metrics, setMetrics] = useState<AtsOverviewMetrics>({
    openPositions: 0,
    pendingRequisitions: 0,
    activeCandidates: 0,
    interviewsToday: 0,
    interviewsThisWeek: 0,
    pendingFeedbackCount: 0,
    offersPending: 0,
    offersAccepted: 0,
    offersDeclined: 0,
    candidatesJoined: 0,
    avgTimeToFillDays: 28,
    agingPositionsCount: 0,
  });

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [summary, candList, jobList, reqList] = await Promise.all([
        recruitmentService.getOverviewMetrics(),
        recruitmentService.getCandidates(),
        recruitmentService.getJobs(),
        recruitmentService.getRequisitions(),
      ]);
      setMetrics(summary);
      setCandidates(candList);
      setJobs(jobList);
      setRequisitions(reqList);
    } catch (err) {
      console.error('[AtsDashboard] loadData error:', err);
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

  // Compute live stage counts for the interactive recruitment funnel
  const funnelStages = [
    { id: 'New', name: 'Applications', count: candidates.filter(c => c.current_stage === 'New').length, color: 'bg-blue-600' },
    { id: 'Screening', name: 'Screening', count: candidates.filter(c => c.current_stage === 'Screening').length, color: 'bg-cyan-600' },
    { id: 'Shortlisted', name: 'Shortlisted', count: candidates.filter(c => c.current_stage === 'Shortlisted').length, color: 'bg-indigo-600' },
    { id: 'Assessment', name: 'Assessment', count: candidates.filter(c => c.current_stage === 'Assessment').length, color: 'bg-violet-600' },
    { id: 'Interview', name: 'Interviews', count: candidates.filter(c => c.current_stage === 'Interview').length, color: 'bg-purple-600' },
    { id: 'Selected', name: 'Selected', count: candidates.filter(c => c.current_stage === 'Selected').length, color: 'bg-amber-600' },
    { id: 'Offer', name: 'Offers Released', count: candidates.filter(c => c.current_stage === 'Offer').length, color: 'bg-emerald-600' },
    { id: 'Preboarding', name: 'Preboarding', count: candidates.filter(c => c.current_stage === 'Preboarding').length, color: 'bg-teal-600' },
    { id: 'Hired', name: 'Hired / Joined', count: candidates.filter(c => c.current_stage === 'Hired').length, color: 'bg-[#07563D]' },
  ];

  const totalFunnelCandidates = candidates.length;

  return (
    <div className="space-y-6">
      {/* 1. Action Header & Quick Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Recruitment Command Center</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Realtime talent pipeline, active job requisitions, interview velocity, and hiring metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenAddCandidate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAddCandidate}
              className="text-xs gap-1.5 rounded-xl border-gray-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Candidate
            </Button>
          )}
          {onOpenCreateJob && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCreateJob}
              className="text-xs gap-1.5 rounded-xl border-gray-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Job
            </Button>
          )}
          {onOpenCreateRequisition && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenCreateRequisition}
              className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              New Requisition
            </Button>
          )}
        </div>
      </div>

      {/* 2. Top KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card
          onClick={() => onNavigateTab('jobs')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-[#07563D]">
            <Briefcase className="w-4 h-4" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{metrics.openPositions}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Open Positions</div>
        </Card>

        <Card
          onClick={() => onNavigateTab('requisitions')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-[#07563D]">
            <FileCheck2 className="w-4 h-4" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{metrics.pendingRequisitions}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Pending Approvals</div>
        </Card>

        <Card
          onClick={() => onNavigateTab('candidates')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-[#07563D]">
            <Users className="w-4 h-4" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{candidates.length}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Active Pipeline</div>
        </Card>

        <Card
          onClick={() => onNavigateTab('interviews')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-[#07563D]">
            <Calendar className="w-4 h-4" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{metrics.interviewsToday}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Interviews Today</div>
        </Card>

        <Card
          onClick={() => onNavigateTab('offers')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-[#07563D]">
            <Award className="w-4 h-4" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{metrics.offersPending}</div>
          <div className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Offers Pending</div>
        </Card>

        <Card
          onClick={() => onNavigateTab('analytics')}
          className="p-4 rounded-2xl border-gray-200/80 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group bg-emerald-50/40"
        >
          <div className="flex items-center justify-between text-[#07563D]">
            <Clock className="w-4 h-4" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-[#07563D] mt-2">{metrics.avgTimeToFillDays}d</div>
          <div className="text-[11px] font-bold text-gray-600 uppercase mt-0.5">Avg Time to Fill</div>
        </Card>
      </div>

      {/* 3. Interactive Clickable Recruitment Funnel */}
      <Card className="p-6 rounded-3xl border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-900">Interactive Hiring Funnel</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click any stage to instantly view and manage candidates in that stage.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#07563D] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Total Candidates: {totalFunnelCandidates}
          </span>
        </div>

        {totalFunnelCandidates === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-700">No active candidate applications in the funnel</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Post job openings or add candidates to start populating your hiring pipeline.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-2.5">
            {funnelStages.map(stage => {
              const percentage = totalFunnelCandidates > 0 ? Math.round((stage.count / totalFunnelCandidates) * 100) : 0;
              return (
                <button
                  key={stage.id}
                  onClick={() => onNavigateTab('candidates', { stage: stage.id })}
                  className="p-3.5 rounded-2xl border border-gray-200/80 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 transition-all text-left group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="h-2 w-2 rounded-full bg-[#07563D]" />
                    <span className="text-[10px] font-mono text-gray-400">{percentage}%</span>
                  </div>
                  <div className="text-xl font-black text-gray-900 mt-2 group-hover:text-[#07563D]">{stage.count}</div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-tight truncate mt-0.5">
                    {stage.name}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* 4. Active Requisitions & Aging Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requisitions Requiring Approval */}
        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#07563D]" />
              <h4 className="text-sm font-bold text-gray-900">Requisitions Requiring Approval</h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('requisitions')}
              className="text-xs text-[#07563D] hover:bg-emerald-50 gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          {requisitions.filter(r => r.status === 'Pending Approval' || r.status === 'Submitted').length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80 text-xs text-gray-400 italic">
              No pending requisition approvals at this time.
            </div>
          ) : (
            <div className="space-y-2.5">
              {requisitions
                .filter(r => r.status === 'Pending Approval' || r.status === 'Submitted')
                .slice(0, 3)
                .map(r => (
                  <div
                    key={r.id}
                    onClick={() => onNavigateTab('requisitions')}
                    className="p-3.5 rounded-xl border border-gray-200/80 hover:border-emerald-300 bg-white transition cursor-pointer flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-gray-400">{r.id}</span>
                        <Badge variant="amber" size="sm" className="text-[9px]">
                          {r.status}
                        </Badge>
                      </div>
                      <h5 className="text-xs font-bold text-gray-900 mt-1">{r.job_title}</h5>
                      <p className="text-[11px] text-gray-500">{r.department_name} • {r.number_of_positions} openings</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* Active Open Positions */}
        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#07563D]" />
              <h4 className="text-sm font-bold text-gray-900">Active Job Openings ({jobs.filter(j => j.status === 'Open').length})</h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('jobs')}
              className="text-xs text-[#07563D] hover:bg-emerald-50 gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          {jobs.filter(j => j.status === 'Open').length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80 text-xs text-gray-400 italic">
              No open job openings active.
            </div>
          ) : (
            <div className="space-y-2.5">
              {jobs
                .filter(j => j.status === 'Open')
                .slice(0, 3)
                .map(j => (
                  <div
                    key={j.id}
                    onClick={() => onNavigateTab('jobs')}
                    className="p-3.5 rounded-xl border border-gray-200/80 hover:border-emerald-300 bg-white transition cursor-pointer flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-gray-400">{j.id}</span>
                        <Badge variant="emerald" size="sm" className="text-[9px]">
                          {j.employment_type}
                        </Badge>
                      </div>
                      <h5 className="text-xs font-bold text-gray-900 mt-1">{j.job_title}</h5>
                      <p className="text-[11px] text-gray-500">{j.department_name} • {j.number_of_openings} openings</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
