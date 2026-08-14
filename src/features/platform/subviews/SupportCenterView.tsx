// src/features/platform/subviews/SupportCenterView.tsx
// ============================================================
// WorkForceOS — SaaS Operations, Incidents & Background Worker Hub
// ============================================================

import React, { useState } from 'react';
import {
  LifeBuoy,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Key,
  Shield,
  RefreshCw,
  Plus,
  Server,
  Play,
  XCircle,
  Activity,
  Layers,
} from 'lucide-react';
import {
  platformIncidentService,
  platformJobService,
  platformImpersonationService,
} from '../../../services/platform';
import { PlatformIncident, PlatformBackgroundJob, SupportAccessRequest, IncidentSeverity } from '../../../types/platformAdmin';

export const SupportCenterView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'incidents' | 'jobs' | 'impersonation'>('incidents');
  const [incidents, setIncidents] = useState<PlatformIncident[]>(() => platformIncidentService.getIncidents());
  const [jobs, setJobs] = useState<PlatformBackgroundJob[]>(() => platformJobService.getJobs());
  const [supportRequests] = useState<SupportAccessRequest[]>(() => platformImpersonationService.getSupportRequests());

  const [isDeclareModalOpen, setIsDeclareModalOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    description: '',
    severity: 'SEV-2 Major' as IncidentSeverity,
    lead_engineer: 'Platform Lead Anand',
    affected_services: ['API Gateway'],
  });

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.title) return;

    const newInc = await platformIncidentService.createIncident({
      title: incidentForm.title,
      description: incidentForm.description,
      severity: incidentForm.severity,
      affected_services: incidentForm.affected_services,
      lead_engineer: incidentForm.lead_engineer,
    });

    setIncidents([newInc, ...incidents]);
    setIsDeclareModalOpen(false);
    setIncidentForm({
      title: '',
      description: '',
      severity: 'SEV-2 Major',
      lead_engineer: 'Platform Lead Anand',
      affected_services: ['API Gateway'],
    });
  };

  const handleResolveIncident = async (id: string) => {
    const updated = await platformIncidentService.updateIncidentStatus(id, 'Resolved', 'Root cause remediated');
    setIncidents(incidents.map(i => (i.id === id ? updated : i)));
  };

  const handleRetryJob = async (id: string) => {
    const updated = await platformJobService.retryJob(id);
    setJobs(jobs.map(j => (j.id === id ? updated : j)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#07563D] border border-emerald-200 uppercase tracking-wider">
              SaaS Operations Console
            </span>
            <span className="text-xs font-semibold text-gray-500 font-mono">Incident SLA: 15m Response</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Operations, Incidents & Worker Queue</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage operational incident response, monitor background asynchronous job queues, and oversee impersonation tickets.
          </p>
        </div>

        {activeTab === 'incidents' && (
          <button
            onClick={() => setIsDeclareModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            Declare Outage / Incident
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6 rounded-2xl shadow-2xs gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`py-3.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'incidents' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Active & Resolved Incidents ({incidents.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`py-3.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'jobs' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Background Worker Queue ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('impersonation')}
          className={`py-3.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'impersonation' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Support Impersonation Tickets ({supportRequests.length})
        </button>
      </div>

      {/* TAB 1: INCIDENTS */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          {incidents.map(inc => {
            const isResolved = inc.status === 'Resolved' || inc.status === 'Closed';
            return (
              <div
                key={inc.id}
                className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 hover:border-emerald-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        inc.severity.includes('SEV-1') ? 'bg-red-100 text-red-900' : inc.severity.includes('SEV-2') ? 'bg-orange-100 text-orange-900' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {inc.severity}
                      </span>
                      <span className="font-mono text-xs font-bold text-gray-400">{inc.id}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800 animate-pulse'
                      }`}>
                        {inc.status}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-gray-900 mt-2">{inc.title}</h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{inc.description}</p>
                  </div>

                  {!isResolved && (
                    <button
                      onClick={() => handleResolveIncident(inc.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      Resolve Incident
                    </button>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500 font-medium">
                  <div>
                    Lead: <strong className="text-gray-700">{inc.lead_engineer}</strong> • Started: {inc.started_at}
                    {inc.resolved_at && <span> • Resolved: {inc.resolved_at}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {inc.affected_services.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] rounded-md font-bold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: BACKGROUND JOBS */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-gray-900">Distributed Background Worker Queue</h3>
            <span className="text-xs font-mono text-gray-500">BullMQ Redis Worker Mesh</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Job Name & Type</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {jobs.map(j => (
                  <tr key={j.id} className="hover:bg-gray-50/60">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{j.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{j.type} • {j.id}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-700">P{j.priority}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#07563D] h-full" style={{ width: `${j.progress_percent}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-gray-600">{j.progress_percent}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{j.attempt_count} / {j.max_attempts}</td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">{j.duration_sec ? `${j.duration_sec}s` : 'Active'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        j.status === 'Completed' ? 'bg-emerald-100 text-[#07563D]' : j.status === 'Failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800 animate-pulse'
                      }`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {j.status === 'Failed' && (
                        <button
                          onClick={() => handleRetryJob(j.id)}
                          className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                        >
                          Retry Job
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: IMPERSONATION TICKETS */}
      {activeTab === 'impersonation' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-900">Active & Historical Impersonation Requests</h3>

          <div className="space-y-3">
            {supportRequests.map(req => (
              <div key={req.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{req.tenant_name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900">
                      {req.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{req.reason}</div>
                  <div className="text-[10px] text-gray-400 mt-1">Requested by {req.requested_by} • Duration: {req.duration_minutes} mins</div>
                </div>
                <div className="font-mono text-gray-500 text-[11px]">{req.expires_at}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Declare Outage Modal */}
      {isDeclareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4 text-xs">
            <h3 className="text-lg font-black text-gray-900">Declare Operational Incident</h3>
            <form onSubmit={handleCreateIncident} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Incident Title *</label>
                <input
                  type="text"
                  required
                  value={incidentForm.title}
                  onChange={e => setIncidentForm({ ...incidentForm, title: e.target.value })}
                  placeholder="e.g. WhatsApp Gateway Outbound Delay"
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-red-600 outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Impact Description</label>
                <textarea
                  rows={3}
                  value={incidentForm.description}
                  onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  placeholder="Describe customer impact and affected services..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-red-600 outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Severity Tier</label>
                <select
                  value={incidentForm.severity}
                  onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                >
                  <option value="SEV-1 Critical">SEV-1 Critical (Full SaaS Outage)</option>
                  <option value="SEV-2 Major">SEV-2 Major (Core Module Degraded)</option>
                  <option value="SEV-3 Moderate">SEV-3 Moderate (Non-Critical Service Impairment)</option>
                  <option value="SEV-4 Minor">SEV-4 Minor (Cosmetic / Low Latency Delay)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsDeclareModalOpen(false)} className="px-4 py-2 font-bold text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer">
                  Publish Incident & Notify Statuspage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
