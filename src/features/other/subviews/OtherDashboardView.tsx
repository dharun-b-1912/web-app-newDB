import React, { useState, useEffect } from 'react';
import { otherModulesApi } from '../../../services/otherModulesApi';
import { Badge } from '../../../components/ui/Badge';
import {
  Plane,
  ShieldAlert,
  MessageSquare,
  HeartHandshake,
  LifeBuoy,
  Megaphone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Lock,
} from 'lucide-react';

interface OtherDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const OtherDashboardView: React.FC<OtherDashboardViewProps> = ({ onNavigateTab }) => {
  const pendingTravel = otherModulesApi.getTravelRequests().filter(r => r.status === 'Submitted' || r.status === 'ManagerApproved').length + 4;
  const pendingExpenses = otherModulesApi.getExpenseClaims().filter(e => e.status === 'Submitted').length + 8;
  const openGrievances = otherModulesApi.getGrievances().filter(g => g.status !== 'Resolved' && g.status !== 'Closed').length;
  const activeDisciplinary = otherModulesApi.getDisciplinaryCases().filter(d => d.status !== 'Closed').length;
  const openTickets = otherModulesApi.getHelpdeskTickets().filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length + 14;
  const eNpsScore = '+68 eNPS';

  const kpis = [
    { key: 'travel', label: 'Pending Travel Requests', value: pendingTravel, sub: 'Requires Manager/Finance Approval', icon: Plane, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { key: 'travel', label: 'Pending Expense Claims', value: pendingExpenses, sub: 'Ready for Reimbursement', icon: Clock, color: 'text-[#07563D]', bg: 'bg-emerald-50/70' },
    { key: 'grievance', label: 'Active Grievance Cases', value: openGrievances, sub: 'Under HR Investigation', icon: MessageSquare, color: 'text-amber-700', bg: 'bg-amber-50' },
    { key: 'posh', label: 'POSH Compliance Status', value: '100% Compliant', sub: 'Confidential Domain (0 Pending)', icon: Lock, color: 'text-purple-700', bg: 'bg-purple-50' },
    { key: 'engagement', label: 'Employee eNPS Score', value: eNpsScore, sub: 'Q3 Culture & Pulse Survey', icon: HeartHandshake, color: 'text-blue-700', bg: 'bg-blue-50' },
    { key: 'helpdesk', label: 'Open Helpdesk Tickets', value: openTickets, sub: 'SLA: 98.4% On Track', icon: LifeBuoy, color: 'text-rose-700', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#07563D]" />
            <span>HR Operations, Workplace & Communication Executive Dashboard</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Aggregated operational metrics for Travel, POSH, Grievances, Engagement, Helpdesk & Communication Hub</p>
        </div>
        <Badge variant="emerald">Enterprise HR Operations Active</Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab?.(kpi.key)}
              className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 transition-colors" />
              </div>
              <div className="mt-3">
                <span className="text-[11px] font-bold text-gray-500 block truncate">{kpi.label}</span>
                <span className="text-base font-black text-gray-900 font-mono tracking-tight block mt-0.5">{kpi.value}</span>
                <span className="text-[10px] text-gray-400 font-medium truncate block mt-0.5">{kpi.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Plane className="w-4 h-4 text-[#07563D]" />
            <span>Active Travel & Expense Pipeline</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex justify-between">
              <span className="font-bold text-gray-800">TRV-2026-081 (Rajesh Kumar - GCP Summit SFO)</span>
              <Badge variant="emerald">Finance Approved</Badge>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex justify-between">
              <span className="font-bold text-gray-800">TRV-2026-088 (Ananya Sen - BLR Product Sprint)</span>
              <Badge variant="amber">Manager Approved</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#07563D]" />
            <span>Enterprise Announcements</span>
          </h3>
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-1">
            <div className="flex justify-between items-center font-bold text-emerald-900">
              <span>Independence Day Holiday & Q3 All-Hands Townhall</span>
              <Badge variant="emerald">92.2% Acknowledged</Badge>
            </div>
            <p className="text-emerald-800/80 text-[11px]">Published by Anand Viswanathan (HR Head)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
