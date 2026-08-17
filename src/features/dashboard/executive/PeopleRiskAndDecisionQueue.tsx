import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  ShieldAlert,
  AlertCircle,
  FileCheck2,
  ArrowUpRight,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { StrategicDecisionItem } from '../../../services/executiveAnalyticsService';

interface Props {
  decisions: StrategicDecisionItem[];
  criticalRisksCount: number;
  onNavigate: (route: string) => void;
}

export const PeopleRiskAndDecisionQueue: React.FC<Props> = ({
  decisions,
  criticalRisksCount,
  onNavigate,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. People Risk & Statutory Compliance Matrix */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-rose-900 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                People Risk & Statutory Compliance
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                Unresolved labor compliance, statutory info gaps & risk exposure
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                criticalRisksCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {criticalRisksCount > 0 ? `${criticalRisksCount} Action Items` : 'All Compliant'}
            </span>
          </div>

          <div className="space-y-2.5">
            {criticalRisksCount === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-emerald-900 font-medium">
                  Zero critical labor law or statutory compliance breaches identified across all active entities.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-rose-800 uppercase">Critical Risk</span>
                    <p className="font-bold text-gray-900">
                      {criticalRisksCount} employees missing supervisor hierarchy assignment
                    </p>
                    <p className="text-[11px] text-gray-500">Affects leave approval routing & performance sign-offs</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onNavigate('people')}
                    className="text-xs font-bold text-rose-800 bg-white border-rose-200 hover:bg-rose-50 flex-shrink-0"
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Statutory KYC</span>
                <p className="font-bold text-gray-800">100% PAN / UAN Mapped</p>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase">POSH Training</span>
                <p className="font-bold text-gray-800">Annual Audit Ready</p>
              </div>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => onNavigate('compliance')}
          className="w-full text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 justify-center mt-2"
        >
          View Full Statutory Compliance Audit
          <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </Card>

      {/* 2. Decisions Requiring HR Leadership */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-purple-900 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Decisions Requiring HR Leadership
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                Strategic escalations, hiring authorizations & policy exceptions
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
              Executive Action Desk
            </span>
          </div>

          <div className="space-y-2.5">
            {decisions.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                No strategic executive decisions pending leadership sign-off.
              </div>
            ) : (
              decisions.map((dec) => (
                <div
                  key={dec.id}
                  className="p-3 rounded-xl border border-purple-100 bg-purple-50/20 hover:bg-purple-50/40 transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          dec.priority === 'Critical'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {dec.priority}
                      </span>
                      <span className="text-[10px] font-bold text-purple-700">{dec.impactCategory}</span>
                    </div>
                    <p className="font-bold text-gray-900 truncate">{dec.decisionTitle}</p>
                    <p className="text-[11px] text-gray-500">Owner: {dec.owner}</p>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onNavigate(dec.actionRoute)}
                    className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold px-3 flex-shrink-0"
                  >
                    Action
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
          <span>Authority Level: HR Head & CPO</span>
          <span>SLA Target: 24 Hours</span>
        </div>
      </Card>
    </div>
  );
};
