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
} from 'lucide-react';

export const LeaveExceptionsView: React.FC = () => {
  const [exceptions, setExceptions] = useState<LeaveException[]>([]);

  useEffect(() => {
    setExceptions(leaveApi.getExceptions());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-700" />
            <span>Leave Exceptions & Risk Monitoring</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time flags for staffing threshold breaches, overlapping leave requests, and unapproved absences
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 self-start sm:self-auto">
          {exceptions.filter(e => e.status === 'Open').length} Open Risk Flags
        </span>
      </div>

      {/* Exceptions Grid */}
      <div className="space-y-3">
        {exceptions.map(exc => (
          <div
            key={exc.id}
            className={`p-5 rounded-2xl border bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              exc.severity === 'High' ? 'border-rose-200' : 'border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`p-2.5 rounded-xl ${exc.severity === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={exc.severity === 'High' ? 'rose' : 'amber'} size="sm">
                    {exc.severity} Severity
                  </Badge>
                  <span className="text-xs font-mono font-bold text-gray-800">{exc.type}</span>
                </div>
                <h3 className="text-sm font-extrabold text-gray-900 mt-1">{exc.title}</h3>
                <p className="text-xs text-gray-600 mt-0.5">{exc.description}</p>
                <div className="mt-2 text-[11px] text-gray-400 font-mono">
                  Employee: {exc.employee_name} ({exc.department_name}) • Flagged: {new Date(exc.flagged_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  alert(`Exception #${exc.id} resolved by HR Admin.`);
                  setExceptions(prev => prev.filter(e => e.id !== exc.id));
                }}
                className="px-4 py-2 rounded-xl bg-[#07563D] text-white text-xs font-bold hover:bg-[#05402e]"
              >
                Resolve Exception
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
