// src/features/faceAttend/FaceAttendAdminTabs.tsx
import React, { useState } from 'react';
import { Save, MapPin, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { FACEATTEND_PLAN_PRESETS, faceAttendBillingService } from '../../services/faceAttend/faceAttendBillingService';
import type {
  FaceAttendAuditLog,
  FaceAttendBillingSnapshot,
  FaceAttendOrgSettings,
  FaceAttendSubscription,
  GeofenceMode,
  ProviderPreference,
} from '../../types/faceAttend';

export const FaceAttendSettingsTab: React.FC<{
  settings: FaceAttendOrgSettings;
  workLocations: any[];
  isAdmin: boolean;
  onSaveSettings: (patch: Partial<FaceAttendOrgSettings>) => Promise<void>;
}> = ({ settings, workLocations, isAdmin, onSaveSettings }) => {
  const [draft, setDraft] = useState<FaceAttendOrgSettings>(settings);
  const [saving, setSaving] = useState(false);

  const toggle = (key: keyof FaceAttendOrgSettings) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSettings(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Tenant FaceAttend Policy Controls (Version v{settings.policy_version})
            </h3>
            <p className="text-xs text-gray-500">
              Changes increment policy version and write directly to the compliance audit log.
            </p>
          </div>
          {isAdmin && (
            <button
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Policy Version'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {(
            [
              ['face_verification_enabled', '1:1 Face Verification Enabled'],
              ['liveness_enabled', 'Anti-Spoofing / Liveness Detection'],
              ['gps_verification_enabled', 'GPS Location Verification'],
              ['require_face_on_checkin', 'Require Face on Check-In'],
              ['require_face_on_checkout', 'Require Face on Check-Out'],
              ['self_enrolment_requires_approval', 'Self-Enrolment Needs HR Approval'],
              ['manual_fallback_enabled', 'Manual Exception Fallback Allowed'],
              ['offline_queue_enabled', 'Offline Queueing (Pending Verify)'],
              ['allow_non_face_fallback_on_provider_outage', 'Fallback Allowed on Provider Outage'],
            ] as Array<[keyof FaceAttendOrgSettings, string]>
          ).map(([key, label]) => (
            <label
              key={String(key)}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              <span className="font-medium text-gray-800">{label}</span>
              <input
                type="checkbox"
                checked={Boolean(draft[key])}
                disabled={!isAdmin}
                onChange={() => toggle(key)}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 text-xs">
          <div>
            <label className="block font-medium text-gray-700 mb-1">Geofence Enforcement</label>
            <select
              value={draft.geofence_mode}
              disabled={!isAdmin}
              onChange={(e) => setDraft({ ...draft, geofence_mode: e.target.value as GeofenceMode })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white"
            >
              <option value="REQUIRED">REQUIRED (Block outside geofence)</option>
              <option value="WARN_ONLY">WARN_ONLY (Flag distance, allow punch)</option>
              <option value="OPTIONAL">OPTIONAL (Capture GPS only)</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Provider Preference</label>
            <select
              value={draft.provider_preference}
              disabled={!isAdmin}
              onChange={(e) =>
                setDraft({ ...draft, provider_preference: e.target.value as ProviderPreference })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white"
            >
              <option value="AUTO">AUTO (Cloud Key else Sandbox)</option>
              <option value="AWS_REKOGNITION">AWS Rekognition Liveness + Compare</option>
              <option value="AZURE_FACE">Azure AI Face Liveness + Verify</option>
              <option value="HTTP_WEBHOOK">Custom HTTP Biometric Service</option>
              <option value="SANDBOX_CHALLENGE">SANDBOX_CHALLENGE (QA/Dev)</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Face Match Threshold (%)</label>
            <input
              type="number"
              min={50}
              max={99}
              step={1}
              value={draft.match_threshold}
              disabled={!isAdmin}
              onChange={(e) => setDraft({ ...draft, match_threshold: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Liveness Threshold (%)</label>
            <input
              type="number"
              min={50}
              max={99}
              step={1}
              value={draft.liveness_threshold}
              disabled={!isAdmin}
              onChange={(e) => setDraft({ ...draft, liveness_threshold: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Max GPS Accuracy (m)</label>
            <input
              type="number"
              min={10}
              max={500}
              value={draft.max_gps_accuracy_meters}
              disabled={!isAdmin}
              onChange={(e) =>
                setDraft({ ...draft, max_gps_accuracy_meters: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">GPS Freshness Window (s)</label>
            <input
              type="number"
              min={10}
              max={600}
              value={draft.gps_freshness_seconds}
              disabled={!isAdmin}
              onChange={(e) =>
                setDraft({ ...draft, gps_freshness_seconds: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Capture Retention (Days)</label>
            <input
              type="number"
              min={7}
              max={365}
              value={draft.retention_days_images}
              disabled={!isAdmin}
              onChange={(e) =>
                setDraft({ ...draft, retention_days_images: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Consent Notice Version</label>
            <input
              type="text"
              value={draft.consent_version_required}
              disabled={!isAdmin}
              onChange={(e) => setDraft({ ...draft, consent_version_required: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Existing Work Locations Geofences Reused */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          Assigned Workplace Geofences (Shared `work_locations`)
        </h3>
        {workLocations.length === 0 ? (
          <p className="text-xs text-gray-500">No workplace geofences configured for this organization yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {workLocations.map((loc) => (
              <div key={loc.id} className="p-3 rounded-lg border border-gray-200 text-xs">
                <div className="font-semibold text-gray-900">{loc.name}</div>
                <div className="text-gray-500 mt-0.5 truncate">{loc.address || 'No street address'}</div>
                <div className="mt-1.5 text-emerald-700 font-medium">
                  Radius: {loc.geofence_radius_meters || 100}m &bull;{' '}
                  {loc.is_active !== false ? 'Active' : 'Inactive'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const FaceAttendBillingTab: React.FC<{
  subscription: FaceAttendSubscription | null;
  snapshots: FaceAttendBillingSnapshot[];
  activeEnrolledCount: number;
  totalAttemptsCount: number;
  isAdmin: boolean;
  canManageBilling?: boolean;
  onSaveSubscription: (sub: Partial<FaceAttendSubscription>) => Promise<void>;
  onGenerateSnapshot: (start: string, end: string) => Promise<void>;
  onMarkSnapshotStatus: (id: string, status: 'INVOICED' | 'PAID') => Promise<void>;
}> = ({
  subscription,
  snapshots,
  activeEnrolledCount,
  totalAttemptsCount,
  isAdmin,
  canManageBilling = false,
  onSaveSubscription,
  onGenerateSnapshot,
  onMarkSnapshotStatus,
}) => {
  const canEditCommercial = isAdmin && canManageBilling;
  const [planCode, setPlanCode] = useState(subscription?.plan_code || 'PRO');
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>(subscription?.billing_cycle || 'MONTHLY');
  const [pricePerEmp, setPricePerEmp] = useState(subscription?.price_per_employee ?? 25);
  const [minFee, setMinFee] = useState(subscription?.minimum_monthly_fee ?? 0);
  const [setupFee, setSetupFee] = useState(subscription?.setup_fee ?? 0);
  const [usageFee, setUsageFee] = useState(subscription?.usage_fee_per_call ?? 0);
  const [maxCap, setMaxCap] = useState<string>(
    subscription?.max_enrolled_employees != null ? String(subscription.max_enrolled_employees) : ''
  );
  const [status, setStatus] = useState(subscription?.status || 'ACTIVE');
  const [saving, setSaving] = useState(false);

  const effectivePlanCode = canEditCommercial ? planCode : (subscription?.plan_code || 'PRO');
  const effectiveCycle = canEditCommercial ? cycle : (subscription?.billing_cycle || 'MONTHLY');
  const effectivePricePerEmp = canEditCommercial ? pricePerEmp : (subscription?.price_per_employee ?? 25);
  const effectiveMinFee = canEditCommercial ? minFee : (subscription?.minimum_monthly_fee ?? 0);
  const effectiveSetupFee = canEditCommercial ? setupFee : (subscription?.setup_fee ?? 0);
  const effectiveUsageFee = canEditCommercial ? usageFee : (subscription?.usage_fee_per_call ?? 0);
  const effectiveMaxCap = canEditCommercial
    ? maxCap
    : subscription?.max_enrolled_employees != null
    ? String(subscription.max_enrolled_employees)
    : '';
  const effectiveStatus = canEditCommercial ? status : (subscription?.status || 'ACTIVE');

  const activePreset = FACEATTEND_PLAN_PRESETS.find((p) => p.code === effectivePlanCode);

  const preview = faceAttendBillingService.computePreview({
    pricePerEmployee: effectivePricePerEmp,
    minimumMonthlyFee: effectiveMinFee,
    setupFee: effectiveSetupFee,
    usageFeePerCall: effectiveUsageFee,
    activeEnrolledEmployees: activeEnrolledCount,
    verifiedChecksCount: totalAttemptsCount,
    failedChecksCount: 0,
    billingCycle: effectiveCycle,
  });

  const periodStart =
    subscription?.current_period_start ||
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd =
    subscription?.current_period_end ||
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {canEditCommercial ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {FACEATTEND_PLAN_PRESETS.map((preset) => (
              <button
                key={preset.code}
                type="button"
                onClick={() => {
                  setPlanCode(preset.code);
                  setPricePerEmp(preset.suggestedPricePerEmployee);
                  if (preset.code === 'TRIAL') {
                    setStatus('TRIAL');
                    setMaxCap('25');
                  }
                }}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  planCode === preset.code
                    ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-xs font-semibold text-emerald-700">{preset.code}</div>
                <div className="text-sm font-bold text-gray-900 mt-1">{preset.name}</div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  ₹{preset.suggestedPricePerEmployee}
                  <span className="text-[11px] font-normal text-gray-500"> / emp / mo</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1.5">{preset.description}</p>
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Configurable Tenant Subscription & Pricing
                </h3>
                <p className="text-xs text-gray-500">
                  Projected Period Subtotal: <strong>₹{preview.subtotal.toFixed(2)}</strong> ({activeEnrolledCount} active enrolled employees)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await onSaveSubscription({
                        plan_code: planCode as any,
                        billing_cycle: cycle,
                        price_per_employee: pricePerEmp,
                        minimum_monthly_fee: minFee,
                        setup_fee: setupFee,
                        usage_fee_per_call: usageFee,
                        max_enrolled_employees: maxCap ? Number(maxCap) : null,
                        status: status as any,
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Commercial Plan'}
                </button>
                <button
                  onClick={() => onGenerateSnapshot(periodStart, periodEnd)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-black cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Lock Period Snapshot
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Price / Emp (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={pricePerEmp}
                  onChange={(e) => setPricePerEmp(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Billing Cycle</label>
                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Min Monthly Fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={minFee}
                  onChange={(e) => setMinFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Setup Fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={setupFee}
                  onChange={(e) => setSetupFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">API Usage / Call (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.05"
                  value={usageFee}
                  onChange={(e) => setUsageFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Enrolled Cap</label>
                <input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={maxCap}
                  onChange={(e) => setMaxCap(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200"
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Active Subscription &amp; Plan Details
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {effectivePlanCode} &bull; {effectiveStatus}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {activePreset?.name || 'JOY FaceAttend Add-On'} &mdash; {activePreset?.description || '1:1 face verification & anti-spoof attendance module.'}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[11px] font-medium text-gray-500">Current Billing Period</div>
              <div className="text-xs font-semibold text-gray-900 mt-0.5">
                {periodStart} &rarr; {periodEnd}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <div className="text-[11px] font-medium text-gray-500">Rate / Employee</div>
              <div className="text-base font-bold text-gray-900 mt-0.5">
                ₹{effectivePricePerEmp} <span className="text-[11px] font-normal text-gray-500">/ mo</span>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <div className="text-[11px] font-medium text-gray-500">Billing Cycle</div>
              <div className="text-base font-bold text-gray-900 mt-0.5">
                {effectiveCycle === 'ANNUAL' ? 'Annual' : 'Monthly'}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <div className="text-[11px] font-medium text-gray-500">Enrolled Staff</div>
              <div className="text-base font-bold text-gray-900 mt-0.5">
                {activeEnrolledCount}{' '}
                <span className="text-[11px] font-normal text-gray-500">
                  / {effectiveMaxCap || 'Unlimited'}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <div className="text-[11px] font-medium text-gray-500">Min Monthly Fee</div>
              <div className="text-base font-bold text-gray-900 mt-0.5">
                ₹{effectiveMinFee}
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-3">
              <div className="text-[11px] font-medium text-emerald-700">Estimated Subtotal</div>
              <div className="text-base font-bold text-emerald-900 mt-0.5">
                ₹{preview.subtotal.toFixed(2)}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            Subscription pricing, plan tiers, and billing snapshots are managed by Joy PeopleHR Platform Administration. Contact support to upgrade or modify your commercial plan.
          </p>
        </div>
      )}

      {/* Immutable Billing Snapshots Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900">
            Immutable Billing Period Snapshots
          </h4>
          <p className="text-xs text-gray-500">
            Financial quantities and pricing rules are locked at snapshot generation time and cannot be altered retroactively.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Period</th>
                <th className="py-2.5 px-4 font-semibold">Plan & Rate</th>
                <th className="py-2.5 px-4 font-semibold">Active Staff</th>
                <th className="py-2.5 px-4 font-semibold">Checks (Pass/Fail)</th>
                <th className="py-2.5 px-4 font-semibold">Subtotal</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {snapshots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No billing period snapshots locked yet.
                  </td>
                </tr>
              ) : (
                snapshots.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-4 font-medium text-gray-900">
                      {s.billing_period_start} &rarr; {s.billing_period_end}
                    </td>
                    <td className="py-2.5 px-4">
                      {s.plan_code_snapshot} ({s.currency_code} {s.unit_price_snapshot})
                    </td>
                    <td className="py-2.5 px-4">{s.active_enrolled_count}</td>
                    <td className="py-2.5 px-4">
                      {s.verified_checks_count} / {s.failed_checks_count}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-gray-900">
                      {s.currency_code} {Number(s.subtotal_amount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 font-semibold text-[11px]">
                        {s.snapshot_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-1">
                      {canEditCommercial && s.snapshot_status === 'FINALIZED' && (
                        <button
                          onClick={() => onMarkSnapshotStatus(s.id, 'INVOICED')}
                          className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium cursor-pointer"
                        >
                          Mark Invoiced
                        </button>
                      )}
                      {canEditCommercial && s.snapshot_status === 'INVOICED' && (
                        <button
                          onClick={() => onMarkSnapshotStatus(s.id, 'PAID')}
                          className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const FaceAttendAuditTab: React.FC<{ logs: FaceAttendAuditLog[] }> = ({ logs }) => (
  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
    <div className="p-4 border-b border-gray-100 flex items-center gap-2">
      <ShieldAlert className="w-4 h-4 text-gray-700" />
      <h3 className="text-sm font-semibold text-gray-900">
        Compliance, Consent & Policy Governance Audit Trail
      </h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
          <tr>
            <th className="py-2.5 px-4 font-semibold">Timestamp</th>
            <th className="py-2.5 px-4 font-semibold">Event</th>
            <th className="py-2.5 px-4 font-semibold">Target</th>
            <th className="py-2.5 px-4 font-semibold">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-500">
                No audit events logged yet.
              </td>
            </tr>
          ) : (
            logs.map((l) => (
              <tr key={l.id}>
                <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 px-4 font-semibold text-gray-900">{l.event_type}</td>
                <td className="py-2.5 px-4 text-gray-700">{l.target_type}</td>
                <td className="py-2.5 px-4 text-gray-600 font-mono text-[11px]">
                  {JSON.stringify(l.metadata)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

