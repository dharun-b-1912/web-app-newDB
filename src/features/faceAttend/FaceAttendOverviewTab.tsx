// src/features/faceAttend/FaceAttendOverviewTab.tsx
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  UserCheck,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Clock,
  Activity,
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import type {
  FaceAttendAttemptRecord,
  FaceAttendEngineStatus,
  FaceAttendExceptionReview,
  FaceAttendOrgSettings,
  FaceAttendSubscription,
  FaceAttendTemplateRecord,
} from '../../types/faceAttend';
import { faceAttendService } from '../../services/faceAttend/faceAttendService';

interface Props {
  settings: FaceAttendOrgSettings;
  subscription: FaceAttendSubscription | null;
  templates: FaceAttendTemplateRecord[];
  attempts: FaceAttendAttemptRecord[];
  exceptions: FaceAttendExceptionReview[];
  onNavigateTab: (tab: string) => void;
}

export const FaceAttendOverviewTab: React.FC<Props> = ({
  settings,
  subscription,
  templates,
  attempts,
  exceptions,
  onNavigateTab,
}) => {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayAttempts = attempts.filter((a) =>
    new Date(a.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === todayStr
  );
  const matchedCheckInsToday = todayAttempts.filter(
    (a) => a.decision === 'MATCH' && a.punch_type === 'CHECK_IN' && a.attendance_punch_id
  ).length;
  const matchedCheckOutsToday = todayAttempts.filter(
    (a) => a.decision === 'MATCH' && a.punch_type === 'CHECK_OUT' && a.attendance_punch_id
  ).length;
  const failedToday = todayAttempts.filter((a) => a.decision !== 'MATCH').length;

  const activeTemplates = templates.filter((t) => t.enrolment_status === 'ACTIVE').length;
  const pendingEnrolments = templates.filter((t) => t.enrolment_status === 'PENDING_APPROVAL').length;
  const pendingExceptions = exceptions.filter((e) => e.review_status === 'PENDING').length;

  const [engineStatus, setEngineStatus] = useState<FaceAttendEngineStatus | null>(null);
  const [checkingEngine, setCheckingEngine] = useState(false);

  const loadEngineStatus = async () => {
    setCheckingEngine(true);
    try {
      const status = await faceAttendService.getEngineStatus();
      setEngineStatus(status);
    } finally {
      setCheckingEngine(false);
    }
  };

  useEffect(() => {
    loadEngineStatus();
  }, []);

  const hasCloudProviderAttempt =
    attempts.some((a) => a.is_production_biometric) ||
    templates.some((t) =>
      ['COMPREFACE', 'AWS_REKOGNITION', 'AZURE_FACE', 'HTTP_WEBHOOK'].includes(t.provider_code)
    );

  const isProdEngineConnected =
    Boolean(engineStatus?.healthy) && engineStatus?.provider_code !== 'SANDBOX_CHALLENGE';
  const isProdEngineOffline =
    Boolean(engineStatus) && !engineStatus!.healthy && engineStatus?.provider_code !== 'SANDBOX_CHALLENGE';

  const bannerClasses = isProdEngineConnected
    ? 'border-emerald-200 bg-emerald-50/70'
    : isProdEngineOffline
    ? 'border-rose-200 bg-rose-50/70'
    : 'border-amber-200 bg-amber-50/70';

  const titleTextClass = isProdEngineConnected
    ? 'text-emerald-950'
    : isProdEngineOffline
    ? 'text-rose-950'
    : 'text-amber-950';

  const subTextClass = isProdEngineConnected
    ? 'text-emerald-800'
    : isProdEngineOffline
    ? 'text-rose-800'
    : 'text-amber-800';

  return (
    <div className="space-y-6">
      {/* Live Biometric Engine Connection Status Banner */}
      <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${bannerClasses}`}>
        <div className="flex items-start gap-3">
          {isProdEngineConnected ? (
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          ) : isProdEngineOffline ? (
            <WifiOff className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          )}
          <div className={`text-sm ${titleTextClass}`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">
                Attendance Verification Service:{' '}
                {engineStatus
                  ? engineStatus.provider_code === 'SANDBOX_CHALLENGE'
                    ? 'Evaluation Guard Mode'
                    : 'JOY FaceAttend Anti-Fraud Guard'
                  : 'Checking Service Status...'}
              </p>
              {engineStatus && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isProdEngineConnected
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : isProdEngineOffline
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {isProdEngineConnected ? (
                    <Wifi className="w-3 h-3" />
                  ) : isProdEngineOffline ? (
                    <WifiOff className="w-3 h-3" />
                  ) : (
                    <Server className="w-3 h-3" />
                  )}
                  {isProdEngineConnected
                    ? `Active${engineStatus.latency_ms != null ? ` • ${engineStatus.latency_ms} ms` : ''}`
                    : isProdEngineOffline
                    ? 'Service Offline'
                    : 'Evaluation Mode'}
                </span>
              )}
            </div>
            <p className={`text-xs mt-1 ${subTextClass}`}>
              Anti-fraud attendance add-on: verifies employee identity (&ge;{settings.match_threshold}% match),
              liveness check ({settings.liveness_enabled ? `≥${settings.liveness_threshold}%` : 'Disabled'}),
              and GPS geofence ({settings.geofence_mode}) to prevent proxy &amp; fraudulent entries.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadEngineStatus}
            disabled={checkingEngine}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/90 hover:bg-white border border-slate-200 text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh biometric engine connection status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingEngine ? 'animate-spin' : ''}`} />
            {checkingEngine ? 'Checking...' : 'Check Status'}
          </button>
          <button
            onClick={() => onNavigateTab('settings')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shrink-0 cursor-pointer"
          >
            Configure Policy (v{settings.policy_version})
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Verified Check-Ins (Today)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{matchedCheckInsToday}</div>
          <div className="mt-1 text-xs text-gray-500">Check-outs today: {matchedCheckOutsToday}</div>
        </div>

        <div
          onClick={() => onNavigateTab('enrolment')}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Active Enrolled Staff</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{activeTemplates}</div>
          <div className="mt-1 text-xs text-amber-600 font-medium">
            {pendingEnrolments} awaiting HR approval
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('attempts')}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs cursor-pointer hover:border-red-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Rejected Attempts (Today)</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{failedToday}</div>
          <div className="mt-1 text-xs text-gray-500">Never auto-marked Absent</div>
        </div>

        <div
          onClick={() => onNavigateTab('exceptions')}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Pending Exception Reviews</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{pendingExceptions}</div>
          <div className="mt-1 text-xs text-gray-500">
            Plan: {subscription?.plan_code || 'PRO'} (₹{subscription?.price_per_employee ?? 25}/emp/mo)
          </div>
        </div>
      </div>

      {/* Live Realtime Feed + Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Live Verification Stream (Realtime)
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('attempts')}
              className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              View Full History
            </button>
          </div>

          {attempts.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No FaceAttend verification attempts recorded yet for this organization.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {attempts.slice(0, 8).map((att) => (
                <div key={att.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {att.employee_name}{' '}
                      <span className="text-xs text-gray-400 font-normal">({att.employee_code || 'N/A'})</span>
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{att.punch_type}</span>
                      <span>&bull;</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {att.work_location_name || (att.geofence_passed ? 'Inside Site' : 'Outside Geofence')}
                        {att.distance_meters != null ? ` (${Math.round(att.distance_meters)}m)` : ''}
                      </span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        att.decision === 'MATCH'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {att.decision}
                    </span>
                    <div className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(att.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Active Guardrails</h3>
          <ul className="space-y-2.5 text-xs text-gray-600">
            <li className="flex justify-between py-1 border-b border-gray-100">
              <span>1:1 Face Match Threshold</span>
              <span className="font-semibold text-gray-900">{settings.match_threshold}%</span>
            </li>
            <li className="flex justify-between py-1 border-b border-gray-100">
              <span>Liveness Check</span>
              <span className="font-semibold text-gray-900">
                {settings.liveness_enabled ? `Active (${settings.liveness_threshold}%)` : 'Off'}
              </span>
            </li>
            <li className="flex justify-between py-1 border-b border-gray-100">
              <span>Geofence Policy</span>
              <span className="font-semibold text-gray-900">{settings.geofence_mode}</span>
            </li>
            <li className="flex justify-between py-1 border-b border-gray-100">
              <span>Max GPS Accuracy</span>
              <span className="font-semibold text-gray-900">{settings.max_gps_accuracy_meters}m</span>
            </li>
            <li className="flex justify-between py-1 border-b border-gray-100">
              <span>Offline Queueing</span>
              <span className="font-semibold text-gray-900">
                {settings.offline_queue_enabled ? 'Enabled (Pending Verify)' : 'Disabled'}
              </span>
            </li>
            <li className="flex justify-between py-1">
              <span>Image Retention</span>
              <span className="font-semibold text-gray-900">{settings.retention_days_images} days</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

