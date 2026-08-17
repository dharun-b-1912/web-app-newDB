// src/features/platform/components/tenants/CustomerWorkspaceHeader.tsx
// ============================================================
// WorkForceOS — Customer Workspace Header & Business KPI Area
// ============================================================

import React, { useState } from 'react';
import {
  Building2,
  Shield,
  ShieldAlert,
  ArrowLeft,
  Edit,
  MoreVertical,
  Activity,
  HeartPulse,
  Users,
  CreditCard,
  Calendar,
  Clock,
  Sparkles,
  Lock,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/utils';

export interface CustomerWorkspaceHeaderProps {
  organization: OrganizationRecord;
  onBackToList: () => void;
  onEditCustomer: () => void;
  onChangePlan: () => void;
  onSuspendCustomer: (reason: string) => Promise<void>;
  onReactivateCustomer: (reason: string) => Promise<void>;
  onAccessAccount: (mode: 'read-only' | 'full-support') => void;
  activeImpersonation?: { mode: string; expiresIn: string } | null;
  onExitImpersonation?: () => void;
}

export const CustomerWorkspaceHeader: React.FC<CustomerWorkspaceHeaderProps> = ({
  organization: org,
  onBackToList,
  onEditCustomer,
  onChangePlan,
  onSuspendCustomer,
  onReactivateCustomer,
  onAccessAccount,
  activeImpersonation,
  onExitImpersonation,
}) => {
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('Payment delinquency / Commercial review required');
  const [reactivateReason, setReactivateReason] = useState('Account verified & commercial balance settled');
  const [accessMode, setAccessMode] = useState<'read-only' | 'full-support'>('read-only');

  const isSuspended = org.status === 'Suspended';
  const isHealthy = org.health_grade === 'Healthy';

  // Format Renewal Date cleanly
  const formattedRenewal = org.renewal_date
    ? new Date(org.renewal_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not Scheduled';

  return (
    <div className="space-y-4">
      {/* ----------------------------------------------------
          1. IMPERSONATION / DIAGNOSTIC BANNER (IF ACTIVE)
         ---------------------------------------------------- */}
      {activeImpersonation && (
        <div className="bg-amber-50 border-2 border-amber-400 text-amber-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 animate-pulse" />
            <div>
              <span className="font-bold text-xs uppercase tracking-wider">Active Customer Access:</span>{' '}
              <strong className="text-sm text-amber-950">{org.legal_name}</strong>{' '}
              <span className="text-xs">({activeImpersonation.mode === 'read-only' ? 'Read-Only Diagnostic' : 'Support Admin Mode'})</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold bg-white/90 px-2.5 py-1 rounded-lg border border-amber-200">
              Expires in: {activeImpersonation.expiresIn}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onExitImpersonation}
              className="bg-amber-900 text-white border-transparent hover:bg-amber-950 text-xs font-bold"
            >
              Exit Access
            </Button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          2. TOP BREADCRUMB & PRIMARY ACTION TOOLBAR
         ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBackToList}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>

        <div className="flex items-center gap-2 relative">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditCustomer}
            className="text-xs font-bold border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5 text-gray-500" />
            Edit Customer
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAccessModal(true)}
            className="text-xs font-bold border-emerald-200 text-[#047857] bg-emerald-50/50 hover:bg-emerald-50 flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            Access Account
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onChangePlan}
            className="text-xs font-bold border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Change Plan
          </Button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isActionsMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-40 text-xs animate-in fade-in">
                {isSuspended ? (
                  <button
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      setShowReactivateModal(true);
                    }}
                    className="w-full px-4 py-2.5 text-left font-bold text-[#047857] hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reactivate Customer
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      setShowSuspendModal(true);
                    }}
                    className="w-full px-4 py-2.5 text-left font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    Suspend Customer
                  </button>
                )}
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    onEditCustomer();
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-gray-400" />
                  Edit Profile & Tax IDs
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          3. COMPANY IDENTITY HERO BANNER
         ---------------------------------------------------- */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#047857] flex items-center justify-center font-bold text-xl shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{org.legal_name}</h1>
                <span
                  className={cn(
                    'text-[11px] font-bold px-2.5 py-0.5 rounded-full border',
                    org.status === 'Active'
                      ? 'bg-emerald-50 text-[#047857] border-emerald-200'
                      : org.status === 'Trial'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  )}
                >
                  {org.status}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {org.plan} Plan
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {org.billing_status}
                </span>
              </div>

              {/* Subtitle Metas */}
              <div className="flex items-center gap-4 text-xs text-gray-500 font-medium mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 font-mono text-gray-700">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  {org.domain}
                </span>
                <span>•</span>
                <span>{org.industry}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {org.city}, {org.country}
                </span>
                <span>•</span>
                <span>Owner: <strong className="text-gray-800">{org.account_owner_name}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0">
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Contract Value</div>
            <div className="text-2xl font-bold font-mono text-gray-900">{org.mrr_formatted} <span className="text-xs text-gray-400 font-sans font-medium">/{org.billing_cycle.toLowerCase()}</span></div>
          </div>
        </div>

        {/* ----------------------------------------------------
            4. SIX BUSINESS KPI CARDS
           ---------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-gray-100">
          {/* 1. Health */}
          <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <HeartPulse className="w-3 h-3 text-emerald-600" /> Health
            </span>
            <div className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <span>{org.health_score}</span>
              <span className="text-xs font-normal text-gray-400">/ 100</span>
              <span className={cn('text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-auto', isHealthy ? 'bg-emerald-100 text-[#047857]' : 'bg-amber-100 text-amber-800')}>
                {org.health_grade}
              </span>
            </div>
          </div>

          {/* 2. Active Users */}
          <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-600" /> Active Users
            </span>
            <div className="text-base font-bold text-gray-900">
              {org.active_employees} <span className="text-xs font-normal text-gray-400">/ {org.seat_limit}</span>
            </div>
          </div>

          {/* 3. Seat Usage */}
          <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3 text-purple-600" /> Seat Usage
            </span>
            <div className="text-base font-bold text-gray-900 font-mono">
              {org.seat_utilization_pct}% <span className="text-[10px] font-sans text-emerald-600 font-bold ml-1">Normal</span>
            </div>
          </div>

          {/* 4. Monthly Revenue */}
          <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-emerald-600" /> Revenue (MRR)
            </span>
            <div className="text-base font-bold text-gray-900 font-mono">
              ₹{org.mrr.toLocaleString('en-IN')}
            </div>
          </div>

          {/* 5. Last Activity */}
          <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-500" /> Last Activity
            </span>
            <div className="text-xs font-bold text-gray-900 truncate">
              {org.last_activity_time}
            </div>
          </div>

          {/* 6. Next Renewal */}
          <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-600" /> Next Renewal
            </span>
            <div className="text-xs font-bold text-gray-900">
              {formattedRenewal}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          SUSPEND CUSTOMER MODAL
         ---------------------------------------------------- */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">Suspend Customer Access?</h3>
            </div>
            <p className="text-xs text-gray-600">
              Suspending <strong>{org.legal_name}</strong> will immediately disable user access to the employee portal and HRMS apps. Existing database records and subscriptions remain preserved.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Suspension *</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-gray-50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowSuspendModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={async () => {
                  setShowSuspendModal(false);
                  await onSuspendCustomer(suspendReason);
                }}
              >
                Suspend Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          REACTIVATE CUSTOMER MODAL
         ---------------------------------------------------- */}
      {showReactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3 text-[#047857]">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">Reactivate Customer Account</h3>
            </div>
            <p className="text-xs text-gray-600">
              Reactivating <strong>{org.legal_name}</strong> will restore immediate login access for all {org.active_employees} staff members.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Reactivation Notes</label>
              <input
                type="text"
                value={reactivateReason}
                onChange={(e) => setReactivateReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-gray-50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowReactivateModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#047857] hover:bg-[#036246] text-white font-bold"
                onClick={async () => {
                  setShowReactivateModal(false);
                  await onReactivateCustomer(reactivateReason);
                }}
              >
                Reactivate Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          ACCESS CUSTOMER ACCOUNT MODAL
         ---------------------------------------------------- */}
      {showAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3 text-[#047857]">
              <Shield className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900">Access Customer Account</h3>
            </div>
            <p className="text-xs text-gray-600">
              Initiate temporary administrative access to <strong>{org.legal_name}</strong> for customer support and troubleshooting. All actions are logged to the forensic audit trail.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Access Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccessMode('read-only')}
                  className={cn(
                    'p-3 rounded-xl border text-left font-bold text-xs cursor-pointer transition',
                    accessMode === 'read-only' ? 'border-[#047857] bg-emerald-50 text-[#047857]' : 'border-gray-200 text-gray-600'
                  )}
                >
                  <div>Read-Only</div>
                  <span className="text-[10px] font-normal text-gray-500">Diagnostic inspection</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccessMode('full-support')}
                  className={cn(
                    'p-3 rounded-xl border text-left font-bold text-xs cursor-pointer transition',
                    accessMode === 'full-support' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                  )}
                >
                  <div>Full Support</div>
                  <span className="text-[10px] font-normal text-gray-500">Operational mutations</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAccessModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#047857] hover:bg-[#036246] text-white font-bold"
                onClick={() => {
                  setShowAccessModal(false);
                  onAccessAccount(accessMode);
                }}
              >
                Start Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
