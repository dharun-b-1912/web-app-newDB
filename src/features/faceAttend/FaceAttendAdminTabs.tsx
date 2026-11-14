// src/features/faceAttend/FaceAttendAdminTabs.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  Save,
  MapPin,
  FileSpreadsheet,
  ShieldAlert,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Sliders,
  CheckCircle2,
  UserCheck,
  Database,
  Navigation,
  Info,
} from 'lucide-react';
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
  const [locSearch, setLocSearch] = useState('');
  const [locPage, setLocPage] = useState(1);
  const locPageSize = 6;

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

  // Filter & paginate workplace geofences
  const filteredLocations = useMemo(() => {
    const q = locSearch.trim().toLowerCase();
    return workLocations.filter((loc) => {
      if (!q) return true;
      const name = (loc.name || '').toLowerCase();
      const addr = (loc.address || loc.address_line1 || '').toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
  }, [workLocations, locSearch]);

  useEffect(() => {
    setLocPage(1);
  }, [locSearch]);

  const locTotalPages = Math.max(1, Math.ceil(filteredLocations.length / locPageSize));
  const paginatedLocations = useMemo(() => {
    const start = (locPage - 1) * locPageSize;
    return filteredLocations.slice(start, start + locPageSize);
  }, [filteredLocations, locPage, locPageSize]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Tenant FaceAttend Policy Controls (Version v{settings.policy_version})
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Active v{settings.policy_version}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure biometric accuracy, anti-spoofing strength, GPS geofencing, and onboarding governance. Every change increments policy version and writes to the compliance audit log.
          </p>
        </div>
        {isAdmin && (
          <button
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs transition-colors shrink-0"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Policy Version'}
          </button>
        )}
      </div>

      {/* Group 1: 1:1 Face Verification & Anti-Spoofing Policy */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-2.5">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            1. Biometric 1:1 Matching & Anti-Spoofing Policy
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Controls facial feature vector comparison and presentation attack detection (PAD) to prevent identity fraud and spoofing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <label className="flex items-start justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer gap-2">
            <div>
              <span className="font-semibold text-gray-900 block">1:1 Face Verification</span>
              <span className="text-[11px] text-gray-500">
                Compares live selfie vector against enrolled face template.
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(draft.face_verification_enabled)}
              disabled={!isAdmin}
              onChange={() => toggle('face_verification_enabled')}
              className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
            />
          </label>

          <label className="flex items-start justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer gap-2">
            <div>
              <span className="font-semibold text-gray-900 block">Liveness Detection (PAD)</span>
              <span className="text-[11px] text-gray-500">
                Blocks photo prints, digital screen replays, and video masks.
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(draft.liveness_enabled)}
              disabled={!isAdmin}
              onChange={() => toggle('liveness_enabled')}
              className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
            />
          </label>

          <label className="flex items-start justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer gap-2">
            <div>
              <span className="font-semibold text-gray-900 block">Require Face on Check-In</span>
              <span className="text-[11px] text-gray-500">
                Mandates facial scan when starting employee work shift.
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(draft.require_face_on_checkin)}
              disabled={!isAdmin}
              onChange={() => toggle('require_face_on_checkin')}
              className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
            />
          </label>

          <label className="flex items-start justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer gap-2">
            <div>
              <span className="font-semibold text-gray-900 block">Require Face on Check-Out</span>
              <span className="text-[11px] text-gray-500">
                Mandates facial scan when ending employee work shift.
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(draft.require_face_on_checkout)}
              disabled={!isAdmin}
              onChange={() => toggle('require_face_on_checkout')}
              className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 text-xs">
          <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg">
            <label className="block font-semibold text-gray-800 mb-0.5">Face Match Threshold (%)</label>
            <p className="text-[11px] text-gray-500 mb-2">
              Minimum similarity score to accept punch. Recommended: <strong>70%</strong> standard, <strong>85%+</strong> high security.
            </p>
            <input
              type="number"
              min={50}
              max={99}
              step={1}
              value={draft.match_threshold}
              disabled={!isAdmin}
              onChange={(e) => setDraft({ ...draft, match_threshold: Number(e.target.value) })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
            />
          </div>

          <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg">
            <label className="block font-semibold text-gray-800 mb-0.5">Liveness Threshold (%)</label>
            <p className="text-[11px] text-gray-500 mb-2">
              Minimum anti-spoofing confidence. Recommended: <strong>80%</strong> to filter out printed paper photos and laptop screens.
            </p>
            <input
              type="number"
              min={50}
              max={99}
              step={1}
              value={draft.liveness_threshold}
              disabled={!isAdmin}
              onChange={(e) => setDraft({ ...draft, liveness_threshold: Number(e.target.value) })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
            />
          </div>

          <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg">
            <label className="block font-semibold text-gray-800 mb-0.5">Biometric Engine Provider</label>
            <p className="text-[11px] text-gray-500 mb-2">
              Biometric engine routing. <strong>AUTO</strong> uses Cloud AI with automatic zero-downtime failover.
            </p>
            <select
              value={draft.provider_preference}
              disabled={!isAdmin}
              onChange={(e) =>
                setDraft({ ...draft, provider_preference: e.target.value as ProviderPreference })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
            >
              <option value="AUTO">AUTO (Cloud Key with Fallback)</option>
              <option value="AWS_REKOGNITION">AWS Rekognition Liveness + Compare</option>
              <option value="AZURE_FACE">Azure AI Face Liveness + Verify</option>
              <option value="HTTP_WEBHOOK">Custom HTTP Biometric Service</option>
              <option value="SANDBOX_CHALLENGE">SANDBOX_CHALLENGE (QA/Dev)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Group 2: GPS Geofencing & Workplace Boundaries */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-2.5">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-emerald-600" />
            2. GPS Geofencing & Workplace Location Boundaries
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Ensures mobile check-ins only happen inside authorized workplace boundaries, preventing remote clock-in abuse.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <label className="flex items-start justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer gap-2">
            <div>
              <span className="font-semibold text-gray-900 block">GPS Location Verification</span>
              <span className="text-[11px] text-gray-500">
                Validates employee coordinates against assigned workplace locations.
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(draft.gps_verification_enabled)}
              disabled={!isAdmin}
              onChange={() => toggle('gps_verification_enabled')}
              className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 text-xs">
          <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg">
            <label className="block font-semibold text-gray-800 mb-0.5">Geofence Enforcement Mode</label>
            <p className="text-[11px] text-gray-500 mb-2">
              <strong>REQUIRED</strong>: Blocks punch if outside radius. <strong>WARN_ONLY</strong>: Logs distance warning. <strong>OPTIONAL</strong>: Records GPS only.
            </p>
            <select
              value={draft.geofence_mode}
              disabled={!isAdmin}
              onChange={(e) => setDraft({ ...draft, geofence_mode: e.target.value as GeofenceMode })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
            >
              <option value="REQUIRED">REQUIRED (Strictly block outside boundary)</option>
              <option value="WARN_ONLY">WARN_ONLY (Flag warning distance, allow punch)</option>
              <option value="OPTIONAL">OPTIONAL (Capture GPS coordinates without blocking)</option>
            </select>
          </div>

          <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg">
            <label className="block font-semibold text-gray-800 mb-0.5">Max GPS Accuracy Drift (m)</label>
            <p className="text-[11px] text-gray-500 mb-2">
              Maximum allowable horizontal drift radius. Recommended: <strong>80m</strong> to reject inaccurate cell-tower fixes.
            </p>
            <input
              type="number"
              min={10}
              max={500}
              value={draft.max_gps_accuracy_meters}
              disabled={!isAdmin}
              onChange={(e) =>
                setDraft({ ...draft, max_gps_accuracy_meters: Number(e.target.value) })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
            />
          </div>

          <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg">
            <label className="block font-semibold text-gray-800 mb-0.5">GPS Freshness Window (Seconds)</label>
            <p className="text-[11px] text-gray-500 mb-2">
              Maximum age of device GPS fix. Recommended: <strong>60s</strong> to prevent cached or spoofed location apps.
            </p>
            <input
              type="number"
              min={10}
              max={600}
              value={draft.gps_freshness_seconds}
              disabled={!isAdmin}
              onChange={(e) =>
                setDraft({ ...draft, gps_freshness_seconds: Number(e.target.value) })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
            />
          </div>
        </div>
      </div>

      {/* Group 3: Onboarding Governance & Fallback Safety */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-2.5">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            3. Workforce Onboarding Governance & Fallback Safety
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Configures how 700+ employees enroll their faces and how exceptions/fallbacks are managed by HR.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 text-xs">
          <label className="flex items-start justify-between p-3.5 rounded-lg border-2 border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/60 cursor-pointer gap-3">
            <div>
              <span className="font-semibold text-emerald-900 block">
                Manual HR Approval for Enrolments
              </span>
              <span className="text-[11px] text-gray-600 leading-relaxed block mt-0.5">
                <strong>OFF (Recommended)</strong>: When disabled, 700+ employee registrations are <em>instantly auto-approved</em> upon capture so employees can check in immediately without HR bottleneck.
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(draft.self_enrolment_requires_approval)}
              disabled={!isAdmin}
              onChange={() => toggle('self_enrolment_requires_approval')}
              className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
            />
          </label>

          <label className="flex items-start justify-between p-3.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer gap-3">
            <div>
              <span className="font-semibold text-gray-900 block">Manual Exception Fallback Desk</span>
              <span className="text-[11px] text-gray-600 leading-relaxed block mt-0.5">
                Allows employees who fail biometric check (poor lighting, injury, camera damage) to submit attendance for Supervisor / HR approval without being marked absent.
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(draft.manual_fallback_enabled)}
              disabled={!isAdmin}
              onChange={() => toggle('manual_fallback_enabled')}
              className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
            />
          </label>

          <label className="flex items-start justify-between p-3.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer gap-3">
            <div>
              <span className="font-semibold text-gray-900 block">Fallback on Provider Outage</span>
              <span className="text-[11px] text-gray-600 leading-relaxed block mt-0.5">
                Emergency policy: if the cloud AI verification engine has an outage, allow non-biometric manual fallback so employee clock-ins are not blocked.
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(draft.allow_non_face_fallback_on_provider_outage)}
              disabled={!isAdmin}
              onChange={() => toggle('allow_non_face_fallback_on_provider_outage')}
              className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
            />
          </label>

          <label className="flex items-start justify-between p-3.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer gap-3">
            <div>
              <span className="font-semibold text-gray-900 block">Offline Queueing (Pending Verify)</span>
              <span className="text-[11px] text-gray-600 leading-relaxed block mt-0.5">
                Safely stores encrypted punch on the device if mobile network drops, uploading automatically once connection is restored.
              </span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(draft.offline_queue_enabled)}
              disabled={!isAdmin}
              onChange={() => toggle('offline_queue_enabled')}
              className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
            />
          </label>
        </div>
      </div>

      {/* Group 4: Data Retention & Legal Compliance */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-2.5">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-600" />
            4. Biometric Data Retention & Statutory Privacy Compliance
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Complies with statutory biometric privacy laws, consent tracking, and verification audit trail retention.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg">
            <label className="block font-semibold text-gray-800 mb-0.5">Capture Image Retention (Days)</label>
            <p className="text-[11px] text-gray-500 mb-2">
              Number of days cropped face verification audit snapshots are retained before automatic secure purge. Recommended: <strong>90 days</strong>.
            </p>
            <input
              type="number"
              min={7}
              max={365}
              value={draft.retention_days_images}
              disabled={!isAdmin}
              onChange={(e) =>
                setDraft({ ...draft, retention_days_images: Number(e.target.value) })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
            />
          </div>

          <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg">
            <label className="block font-semibold text-gray-800 mb-0.5">Biometric Consent Version</label>
            <p className="text-[11px] text-gray-500 mb-2">
              Active legal consent notice version (e.g. <strong>v1.0</strong>). Bumping this version requires employees to re-consent in mobile app.
            </p>
            <input
              type="text"
              value={draft.consent_version_required}
              disabled={!isAdmin}
              onChange={(e) => setDraft({ ...draft, consent_version_required: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium"
            />
          </div>
        </div>
      </div>

      {/* Existing Work Locations Geofences Reused with Search & Pagination */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Assigned Workplace Geofences ({workLocations.length} Locations Configured)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              These verified office, factory, and site geofences are automatically shared with JOY FaceAttend to validate employee location.
            </p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={locSearch}
              onChange={(e) => setLocSearch(e.target.value)}
              placeholder="Search locations..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 w-56"
            />
          </div>
        </div>

        {filteredLocations.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            {workLocations.length === 0
              ? 'No workplace geofences configured for this organization yet.'
              : 'No workplace locations match your search query.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedLocations.map((loc) => (
                <div key={loc.id} className="p-3.5 rounded-xl border border-gray-200 hover:border-emerald-300 bg-gray-50/50 hover:bg-white transition-all text-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-gray-900 leading-snug">{loc.name}</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          loc.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {loc.is_active !== false ? 'Active Site' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-gray-500 mt-1 line-clamp-2 text-[11px] leading-relaxed">
                      {loc.address || loc.address_line1 || 'Standard workplace coordinates'}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-emerald-600" />
                      Radius: {loc.geofence_radius_meters || 100}m
                    </span>
                    {loc.latitude && loc.longitude && (
                      <span className="text-gray-400 font-mono text-[10px]">
                        {Number(loc.latitude).toFixed(3)}, {Number(loc.longitude).toFixed(3)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Workplace Locations Pagination */}
            {locTotalPages > 1 && (
              <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
                <span>
                  Showing {(locPage - 1) * locPageSize + 1} to{' '}
                  {Math.min(locPage * locPageSize, filteredLocations.length)} of {filteredLocations.length} locations
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLocPage((p) => Math.max(1, p - 1))}
                    disabled={locPage <= 1}
                    className="p-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-medium">
                    Page {locPage} of {locTotalPages}
                  </span>
                  <button
                    onClick={() => setLocPage((p) => Math.min(locTotalPages, p + 1))}
                    disabled={locPage >= locTotalPages}
                    className="p-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
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

