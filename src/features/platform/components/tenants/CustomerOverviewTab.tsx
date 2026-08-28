// src/features/platform/components/tenants/CustomerOverviewTab.tsx
// ============================================================
// Joy PeopleHR — Customer Overview Executive Summary Tab
// ============================================================

import React from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Layers,
  HeartPulse,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  ExternalLink,
  Edit,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/utils';

export interface CustomerOverviewTabProps {
  organization: OrganizationRecord;
  onNavigateTab: (tab: string) => void;
  onEditCustomer: () => void;
  onChangePlan: () => void;
}

export const CustomerOverviewTab: React.FC<CustomerOverviewTabProps> = ({
  organization: org,
  onNavigateTab,
  onEditCustomer,
  onChangePlan,
}) => {
  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------
          1. NEEDS ATTENTION / COMMAND ALERT STRIP (IF APPLICABLE)
         ---------------------------------------------------- */}
      {org.seat_utilization_pct > 85 && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <strong className="text-xs text-amber-900 font-bold block">Capacity Approaching Limit</strong>
              <p className="text-[11px] text-amber-800">
                {org.legal_name} is utilizing {org.seat_utilization_pct}% of total seats ({org.active_employees}/{org.seat_limit} seats allocated).
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onChangePlan}
            className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            Expand Capacity
          </Button>
        </div>
      )}

      {/* ----------------------------------------------------
          2. TWO-COLUMN EXECUTIVE GRID
         ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 2 Spans (Profile & Usage & Activity) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Profile Card */}
          <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#047857]" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Customer Profile</h3>
              </div>
              <Button variant="outline" size="sm" onClick={onEditCustomer} className="text-xs font-bold h-7">
                <Edit className="w-3 h-3 mr-1 text-gray-400" /> Edit Profile
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block">Company Legal Name</span>
                <strong className="text-gray-900 font-medium">{org.legal_name}</strong>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block">Brand Display Name</span>
                <strong className="text-gray-900 font-medium">{org.display_name}</strong>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block">Primary Web Domain</span>
                <span className="font-mono text-gray-900">{org.domain}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block">Industry Vertical</span>
                <span className="text-gray-900">{org.industry}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block">Location & Timezone</span>
                <span className="text-gray-900">{org.city}, {org.country} ({org.timezone})</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block">Billing Currency</span>
                <span className="font-medium text-gray-900">{org.currency}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block">GSTIN / Tax ID</span>
                <span className={cn('font-mono', org.gstin ? 'text-gray-900' : 'text-gray-400 italic')}>
                  {org.gstin || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block">Primary Administrator</span>
                <span className="text-gray-900">{org.primary_admin_name} ({org.primary_admin_email})</span>
              </div>
            </div>
          </div>

          {/* Usage Snapshot Card */}
          <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Capacity & Usage Snapshot</h3>
              </div>
              <button
                onClick={() => onNavigateTab('usage')}
                className="text-xs font-bold text-[#047857] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Detailed Quotas <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Seats Usage Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-700">Seat Allocation</span>
                  <span className="font-mono text-gray-900">{org.active_employees} / {org.seat_limit} Seats ({org.seat_utilization_pct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      org.seat_utilization_pct > 85 ? 'bg-amber-500' : 'bg-[#047857]'
                    )}
                    style={{ width: `${Math.min(100, org.seat_utilization_pct)}%` }}
                  />
                </div>
              </div>

              {/* Cloud Storage Usage Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-700">Document Cloud Storage</span>
                  <span className="font-mono text-gray-900">{org.storage_used_gb} GB / {org.storage_quota_gb} GB ({Math.round((org.storage_used_gb / org.storage_quota_gb) * 100)}%)</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${Math.min(100, Math.round((org.storage_used_gb / org.storage_quota_gb) * 100))}%` }}
                  />
                </div>
              </div>

              {/* API Calls Metas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">API Volume (Month)</span>
                  <strong className="font-mono text-gray-900 text-sm">{org.api_calls_this_month.toLocaleString()} calls</strong>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Attendance Adoption</span>
                  <strong className="text-emerald-700 text-sm">{org.attendance_usage_pct}% active</strong>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Payroll Processing</span>
                  <strong className="text-purple-700 text-sm">{org.payroll_usage_pct}% automated</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Real Activities */}
          <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recent Account Activity</h3>
              </div>
              <button
                onClick={() => onNavigateTab('activity')}
                className="text-xs font-bold text-[#047857] hover:underline flex items-center gap-1 cursor-pointer"
              >
                View Full Ledger <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {org.activity_log.slice(0, 3).map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-[#047857] mt-1.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{act.event}</p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium mt-0.5">
                      <span>{act.actor}</span>
                      <span>•</span>
                      <span>{act.timestamp}</span>
                      <span>•</span>
                      <span className="bg-gray-100 px-1.5 py-0.2 rounded text-gray-600 font-normal">{act.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: 1 Span (Commercials & Quick Actions) */}
        <div className="space-y-6">
          {/* Subscription Summary Card */}
          <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#047857]" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Subscription</h3>
              </div>
              <button
                onClick={() => onNavigateTab('subscription')}
                className="text-xs font-bold text-[#047857] hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Tier:</span>
                <strong className="text-purple-700 font-bold">{org.plan} Plan</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Billing Cycle:</span>
                <strong className="text-gray-900">{org.billing_cycle}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Monthly Rate:</span>
                <strong className="font-mono text-gray-900">₹{org.mrr.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Auto-Renewal:</span>
                <span className="text-emerald-700 font-bold">{org.auto_renew ? 'Active' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Renewal Date:</span>
                <strong className="text-gray-900">{org.renewal_date || 'In 30 days'}</strong>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={onChangePlan}
              className="w-full bg-[#047857] hover:bg-[#036246] text-white font-bold text-xs shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Change Subscription Plan
            </Button>
          </div>

          {/* Billing & Settlement Snapshot */}
          <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Billing Status</h3>
              </div>
              <button
                onClick={() => onNavigateTab('billing')}
                className="text-xs font-bold text-[#047857] hover:underline cursor-pointer"
              >
                Invoices
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Payment Health:</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#047857] border border-emerald-200">
                  {org.billing_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Outstanding Balance:</span>
                <strong className="font-mono text-emerald-700 font-bold">₹0.00</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Settled Invoice:</span>
                <strong className="font-mono text-gray-900">INV-2026-000001</strong>
              </div>
            </div>
          </div>

          {/* Quick Actions Toolbox */}
          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-200 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Quick Actions</h4>
            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('people')}
                className="w-full px-3.5 py-2.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 font-bold text-xs text-left text-gray-800 transition flex items-center justify-between cursor-pointer"
              >
                <span>+ Invite Organization User</span>
                <Users className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => onNavigateTab('support')}
                className="w-full px-3.5 py-2.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 font-bold text-xs text-left text-gray-800 transition flex items-center justify-between cursor-pointer"
              >
                <span>Create Support Ticket</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => onNavigateTab('integrations')}
                className="w-full px-3.5 py-2.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 font-bold text-xs text-left text-gray-800 transition flex items-center justify-between cursor-pointer"
              >
                <span>Manage Connected Integrations</span>
                <Layers className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
