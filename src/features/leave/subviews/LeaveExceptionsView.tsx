import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveException } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  CheckCircle,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export const LeaveExceptionsView: React.FC = () => {
  const [exceptions, setExceptions] = useState<LeaveException[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'resolved'>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setExceptions(leaveApi.getExceptions());
  }, []);

  const handleResolve = (exc: LeaveException) => {
    const notes = prompt(`Resolve exception "${exc.title}". Please enter resolution justification:`, 'Verified with line manager; approved as exceptional operational allowance.');
    if (notes) {
      leaveApi.resolveException(exc.id, 'HR Compliance Admin', notes);
      setExceptions(leaveApi.getExceptions());
    }
  };

  const filteredExceptions = exceptions.filter(e => {
    const matchesTab = activeTab === 'open' ? e.status === 'Open' : e.status === 'Resolved';
    const matchesSeverity = severityFilter === 'All' || e.severity === severityFilter;
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSeverity && matchesSearch;
  });

  const openCount = exceptions.filter(e => e.status === 'Open').length;
  const resolvedCount = exceptions.filter(e => e.status === 'Resolved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-700" />
            <span>Leave Exceptions & Compliance Center</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Automated compliance flags for shift staffing thresholds, negative balances, missing certificates, and policy breaches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold border',
              openCount > 0
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            )}
          >
            {openCount} Open Compliance Risk(s)
          </span>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('open')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'open'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <span>Open Exceptions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-100 text-rose-800">
              {openCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'resolved'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <span>Resolved History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800">
              {resolvedCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search exceptions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-white w-64"
            />
          </div>

          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-xl text-xs font-bold bg-white"
          >
            <option value="All">All Severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Exceptions List */}
      <div className="space-y-3">
        {filteredExceptions.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto opacity-40" />
            <h4 className="text-xs font-bold text-gray-900">Zero Exceptions Found</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              All leave requests and balances satisfy established organizational compliance policies.
            </p>
          </div>
        ) : (
          filteredExceptions.map(exc => (
            <div
              key={exc.id}
              className={cn(
                'p-5 rounded-2xl border bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all',
                exc.status === 'Resolved'
                  ? 'border-gray-200 bg-gray-50/50 opacity-80'
                  : exc.severity === 'High'
                  ? 'border-rose-200 bg-rose-50/10 hover:border-rose-300'
                  : 'border-amber-200 bg-amber-50/10 hover:border-amber-300'
              )}
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={cn(
                    'p-2.5 rounded-xl shrink-0',
                    exc.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : exc.severity === 'High'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {exc.status === 'Resolved' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        exc.status === 'Resolved'
                          ? 'emerald'
                          : exc.severity === 'High'
                          ? 'rose'
                          : 'amber'
                      }
                      size="sm"
                    >
                      {exc.severity} Severity
                    </Badge>
                    <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {exc.type}
                    </span>
                    {exc.status === 'Resolved' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Resolved
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-extrabold text-gray-900 mt-1">{exc.title}</h3>
                  <p className="text-xs text-gray-600">{exc.description}</p>

                  <div className="pt-1 text-[11px] text-gray-400 font-mono flex items-center gap-2">
                    <span>
                      Staff: <strong className="text-gray-700">{exc.employee_name}</strong> ({exc.department_name})
                    </span>
                    <span>•</span>
                    <span>Flagged: {new Date(exc.flagged_at).toLocaleString()}</span>
                  </div>

                  {exc.resolution_notes && (
                    <div className="p-2.5 rounded-xl bg-gray-100 border border-gray-200 text-xs text-gray-700 mt-2">
                      <strong className="text-gray-900 block text-[10px] uppercase font-bold">
                        Resolution by {exc.resolved_by} ({exc.resolved_at ? new Date(exc.resolved_at).toLocaleDateString() : ''}):
                      </strong>
                      <p className="italic">{exc.resolution_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {exc.status === 'Open' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleResolve(exc)}
                    className="px-4 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve Exception</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
