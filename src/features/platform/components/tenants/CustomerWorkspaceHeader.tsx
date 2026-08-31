// src/features/platform/components/tenants/CustomerWorkspaceHeader.tsx
// ============================================================
// Joy PeopleHR — Customer Organization Executive Header & Actions
// ============================================================

import React, { useState } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Layers,
  HeartPulse,
  Activity,
  ArrowLeft,
  Edit,
  Shield,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronDown,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  LogOut,
  Clock,
  MapPin,
  CheckCircle2,
  MoreHorizontal,
  FileText,
  Lock,
  Trash2,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { SupportAccessSession } from '../../../../services/platform/platformSupportAccessService';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/utils';

export interface CustomerWorkspaceHeaderProps {
  organization: OrganizationRecord;
  onBackToList: () => void;
  onEditCustomer: () => void;
  onChangePlan: () => void;
  onSuspendCustomer: (reason: string) => Promise<void>;
  onReactivateCustomer: (reason: string) => Promise<void>;
  onAccessAccount: () => void;
  onDeleteCustomer?: () => Promise<void>;
  activeSupportSession?: SupportAccessSession | null;
  onExitSupportSession?: () => void;
}

export const CustomerWorkspaceHeader: React.FC<CustomerWorkspaceHeaderProps> = ({
  organization: org,
  onBackToList,
  onEditCustomer,
  onChangePlan,
  onSuspendCustomer,
  onReactivateCustomer,
  onAccessAccount,
  onDeleteCustomer,
  activeSupportSession,
  onExitSupportSession,
}) => {
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('Payment issue');
  const [suspensionCustomNote, setSuspensionCustomNote] = useState('');
  const [reactivationNote, setReactivationNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const isSuspended = org.status === 'Suspended';

  const handleConfirmSuspend = async () => {
    setIsProcessing(true);
    try {
      const finalReason = suspensionReason === 'Other' ? (suspensionCustomNote || 'Administrative suspension') : suspensionReason;
      await onSuspendCustomer(finalReason);
      setShowSuspendModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReactivate = async () => {
    setIsProcessing(true);
    try {
      await onReactivateCustomer(reactivationNote || 'Account reactivated by Platform Admin');
      setShowReactivateModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ----------------------------------------------------
          TOP BREADCRUMB & PRIMARY ACTION TOOLBAR
         ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBackToList}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizations & Customers</span>
        </button>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 relative">
          {/* 1. Access Customer Account */}
          <Button
            variant="outline"
            size="sm"
            onClick={onAccessAccount}
            className="border-amber-300 bg-amber-50/60 hover:bg-amber-100/80 text-amber-900 font-bold text-xs shadow-xs"
          >
            <Shield className="w-3.5 h-3.5 mr-1.5 text-amber-700" />
            Access Customer Account
          </Button>

          {/* 2. Edit Organization */}
          <Button
            variant="outline"
            size="sm"
            onClick={onEditCustomer}
            className="border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs"
          >
            <Edit className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            Edit Organization
          </Button>

          {/* 3. More Dropdown / Suspend / Reactivate */}
          <div className="relative">
            {isSuspended ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowReactivateModal(true)}
                className="bg-[#047857] hover:bg-[#036246] text-white font-bold text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reactivate Customer
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 z-40 text-xs animate-in fade-in space-y-1">
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowSuspendModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-amber-700 hover:bg-amber-50 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Suspend Customer</span>
                    </button>
                    {onDeleteCustomer && (
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          if (window.confirm(`Are you sure you want to permanently delete "${org.legal_name}" (${org.id}) from the platform and Supabase?`)) {
                            onDeleteCustomer();
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Organization</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          COMPANY IDENTITY HERO CARD
         ---------------------------------------------------- */}
      <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#047857] to-[#036246] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              {org.legal_name.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{org.legal_name}</h1>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                    isSuspended
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-[#047857] border-emerald-200'
                  )}
                >
                  ● {isSuspended ? 'SUSPENDED' : 'Active'}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {org.plan} Plan
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
                <span className="font-mono text-gray-700">{org.domain}</span>
                <span>•</span>
                <span>{org.industry}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {org.city}, {org.country}
                </span>
                <span>•</span>
                <span>Primary Admin: <strong className="text-gray-900">{org.primary_admin_name || 'Admin'}</strong></span>
                {org.primary_admin_email && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-gray-600">{org.primary_admin_email}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------
            6 BUSINESS KPI TILES
           ---------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-gray-100">
          {/* KPI 1: Health */}
          <div className="p-3 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Customer Health</span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-[#047857] font-mono">{org.health_score}/100</span>
              <span className="text-[10px] font-bold text-[#047857] bg-emerald-100 px-1.5 py-0.2 rounded">
                {org.health_grade}
              </span>
            </div>
          </div>

          {/* KPI 2: Active Users */}
          <div className="p-3 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Users</span>
            <div className="text-lg font-bold text-gray-900 font-mono">
              {org.active_employees} <span className="text-xs text-gray-400 font-normal">/ {org.seat_limit}</span>
            </div>
          </div>

          {/* KPI 3: Seat Usage */}
          <div className="p-3 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Seat Usage</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 font-mono">{org.seat_utilization_pct}%</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', org.seat_utilization_pct > 85 ? 'bg-amber-500' : 'bg-[#047857]')}
                  style={{ width: `${Math.min(100, org.seat_utilization_pct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* KPI 4: Monthly Revenue */}
          <div className="p-3 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Monthly Revenue (MRR)</span>
            <div className="text-lg font-bold font-mono text-gray-900">{org.mrr_formatted}</div>
          </div>

          {/* KPI 5: Last Activity */}
          <div className="p-3 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Last Activity</span>
            <div className="text-xs font-bold text-gray-800 truncate" title={org.last_activity_event}>
              {org.last_activity_time}
            </div>
          </div>

          {/* KPI 6: Next Renewal */}
          <div className="p-3 bg-gray-50/70 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Next Renewal</span>
            <div className="text-xs font-bold text-gray-800">{org.renewal_date || 'In 30 days'}</div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          SUSPEND CUSTOMER CONFIRMATION MODAL
         ---------------------------------------------------- */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in text-xs">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="p-2.5 bg-rose-50 rounded-2xl text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Suspend Customer?</h3>
                <p className="text-xs text-gray-500 font-semibold">{org.legal_name}</p>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed">
              Suspending this customer will temporarily disable login access and external API integrations. <strong>Customer records, subscriptions, payroll data and invoices will remain strictly preserved.</strong>
            </p>

            {/* Impact Checklist */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <span className="font-bold text-gray-900 block">Affected Areas:</span>
              <div className="grid grid-cols-2 gap-2 text-gray-600">
                <div className="flex items-center gap-1.5"><span className="text-rose-500">✕</span> Customer Login</div>
                <div className="flex items-center gap-1.5"><span className="text-rose-500">✕</span> Web & Mobile Apps</div>
                <div className="flex items-center gap-1.5"><span className="text-rose-500">✕</span> API Keys Access</div>
                <div className="flex items-center gap-1.5"><span className="text-rose-500">✕</span> External Webhooks</div>
              </div>
            </div>

            {/* Reason Selector */}
            <div className="space-y-2">
              <label className="block font-bold text-gray-700">Suspension Reason *</label>
              <select
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-semibold text-gray-800"
              >
                <option value="Payment issue">Payment issue / Overdue invoice</option>
                <option value="Customer request">Customer request (Temporary hiatus)</option>
                <option value="Security concern">Security concern / Anomalous traffic</option>
                <option value="Contract ended">Contract ended / Non-renewal</option>
                <option value="Policy violation">Policy violation</option>
                <option value="Operational issue">Operational issue</option>
                <option value="Other">Other (Specify below)</option>
              </select>

              {suspensionReason === 'Other' && (
                <input
                  type="text"
                  required
                  placeholder="Detailed administrative explanation..."
                  value={suspensionCustomNote}
                  onChange={(e) => setSuspensionCustomNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setShowSuspendModal(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isProcessing}
                onClick={handleConfirmSuspend}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isProcessing ? 'Suspending...' : 'Suspend Customer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          REACTIVATE CUSTOMER CONFIRMATION MODAL
         ---------------------------------------------------- */}
      {showReactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in text-xs">
            <h3 className="text-base font-bold text-gray-900">Reactivate {org.legal_name}?</h3>
            <p className="text-gray-600 leading-relaxed">
              Customer users will immediately regain ability to sign in and all eligible customer services will be restored.
            </p>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Activation Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Payment verified; resuming full service"
                value={reactivationNote}
                onChange={(e) => setReactivationNote(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setShowReactivateModal(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isProcessing}
                onClick={handleConfirmReactivate}
                className="bg-[#047857] hover:bg-[#036246] text-white font-bold"
              >
                {isProcessing ? 'Reactivating...' : 'Reactivate Customer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
