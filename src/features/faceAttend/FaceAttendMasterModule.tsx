// src/features/faceAttend/FaceAttendMasterModule.tsx
// Tenant Subscription-Gated SaaS Command Center for JOY FaceAttend
import React, { useCallback, useEffect, useState } from 'react';
import {
  Camera,
  LayoutDashboard,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Settings,
  CreditCard,
  History,
  Lock,
  RefreshCw,
  Power,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { getPrimaryRole } from '../../lib/rbac/permissionEngine';
import { faceAttendEntitlementService } from '../../services/faceAttend/faceAttendEntitlementService';
import { faceAttendBillingService } from '../../services/faceAttend/faceAttendBillingService';
import { faceAttendService } from '../../services/faceAttend/faceAttendService';
import type {
  FaceAttendAttemptRecord,
  FaceAttendAuditLog,
  FaceAttendBillingSnapshot,
  FaceAttendEntitlement,
  FaceAttendExceptionReview,
  FaceAttendOrgSettings,
  FaceAttendSubscription,
  FaceAttendTemplateRecord,
} from '../../types/faceAttend';
import { FaceAttendOverviewTab } from './FaceAttendOverviewTab';
import { FaceAttendEnrolmentTab } from './FaceAttendEnrolmentTab';
import { FaceAttendAttemptsTab, FaceAttendExceptionsTab } from './FaceAttendOperationsTabs';
import {
  FaceAttendAuditTab,
  FaceAttendBillingTab,
  FaceAttendSettingsTab,
} from './FaceAttendAdminTabs';

interface FaceAttendMasterModuleProps {
  initialTab?: string;
  onNavigateTab?: (route: string) => void;
}

function resolveTab(route?: string): string {
  if (!route) return 'dashboard';
  const r = route.replace(/^\/?face-attend[-/]?/, '').toLowerCase();
  if (r === 'enrolment') return 'enrolment';
  if (r === 'attempts') return 'attempts';
  if (r === 'exceptions') return 'exceptions';
  if (r === 'settings') return 'settings';
  if (r === 'billing') return 'billing';
  if (r === 'audit') return 'audit';
  return 'dashboard';
}

export const FaceAttendMasterModule: React.FC<FaceAttendMasterModuleProps> = ({
  initialTab,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const { organization } = useTenant();
  const orgId =
    organization?.id || (user as any)?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
  const primaryRole = getPrimaryRole(user);
  const isPlatformSuperAdmin = primaryRole === 'Super Admin';
  const isAdmin = ['Super Admin', 'Organization Admin', 'Company Admin', 'HR Head', 'HR Admin'].includes(
    primaryRole
  );

  const [activeTab, setActiveTab] = useState(() => resolveTab(initialTab));
  const [entitlement, setEntitlement] = useState<FaceAttendEntitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [settings, setSettings] = useState<FaceAttendOrgSettings | null>(null);
  const [subscription, setSubscription] = useState<FaceAttendSubscription | null>(null);
  const [snapshots, setSnapshots] = useState<FaceAttendBillingSnapshot[]>([]);
  const [templates, setTemplates] = useState<FaceAttendTemplateRecord[]>([]);
  const [attempts, setAttempts] = useState<FaceAttendAttemptRecord[]>([]);
  const [exceptions, setExceptions] = useState<FaceAttendExceptionReview[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<FaceAttendAuditLog[]>([]);

  useEffect(() => {
    setActiveTab(resolveTab(initialTab));
  }, [initialTab]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const ent = await faceAttendEntitlementService.getEntitlement(orgId, true);
      setEntitlement(ent);

      if (!ent?.is_enabled) {
        return;
      }

      const [cfg, sub, snaps, tpls, atts, exs, locs, logs] = await Promise.all([
        faceAttendService.getSettings(orgId),
        faceAttendBillingService.getSubscription(orgId),
        faceAttendBillingService.listSnapshots(orgId),
        faceAttendService.listTemplates(orgId),
        faceAttendService.listAttempts(orgId),
        faceAttendService.listExceptionReviews(orgId),
        faceAttendService.listWorkLocations(orgId),
        faceAttendService.listAuditLogs(orgId),
      ]);

      setSettings(cfg);
      setSubscription(sub);
      setSnapshots(snaps);
      setTemplates(tpls);
      setAttempts(atts);
      setExceptions(exs);
      setLocations(locs);
      setAuditLogs(logs);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Realtime updates on attendance_daily, verification attempts, exceptions, and enrolments
  useEffect(() => {
    if (!entitlement?.is_enabled) return;
    return faceAttendService.subscribeToFaceAttendRealtime(orgId, () => {
      loadAll();
    });
  }, [orgId, entitlement?.is_enabled, loadAll]);

  const switchTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onNavigateTab) {
      onNavigateTab(tabId === 'dashboard' ? 'face-attend-dashboard' : `face-attend-${tabId}`);
    }
  };

  const handleToggleAddon = async (enable: boolean) => {
    const res = await faceAttendEntitlementService.setTenantEntitlement({
      organizationId: orgId,
      isEnabled: enable,
      updatedBy: user?.id,
    });
    if (res.ok) {
      showToast(enable ? 'JOY FaceAttend enabled for tenant.' : 'JOY FaceAttend disabled immediately.');
      await loadAll();
    } else {
      showToast(`Error: ${res.error}`);
    }
  };

  if (loading && !entitlement) {
    return (
      <div className="p-8 flex items-center justify-center text-sm text-gray-500 gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading JOY FaceAttend workspace...
      </div>
    );
  }

  // Subscription Gate Screen when module disabled for this tenant
  if (!entitlement?.is_enabled) {
    return (
      <div className="p-6 max-w-3xl mx-auto mt-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            JOY FaceAttend Add-On Is Currently Disabled
          </h2>
          <p className="text-sm text-gray-600 max-w-xl mx-auto">
            This organization does not currently have the <strong>JOY FaceAttend</strong> GPS + 1:1 Face &
            Liveness Attendance subscription enabled. Historical attendance records remain intact.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left text-xs text-gray-700 grid sm:grid-cols-2 gap-3 max-w-lg mx-auto">
            <div>
              <div className="font-bold text-gray-900">Basic Plan — ₹15 / emp / mo</div>
              <div>1:1 Face verification + GPS geofence check</div>
            </div>
            <div>
              <div className="font-bold text-emerald-700">Pro Plan — ₹25 / emp / mo</div>
              <div>Adds active liveness PAD, live feed & fallback desk</div>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => handleToggleAddon(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 cursor-pointer"
            >
              <Power className="w-4 h-4" /> Enable JOY FaceAttend Add-On
            </button>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Live Command', icon: LayoutDashboard },
    { id: 'enrolment', label: 'Enrolment & Consent', icon: UserCheck },
    { id: 'attempts', label: 'Attempts & Scores', icon: ShieldCheck },
    { id: 'exceptions', label: 'Exception Fallback', icon: AlertTriangle },
    ...(isAdmin
      ? [
          { id: 'settings', label: 'Policy & Geofences', icon: Settings },
          ...(isPlatformSuperAdmin
            ? [{ id: 'billing', label: 'Plan & Billing Snapshots', icon: CreditCard }]
            : []),
          { id: 'audit', label: 'Audit Trail', icon: History },
        ]
      : []),
  ];

  const activeEnrolledCount = templates.filter((t) => t.enrolment_status === 'ACTIVE').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">JOY FaceAttend Command Center</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Add-On Active &bull; {subscription?.plan_code || 'PRO'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              GPS + 1:1 Face Verification + Anti-Spoof Liveness SaaS Module &bull; Live Realtime Sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {isAdmin && (
            <button
              onClick={() => handleToggleAddon(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" /> Disable Add-On
            </button>
          )}
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && settings && (
        <FaceAttendOverviewTab
          settings={settings}
          subscription={subscription}
          templates={templates}
          attempts={attempts}
          exceptions={exceptions}
          onNavigateTab={switchTab}
        />
      )}

      {activeTab === 'enrolment' && (
        <FaceAttendEnrolmentTab
          templates={templates}
          subscription={subscription}
          isAdmin={isAdmin}
          onApprove={async (id) => {
            const res = await faceAttendService.updateTemplateDecision({
              organizationId: orgId,
              templateId: id,
              action: 'APPROVE',
              actorUserId: user?.id,
            });
            showToast(res.ok ? 'Enrolment approved.' : `Failed: ${res.error}`);
            await loadAll();
          }}
          onReject={async (id, reason) => {
            const res = await faceAttendService.updateTemplateDecision({
              organizationId: orgId,
              templateId: id,
              action: 'REJECT',
              reason,
              actorUserId: user?.id,
            });
            showToast(res.ok ? 'Enrolment rejected.' : `Failed: ${res.error}`);
            await loadAll();
          }}
          onRevoke={async (id, reason) => {
            const res = await faceAttendService.updateTemplateDecision({
              organizationId: orgId,
              templateId: id,
              action: 'REVOKE',
              reason,
              actorUserId: user?.id,
            });
            showToast(res.ok ? 'Enrolment revoked.' : `Failed: ${res.error}`);
            await loadAll();
          }}
          onDeleteBiometrics={async (empId) => {
            const res = await faceAttendService.deleteEmployeeBiometrics(orgId, empId);
            showToast(
              res.ok ? 'Consent withdrawn & biometric template permanently erased.' : `Failed: ${res.error}`
            );
            await loadAll();
          }}
        />
      )}

      {activeTab === 'attempts' && <FaceAttendAttemptsTab attempts={attempts} />}

      {activeTab === 'exceptions' && (
        <FaceAttendExceptionsTab
          exceptions={exceptions}
          onResolve={async (review, decision, notes) => {
            const res = await faceAttendService.resolveExceptionReview({
              organizationId: orgId,
              review,
              decision,
              notes,
              actorUserId: user?.id,
            });
            showToast(
              res.ok ? `Exception ${decision.toLowerCase()} and logged.` : `Failed: ${res.error}`
            );
            await loadAll();
          }}
        />
      )}

      {activeTab === 'settings' && isAdmin && settings && (
        <FaceAttendSettingsTab
          settings={settings}
          workLocations={locations}
          isAdmin={isAdmin}
          onSaveSettings={async (patch) => {
            const res = await faceAttendService.saveSettings(orgId, patch, user?.id);
            showToast(res.ok ? 'FaceAttend policy saved.' : `Failed: ${res.error}`);
            await loadAll();
          }}
        />
      )}

      {activeTab === 'billing' && isPlatformSuperAdmin && (
        <FaceAttendBillingTab
          subscription={subscription}
          snapshots={snapshots}
          activeEnrolledCount={activeEnrolledCount}
          totalAttemptsCount={attempts.length}
          isAdmin={isAdmin}
          canManageBilling={isPlatformSuperAdmin}
          onSaveSubscription={async (sub) => {
            const res = await faceAttendBillingService.saveSubscription(orgId, sub, user?.id);
            showToast(res.ok ? 'Commercial subscription updated.' : `Failed: ${res.error}`);
            await loadAll();
          }}
          onGenerateSnapshot={async (start, end) => {
            const res = await faceAttendBillingService.generateImmutableSnapshot(orgId, start, end);
            showToast(
              res.ok
                ? `Immutable snapshot locked for ${start} to ${end}.`
                : `Failed: ${res.error}`
            );
            await loadAll();
          }}
          onMarkSnapshotStatus={async (id, st) => {
            const res = await faceAttendBillingService.markSnapshotStatus(id, st);
            showToast(res.ok ? `Snapshot marked ${st}.` : `Failed: ${res.error}`);
            await loadAll();
          }}
        />
      )}

      {activeTab === 'audit' && isAdmin && <FaceAttendAuditTab logs={auditLogs} />}
    </div>
  );
};

