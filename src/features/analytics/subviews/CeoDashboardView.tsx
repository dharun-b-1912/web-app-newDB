import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Sparkles, TrendingUp, ShieldAlert, Award, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const CeoDashboardView: React.FC = () => {
  const executiveMetrics = [
    { label: 'Total Enterprise Workforce', val: '428', sub: '+8.4% YoY Growth' },
    { label: 'Annual Attrition Index', val: '4.2%', sub: 'Healthy Retention' },
    { label: 'Cost Per Employee', val: '₹1,36,800', sub: 'Monthly All-inclusive' },
    { label: 'Time to Hire', val: '22 Days', sub: '14 Open Positions' },
    { label: 'Attendance Rate', val: '96.4%', sub: 'High Productivity' },
    { label: 'Mandatory Compliance', val: '97.2%', sub: 'POSH & InfoSec Certified' },
  ];

  const riskIndicators = [
    { area: 'Critical Roles Coverage', status: 'Healthy', details: '94% of Senior Lead roles have designated successors' },
    { area: 'Certification Expirations', status: 'Attention', details: '12 AWS/Security certifications expiring within 30 days' },
    { area: 'Overtime Spend Variance', status: 'On Track', details: 'Overtime expenditure within approved 3.5% budget limit' },
    { area: 'POSH Statutory Governance', status: 'Compliant', details: '0 pending complaints; ICC Annual Return filed' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#07563D]" />
            <span>Executive CEO Workforce & Productivity Dashboard</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">High-level executive metrics for headcount growth, workforce cost, retention & risk indicators</p>
        </div>
        <Badge variant="emerald">Executive View Only</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {executiveMetrics.map((m, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 block truncate">{m.label}</span>
            <span className="text-base font-black text-gray-900 font-mono tracking-tight block mt-1">{m.val}</span>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">{m.sub}</span>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#07563D]" />
          <span>Executive Risk & Governance Signals</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {riskIndicators.map((r, i) => (
            <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">{r.area}</span>
                <Badge variant={r.status === 'Healthy' || r.status === 'Compliant' || r.status === 'On Track' ? 'emerald' : 'amber'}>
                  {r.status}
                </Badge>
              </div>
              <p className="text-gray-500">{r.details}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
