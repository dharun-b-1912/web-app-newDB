import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ShieldCheck, AlertTriangle, CheckCircle2, UserX, FileCheck, ArrowRight } from 'lucide-react';

export interface DataQualityHealth {
  completionRatePct: number;
  totalEmployees: number;
  missingManagerCount: number;
  missingDeptCount: number;
  missingPhoneCount: number;
  missingEmergencyCount: number;
  incompleteProfileCount: number;
}

export interface WorkforceAlertItem {
  id: string;
  title: string;
  severity: 'Critical' | 'Warning' | 'Info';
  affectedCount: number;
  actionLabel: string;
  actionRoute: string;
}

interface Props {
  dataHealth: DataQualityHealth;
  alerts: WorkforceAlertItem[];
  onNavigate: (route: string) => void;
}

export const WorkforceAttentionAndDataQuality: React.FC<Props> = ({
  dataHealth,
  alerts,
  onNavigate,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Employee Data Health */}
      <Card className="lg:col-span-6 p-6 space-y-4 border border-gray-100 shadow-sm bg-white">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              Employee Master Data Quality
            </h3>
            <p className="text-xs text-gray-500">
              Profile completeness and mandatory organizational field audits.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-emerald-700">{dataHealth.completionRatePct}%</span>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Health Score</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div
            onClick={() => onNavigate('people')}
            className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors space-y-1"
          >
            <span className="text-[11px] font-bold text-gray-600 block">Missing Manager</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-lg font-black ${dataHealth.missingManagerCount > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                {dataHealth.missingManagerCount}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">unassigned</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('people')}
            className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors space-y-1"
          >
            <span className="text-[11px] font-bold text-gray-600 block">Missing Emergency</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-lg font-black ${dataHealth.missingEmergencyCount > 0 ? 'text-rose-700' : 'text-gray-900'}`}>
                {dataHealth.missingEmergencyCount}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">incomplete</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('people')}
            className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors space-y-1"
          >
            <span className="text-[11px] font-bold text-gray-600 block">Missing Phone</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-gray-900">
                {dataHealth.missingPhoneCount}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">unreachable</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('people')}
            className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors space-y-1"
          >
            <span className="text-[11px] font-bold text-gray-600 block">Complete Profiles</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-emerald-800">
                {dataHealth.totalEmployees - dataHealth.incompleteProfileCount}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">100% verified</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Workforce Attention Alerts */}
      <Card className="lg:col-span-6 p-6 space-y-4 border border-gray-100 shadow-sm bg-white">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              Workforce Operational Attention
            </h3>
            <p className="text-xs text-gray-500">
              Rule-based alerts requiring administrative or management intervention.
            </p>
          </div>
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>

        <div className="space-y-2.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-white flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={alert.severity === 'Critical' ? 'danger' : 'amber'} size="xs">
                    {alert.severity}
                  </Badge>
                  <span className="font-bold text-gray-900 truncate">{alert.title}</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Affects <span className="font-semibold text-gray-800">{alert.affectedCount} employees</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate(alert.actionRoute)}
                className="text-xs font-bold text-[#07563D] hover:underline flex items-center gap-1 flex-shrink-0"
              >
                {alert.actionLabel} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
