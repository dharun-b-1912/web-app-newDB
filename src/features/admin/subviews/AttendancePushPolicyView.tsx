// src/features/admin/subviews/AttendancePushPolicyView.tsx
// ============================================================================
// JOY PeopleHR — Manager Attendance Push Notification & Anti-Fatigue Policy Hub
// Configures push notification sensitivity, anti-fatigue suppression for 50-100
// employee teams, biometrics vs mobile GPS punch scope, and digest alerts.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import {
  Smartphone,
  Bell,
  Volume2,
  VolumeX,
  ShieldCheck,
  Users,
  Clock,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Fingerprint,
  MapPin,
  Play,
  RefreshCw,
  Check,
  Send,
  Radio,
  LogOut,
} from 'lucide-react';
import {
  attendanceNotificationService,
  AttendanceNotificationPolicy,
  DEFAULT_ATTENDANCE_NOTIFICATION_POLICY,
} from '../../../services/attendance/attendanceNotificationService';
import { useTenant } from '../../../hooks/useTenant';

export const AttendancePushPolicyView: React.FC = () => {
  const { showToast } = useToast();
  const { organization } = useTenant();
  const activeOrgId = organization?.id || '0c621892-e938-4707-9957-13534ea32c19';

  // Policy Form State
  const [policy, setPolicy] = useState<AttendanceNotificationPolicy>({
    ...DEFAULT_ATTENDANCE_NOTIFICATION_POLICY,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Load active policy on mount
  useEffect(() => {
    const loaded = attendanceNotificationService.getPolicy(activeOrgId);
    setPolicy(loaded);
  }, [activeOrgId]);

  // Handle Save
  const handleSavePolicy = async () => {
    setIsSaving(true);
    try {
      const updated = attendanceNotificationService.setPolicy(policy, activeOrgId);
      setPolicy(updated);
      showToast('Attendance push notification policy saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save policy', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    setPolicy({ ...DEFAULT_ATTENDANCE_NOTIFICATION_POLICY });
    showToast('Reset to enterprise recommended anti-fatigue policy', 'info');
  };

  // Live Test Dispatch
  const handleRunSimulation = async (isLate: boolean, punchType: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN') => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await attendanceNotificationService.handleAttendanceEventAccepted({
        organizationId: activeOrgId,
        employeeId: 'e0000000-0000-4000-8000-fcad91430e98',
        employeeCode: 'JCS-099',
        employeeName: 'Arjun Kumar',
        eventType: punchType === 'CHECK_IN' ? 'attendance.check_in.accepted' : 'attendance.check_out.accepted',
        punchType,
        source: 'MOBILE',
        punchTime: new Date().toISOString(),
        isLate: punchType === 'CHECK_IN' ? isLate : false,
        lateMinutes: isLate ? 42 : 0,
        graceMinutes: policy.graceMinutes,
        shiftStart: '09:00',
        idempotencyKey: `sim-${Date.now()}-${punchType.toLowerCase()}-${isLate ? 'late' : 'ontime'}`,
      });
      setTestResult(res);
      const delivery = res.deliveries.find(d => d.channel === 'PUSH');
      if (delivery?.status === 'SENT') {
        showToast(
          punchType === 'CHECK_OUT'
            ? 'Check-out alert delivered to manager lock screen!'
            : 'High-priority push delivered to manager lock screen!',
          'success'
        );
      } else if (delivery?.status === ('SKIPPED_POLICY_SILENT' as any)) {
        showToast(
          punchType === 'CHECK_OUT'
            ? 'Check-out kept silent in inbox per HR policy (0 phone vibrations)'
            : 'On-time punch kept silent per anti-fatigue policy (0 vibrations)',
          'info'
        );
      } else {
        showToast(`Simulation processed: ${delivery?.status || 'Complete'}`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Simulation test failed', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Anti-Fatigue Shield HUD */}
      <div className="bg-gradient-to-r from-[#064E3B] via-[#07563D] to-[#043629] p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Reporting Manager Protection</span>
              <span>•</span>
              <span>50–100 Employee Teams</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              Attendance Push & Anti-Fatigue Alert Rules
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Configures how mobile push notifications behave when employees check in via{' '}
              <strong className="text-white">Biometric Terminals</strong> or{' '}
              <strong className="text-white">Mobile GPS</strong>. Protects managers with large teams from notification fatigue while ensuring critical exceptions are never missed.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shrink-0">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              {policy.onTimeDeliveryMode === 'SILENT' ? (
                <VolumeX className="w-5 h-5 text-emerald-300" />
              ) : (
                <Volume2 className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Anti-Fatigue Guard</span>
              <span className="text-sm font-black text-white">
                {policy.onTimeDeliveryMode === 'SILENT' ? 'Active (Silent Normal Punches)' : 'Full Broadcast (All Punches Buzz)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Punch Source Scope */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-100">
              <Layers className="w-5 h-5 text-[#07563D]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">1. Punch Channel Ingestion Scope</h3>
              <p className="text-xs text-gray-500">Select which punch sources trigger manager attendance notifications.</p>
            </div>
          </div>
          <Badge variant="outline" size="sm" className="font-mono text-[10px]">
            Dual-Source Pipeline
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Biometric Machines */}
          <div
            onClick={() => setPolicy(p => ({ ...p, enableBiometricPunches: !p.enableBiometricPunches }))}
            className={cn(
              'p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none',
              policy.enableBiometricPunches
                ? 'border-[#07563D] bg-emerald-50/40'
                : 'border-gray-200 bg-gray-50/50 opacity-75'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-[#07563D]" />
                <span className="text-xs font-bold text-gray-900">Biometric Machines</span>
              </div>
              <input
                type="checkbox"
                checked={policy.enableBiometricPunches}
                onChange={() => {}}
                className="w-4 h-4 text-[#07563D] rounded focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              LAN/WAN eSSL, ZKTeco, and Mantra terminals reporting through the Biometric Gateway.
            </p>
          </div>

          {/* Mobile GPS */}
          <div
            onClick={() => setPolicy(p => ({ ...p, enableMobileGpsPunches: !p.enableMobileGpsPunches }))}
            className={cn(
              'p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none',
              policy.enableMobileGpsPunches
                ? 'border-[#07563D] bg-emerald-50/40'
                : 'border-gray-200 bg-gray-50/50 opacity-75'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#07563D]" />
                <span className="text-xs font-bold text-gray-900">Mobile App GPS</span>
              </div>
              <input
                type="checkbox"
                checked={policy.enableMobileGpsPunches}
                onChange={() => {}}
                className="w-4 h-4 text-[#07563D] rounded focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Employee Self-Service mobile app GPS check-in inside assigned geofenced office branches.
            </p>
          </div>

          {/* Web App Manual */}
          <div
            onClick={() => setPolicy(p => ({ ...p, enableWebPunches: !p.enableWebPunches }))}
            className={cn(
              'p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none',
              policy.enableWebPunches
                ? 'border-[#07563D] bg-emerald-50/40'
                : 'border-gray-200 bg-gray-50/50 opacity-75'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#07563D]" />
                <span className="text-xs font-bold text-gray-900">Web App Portal</span>
              </div>
              <input
                type="checkbox"
                checked={policy.enableWebPunches}
                onChange={() => {}}
                className="w-4 h-4 text-[#07563D] rounded focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Web browser portal attendance punches recorded from desktops or office kiosks.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Delivery Sensitivity & Punctuality Matrix */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-100">
              <Sliders className="w-5 h-5 text-[#07563D]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">2. Manager Delivery Sensitivity Matrix</h3>
              <p className="text-xs text-gray-500">
                Configure whether each event buzzes the manager's phone lock screen or stays quiet in the app.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Shift Grace: {policy.graceMinutes} Minutes
          </span>
        </div>

        {/* Matrix Rows */}
        <div className="space-y-3 pt-2">
          {/* Row A: On-Time Check-In */}
          <div className="p-4 rounded-xl border border-gray-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/40">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-gray-900">On-Time Check-In (Within Grace Window)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                  High Volume (50–100/day)
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                When employees arrive on time. Keep <strong className="text-gray-700">Silent</strong> to prevent manager phones from buzzing 100 times every morning.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, onTimeDeliveryMode: 'SILENT' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  policy.onTimeDeliveryMode === 'SILENT'
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Silent (In-App Feed Only)</span>
              </button>
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, onTimeDeliveryMode: 'PUSH' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  policy.onTimeDeliveryMode === 'PUSH'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Loud Push (Buzz Phone)</span>
              </button>
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, onTimeDeliveryMode: 'DISABLED' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  policy.onTimeDeliveryMode === 'DISABLED'
                    ? 'bg-gray-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                Off
              </button>
            </div>
          </div>

          {/* Row B: Late Check-In */}
          <div className="p-4 rounded-xl border border-gray-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/40">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-xs font-bold text-gray-900">Late Check-In (Past Grace Window)</span>
                <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded-full">
                  Actionable Exception
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Employee punches past shift start + grace. Sends an instant alert with exact minutes late.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, lateDeliveryMode: 'HIGH_PRIORITY_PUSH' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  policy.lateDeliveryMode === 'HIGH_PRIORITY_PUSH'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Instant High-Priority Push</span>
              </button>
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, lateDeliveryMode: 'SILENT' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  policy.lateDeliveryMode === 'SILENT'
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                Silent Feed
              </button>
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, lateDeliveryMode: 'DISABLED' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  policy.lateDeliveryMode === 'DISABLED'
                    ? 'bg-gray-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                Off
              </button>
            </div>
          </div>

          {/* Row C: Grace Period Threshold Slider */}
          <div className="p-4 rounded-xl border border-gray-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
            <div>
              <span className="text-xs font-bold text-gray-900 block">Shift Grace Period Threshold</span>
              <span className="text-[11px] text-gray-500 block">
                Punches within this window count as on-time (e.g., 09:00 to 09:30 AM for a 30m grace).
              </span>
            </div>
            <div className="flex items-center gap-3">
              {[15, 30, 45, 60].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setPolicy(p => ({ ...p, graceMinutes: mins }))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    policy.graceMinutes === mins
                      ? 'bg-[#07563D] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {mins} Mins
                </button>
              ))}
            </div>
          </div>

          {/* Row D: Out-of-Location / Geofence Breach */}
          <div className="p-4 rounded-xl border border-gray-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/40">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-gray-900">Out-of-Location Punch Alert</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Alerts manager immediately if an employee punches outside authorized office radius.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, unauthorizedLocationMode: 'HIGH_PRIORITY_PUSH' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  policy.unauthorizedLocationMode === 'HIGH_PRIORITY_PUSH'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                Critical Push
              </button>
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, unauthorizedLocationMode: 'SILENT' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  policy.unauthorizedLocationMode === 'SILENT'
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                Silent Feed
              </button>
            </div>
          </div>

          {/* Row E: Employee Check-Out Alert */}
          <div className="p-4 rounded-xl border border-gray-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/40">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-xs font-bold text-gray-900">Employee Check-Out Alert (Evening Departure)</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full">
                  Departure Punch
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Notifies manager when an employee checks out at end of shift or departs early.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, earlyCheckoutMode: 'PUSH' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  policy.earlyCheckoutMode === 'PUSH'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Loud Push</span>
              </button>
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, earlyCheckoutMode: 'SILENT' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  policy.earlyCheckoutMode === 'SILENT'
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Silent (In-App Only)</span>
              </button>
              <button
                type="button"
                onClick={() => setPolicy(p => ({ ...p, earlyCheckoutMode: 'DISABLED' }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  policy.earlyCheckoutMode === 'DISABLED'
                    ? 'bg-gray-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                )}
              >
                Off
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Anti-Fatigue Stacking & Digest Configuration */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-100">
            <Users className="w-5 h-5 text-[#07563D]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">3. Anti-Fatigue Notification Stacking (Android / iOS)</h3>
            <p className="text-xs text-gray-500">Collapses multiple alerts so 100 employee punches do not clutter the lock screen.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Grouping Card */}
          <div
            onClick={() => setPolicy(p => ({ ...p, enableNotificationGrouping: !p.enableNotificationGrouping }))}
            className={cn(
              'p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none',
              policy.enableNotificationGrouping
                ? 'border-[#07563D] bg-emerald-50/40'
                : 'border-gray-200 bg-gray-50/50'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Smart Lock-Screen Stacking</span>
              <input
                type="checkbox"
                checked={policy.enableNotificationGrouping}
                onChange={() => {}}
                className="w-4 h-4 text-[#07563D] rounded focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Automatically collapses all employee late check-ins for the day into <strong>1 single expandable card</strong> on Android and iOS.
            </p>
          </div>

          {/* Morning Digest Card */}
          <div
            onClick={() => setPolicy(p => ({ ...p, enableMorningDigest: !p.enableMorningDigest }))}
            className={cn(
              'p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none',
              policy.enableMorningDigest
                ? 'border-[#07563D] bg-emerald-50/40'
                : 'border-gray-200 bg-gray-50/50'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Daily Morning Shift Digest</span>
              <input
                type="checkbox"
                checked={policy.enableMorningDigest}
                onChange={() => {}}
                className="w-4 h-4 text-[#07563D] rounded focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Sends <strong>1 single consolidated push</strong> at shift cutoff ({policy.digestTime || '09:35 AM'}) summarizing: Present, Late, and Absent team counts.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Interactive Test Tool & Action Buttons */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Live Policy Verification</h3>
            <p className="text-xs text-gray-500">
              Simulate check-in events right now to verify how notifications arrive on your lock screen.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              disabled={isTesting}
              leftIcon={<VolumeX className="w-3.5 h-3.5 text-gray-600" />}
              onClick={() => handleRunSimulation(false)}
            >
              Test On-Time (Silent)
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isTesting}
              leftIcon={<Bell className="w-3.5 h-3.5 text-rose-600" />}
              onClick={() => handleRunSimulation(true, 'CHECK_IN')}
            >
              Test Late Punch (Loud Push)
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isTesting}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => handleRunSimulation(false, 'CHECK_OUT')}
            >
              Test Check-Out Punch
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleResetDefaults}
            >
              Reset Recommended
            </Button>
            <Button
              size="sm"
              isLoading={isSaving}
              leftIcon={<Check className="w-4 h-4" />}
              onClick={handleSavePolicy}
              className="bg-[#07563D] hover:bg-[#064e35] text-white shadow-xs font-semibold"
            >
              Save Policy Changes
            </Button>
          </div>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between text-gray-700 font-sans font-bold">
              <span>Simulation Result</span>
              <Badge variant="outline" size="sm">{testResult.id}</Badge>
            </div>
            <div className="text-gray-600">
              Punch: {testResult.punchingEmployee.name} ({testResult.source}) &bull; Recipients: {testResult.resolvedRecipients.map((r: any) => `${r.name} (${r.role})`).join(', ')}
            </div>
            <div className="space-y-1 pt-1 border-t border-gray-200">
              {testResult.deliveries.map((d: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold">{d.channel} to {d.recipientName}:</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold',
                    d.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' :
                    d.status === 'SKIPPED_POLICY_SILENT' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  )}>
                    {d.status} {d.errorMessage ? `(${d.errorMessage})` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
