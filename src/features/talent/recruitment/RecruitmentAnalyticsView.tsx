// src/features/talent/recruitment/RecruitmentAnalyticsView.tsx
// ============================================================================
// WorkForceOS — Recruitment & Hiring Velocity Analytics Engine
// Pure SQL Realtime Aggregations, Funnel Drop-off, Stage Aging & Source ROI
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  TrendingUp,
  Clock,
  Award,
  Users,
  Briefcase,
  Layers,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { Candidate, Requisition, JobOpening, Offer, Interview } from '../../../types/ats';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

export const RecruitmentAnalyticsView: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cList, jList, rList, iList, oList] = await Promise.all([
        recruitmentService.getCandidates(),
        recruitmentService.getJobs(),
        recruitmentService.getRequisitions(),
        recruitmentService.getInterviews(),
        recruitmentService.getOffers(),
      ]);
      setCandidates(cList);
      setJobs(jList);
      setRequisitions(rList);
      setInterviews(iList);
      setOffers(oList);
    } catch (err) {
      console.error('[RecruitmentAnalyticsView] loadData error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time Event Subscription
  useEffect(() => {
    const unsub = hrEventBus.subscribe('recruitment.*', () => {
      loadData();
    });
    return () => unsub();
  }, []);

  // 1. Executive Top Metrics
  const totalCandidates = candidates.length;
  const hiredCount = candidates.filter(c => c.current_stage === 'Hired' || c.status === 'Hired' || c.converted_employee_id).length;
  const overallConversion = totalCandidates > 0 ? ((hiredCount / totalCandidates) * 100).toFixed(1) : '0';
  const offerAcceptedCount = offers.filter(o => o.status === 'Accepted').length;
  const offerAcceptanceRate = offers.length > 0 ? Math.round((offerAcceptedCount / offers.length) * 100) : 0;
  const activeOpenings = jobs.filter(j => j.status === 'Open').reduce((acc, j) => acc + (j.number_of_openings || 1), 0);
  const interviewFeedbackCount = interviews.filter(i => i.status === 'Completed' || i.overall_recommendation).length;
  const interviewFeedbackRate = interviews.length > 0 ? Math.round((interviewFeedbackCount / interviews.length) * 100) : 0;

  // 2. Stage-by-Stage Funnel Breakdown
  const funnelStages = [
    { stage: 'Applications', count: candidates.length, color: 'bg-blue-600' },
    { stage: 'Screening', count: candidates.filter(c => c.current_stage === 'Screening' || c.current_stage === 'Shortlisted' || c.current_stage === 'Assessment' || c.current_stage === 'Interview' || c.current_stage === 'Selected' || c.current_stage === 'Offer' || c.current_stage === 'Preboarding' || c.current_stage === 'Hired').length, color: 'bg-cyan-600' },
    { stage: 'Shortlisted', count: candidates.filter(c => c.current_stage === 'Shortlisted' || c.current_stage === 'Assessment' || c.current_stage === 'Interview' || c.current_stage === 'Selected' || c.current_stage === 'Offer' || c.current_stage === 'Preboarding' || c.current_stage === 'Hired').length, color: 'bg-indigo-600' },
    { stage: 'Interview', count: candidates.filter(c => c.current_stage === 'Interview' || c.current_stage === 'Selected' || c.current_stage === 'Offer' || c.current_stage === 'Preboarding' || c.current_stage === 'Hired').length, color: 'bg-purple-600' },
    { stage: 'Selected', count: candidates.filter(c => c.current_stage === 'Selected' || c.current_stage === 'Offer' || c.current_stage === 'Preboarding' || c.current_stage === 'Hired').length, color: 'bg-amber-600' },
    { stage: 'Offer Released', count: offers.length, color: 'bg-emerald-600' },
    { stage: 'Joined / Hired', count: hiredCount, color: 'bg-[#07563D]' },
  ];

  // 3. Dynamic Candidate Sourcing Performance
  const sourceGroups: Record<string, number> = {};
  candidates.forEach(c => {
    const src = c.source_type || 'Career Portal';
    sourceGroups[src] = (sourceGroups[src] || 0) + 1;
  });

  const sourceData = Object.entries(sourceGroups).map(([channel, count]) => ({
    channel,
    count,
    pct: totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0,
  }));

  // 4. Department Hiring Velocity
  const deptGroups: Record<string, { openings: number; candidates: number; hired: number }> = {};
  jobs.forEach(j => {
    const d = j.department_name || 'Engineering';
    if (!deptGroups[d]) deptGroups[d] = { openings: 0, candidates: 0, hired: 0 };
    deptGroups[d].openings += j.number_of_openings || 1;
  });
  candidates.forEach(c => {
    const d = c.department_name || 'Engineering';
    if (!deptGroups[d]) deptGroups[d] = { openings: 0, candidates: 0, hired: 0 };
    deptGroups[d].candidates += 1;
    if (c.current_stage === 'Hired') deptGroups[d].hired += 1;
  });

  // 5. Requisition Aging Buckets
  const now = Date.now();
  let agingUnder15 = 0;
  let aging16to30 = 0;
  let aging31to45 = 0;
  let agingOver45 = 0;

  requisitions.forEach(r => {
    const createdTime = new Date(r.created_at).getTime();
    const daysOpen = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24));
    if (daysOpen <= 15) agingUnder15++;
    else if (daysOpen <= 30) aging16to30++;
    else if (daysOpen <= 45) aging31to45++;
    else agingOver45++;
  });

  return (
    <div className="space-y-6">
      {/* Realtime Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Recruitment & Velocity Analytics</h2>
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE REALTIME
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Realtime talent funnel drop-off, source channel conversion, requisition aging, and hiring SLA velocity.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="text-xs gap-1.5 rounded-xl border-gray-200"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} /> Refresh Analytics
        </Button>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Overall Conversion</span>
            <TrendingUp className="w-4 h-4 text-[#07563D]" />
          </div>
          <div className="text-2xl font-black text-gray-900">{overallConversion}%</div>
          <p className="text-[11px] text-gray-400">{hiredCount} hires from {totalCandidates} applicants</p>
        </Card>

        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Offer Acceptance</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{offerAcceptanceRate}%</div>
          <p className="text-[11px] text-gray-400">{offerAcceptedCount} of {offers.length} released offers accepted</p>
        </Card>

        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Feedback Turnaround</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">{interviewFeedbackRate}%</div>
          <p className="text-[11px] text-gray-400">{interviewFeedbackCount} of {interviews.length} scorecards logged</p>
        </Card>

        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Active Open Positions</span>
            <Briefcase className="w-4 h-4 text-[#07563D]" />
          </div>
          <div className="text-2xl font-black text-gray-900">{activeOpenings}</div>
          <p className="text-[11px] text-gray-400">Across {jobs.length} published job openings</p>
        </Card>

        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Hires Joined</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{hiredCount}</div>
          <p className="text-[11px] text-gray-400">Converted to active employee database</p>
        </Card>
      </div>

      {/* Realtime Funnel Velocity & Drop-off Breakdown */}
      <Card className="p-6 rounded-3xl border-gray-200/80 shadow-2xs space-y-5 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-900">Recruitment Funnel Velocity & Stage Retention</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Cumulative candidate progression through screening, evaluation, offer release, and final onboarding.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#07563D] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Total Pipeline Volume: {totalCandidates}
          </span>
        </div>

        {totalCandidates === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80 text-xs text-gray-400 italic">
            No candidate data available to calculate funnel retention.
          </div>
        ) : (
          <div className="space-y-3">
            {funnelStages.map((st, idx) => {
              const prevCount = idx === 0 ? totalCandidates : funnelStages[idx - 1].count;
              const conversionPct = prevCount > 0 ? Math.round((st.count / prevCount) * 100) : 0;
              const overallPct = totalCandidates > 0 ? Math.round((st.count / totalCandidates) * 100) : 0;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 w-28">{st.stage}</span>
                      <span className="font-mono text-[11px] font-semibold text-gray-500">
                        {st.count} candidates
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-gray-400">Retention: <strong className="text-gray-700">{conversionPct}%</strong></span>
                      <span className="font-mono font-bold text-[#07563D]">{overallPct}% of pipeline</span>
                    </div>
                  </div>

                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', st.color)}
                      style={{ width: `${Math.max(overallPct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Sourcing Channel Effectiveness & Requisition Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Candidate Sourcing Performance */}
        <Card className="p-6 rounded-3xl border-gray-200/80 shadow-2xs space-y-4 bg-white">
          <h4 className="text-sm font-bold text-gray-900">Sourcing Channel Conversion & Volume</h4>
          {sourceData.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80 text-xs text-gray-400 italic">
              No candidate sources recorded yet.
            </div>
          ) : (
            <div className="space-y-3.5">
              {sourceData.map((src, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800">{src.channel}</span>
                    <span className="font-mono text-gray-500">{src.count} applicants ({src.pct}%)</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#07563D] rounded-full transition-all duration-500"
                      style={{ width: `${src.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Requisition SLA Aging Analysis */}
        <Card className="p-6 rounded-3xl border-gray-200/80 shadow-2xs space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">Requisition Aging & SLA Health</h4>
            <span className="text-xs font-mono font-bold text-gray-500">Total: {requisitions.length} Requisitions</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">0 - 15 Days</span>
              <div className="text-xl font-black text-emerald-900 mt-1">{agingUnder15}</div>
              <span className="text-[9px] text-emerald-700">Healthy Velocity</span>
            </div>

            <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 text-center">
              <span className="text-[10px] font-bold text-blue-800 uppercase">16 - 30 Days</span>
              <div className="text-xl font-black text-blue-900 mt-1">{aging16to30}</div>
              <span className="text-[9px] text-blue-700">On Target SLA</span>
            </div>

            <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 text-center">
              <span className="text-[10px] font-bold text-amber-800 uppercase">31 - 45 Days</span>
              <div className="text-xl font-black text-amber-900 mt-1">{aging31to45}</div>
              <span className="text-[9px] text-amber-700">Attention Needed</span>
            </div>

            <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/50 text-center">
              <span className="text-[10px] font-bold text-rose-800 uppercase">45+ Days</span>
              <div className="text-xl font-black text-rose-900 mt-1">{agingOver45}</div>
              <span className="text-[9px] text-rose-700">SLA Critical</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs text-gray-600 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#07563D] shrink-0" />
            <span>Company SLA Target: <strong>30 calendar days</strong> from requisition approval to offer acceptance.</span>
          </div>
        </Card>
      </div>

      {/* Department Breakdown Table */}
      <Card className="p-6 rounded-3xl border-gray-200/80 shadow-2xs space-y-4 bg-white">
        <h4 className="text-sm font-bold text-gray-900">Department Workforce Hiring Breakdown</h4>
        {Object.keys(deptGroups).length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200/80 text-xs text-gray-400 italic">
            No department hiring allocations recorded.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(deptGroups).map(([dept, data], idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/60 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#07563D]" />
                  <h5 className="text-xs font-bold text-gray-900">{dept}</h5>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center pt-2 border-t border-gray-200/60">
                  <div>
                    <span className="text-[9px] uppercase text-gray-400">Openings</span>
                    <div className="text-xs font-black text-gray-900">{data.openings}</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-gray-400">Pipeline</span>
                    <div className="text-xs font-black text-[#07563D]">{data.candidates}</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-gray-400">Hires</span>
                    <div className="text-xs font-black text-blue-700">{data.hired}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
