// src/features/attendance/subviews/MobilePunchPolicyView.tsx
// ============================================================================
// Joy PeopleHR — Mobile Punch & Attendance Channel Governance Subview
// Enables runtime toggling of In-App Mobile Check-In / Check-Out & Biometric
// terminal enforcement per organization (e.g., Electra EV, Joy Corporate Solutions)
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Cpu,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Zap,
  SlidersHorizontal,
  Info,
  Clock,
  Radio,
  ArrowRight,
  Check,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import {
  attendancePunchPolicyService,
  OrgPunchPolicy,
  AttendanceMode,
} from '../../../services/attendance/attendancePunchPolicyService';
import { useTenant } from '../../../hooks/useTenant';

export interface MobilePunchPolicyViewProps {
  onBack?: () => void;
  onNavigateSubPath?: (subPath: string) => void;
}

export const MobilePunchPolicyView: React.FC<MobilePunchPolicyViewProps> = ({
  onBack,
  onNavigateSubPath,
}) => {
  const { showToast } = useToast();
  const { organization } = useTenant();

  const [policies, setPolicies] = useState<OrgPunchPolicy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // Active form state for the selected organization
  const [formMode, setFormMode] = useState<AttendanceMode>('HYBRID');
  const [formMobileEnabled, setFormMobileEnabled] = useState<boolean>(true);
  const [formAllowCheckin, setFormAllowCheckin] = useState<boolean>(true);
  const [formAllowCheckout, setFormAllowCheckout] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await attendancePunchPolicyService.fetchAllPolicies();
      setPolicies(list);

      // Select currently active organization if present, or first
      if (list.length > 0) {
        const preferred = list.find(p => p.id === organization?.id) || list[0];
        setSelectedOrgId(preferred.id);
        setFormMode(preferred.attendance_mode);
        setFormMobileEnabled(preferred.mobile_punch_enabled);
        setFormAllowCheckin(preferred.allow_mobile_checkin);
        setFormAllowCheckout(preferred.allow_mobile_checkout);
      }
    } catch (err: any) {
      showToast('Error loading organization attendance policies: ' + (err.message || err), 'error');
    } finally {
      setLoading(false);
    }
  }, [organization?.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When selected organization changes, update form state
  const handleSelectOrg = (org: OrgPunchPolicy) => {
    setSelectedOrgId(org.id);
    setFormMode(org.attendance_mode);
    setFormMobileEnabled(org.mobile_punch_enabled);
    setFormAllowCheckin(org.allow_mobile_checkin);
    setFormAllowCheckout(org.allow_mobile_checkout);
  };

  const handleModeChange = (newMode: AttendanceMode) => {
    setFormMode(newMode);
    if (newMode === 'BIOMETRIC_ONLY') {
      setFormMobileEnabled(false);
      setFormAllowCheckin(false);
      setFormAllowCheckout(false);
    } else if (newMode === 'HYBRID' || newMode === 'MOBILE_ONLY') {
      setFormMobileEnabled(true);
      setFormAllowCheckin(true);
      setFormAllowCheckout(true);
    }
  };

  const handleSave = async () => {
    if (!selectedOrgId) return;
    setSaving(true);
    try {
      const updated = await attendancePunchPolicyService.updatePolicy(selectedOrgId, {
        attendance_mode: formMode,
        mobile_punch_enabled: formMode === 'BIOMETRIC_ONLY' ? false : formMobileEnabled,
        allow_mobile_checkin: formMode === 'BIOMETRIC_ONLY' ? false : formAllowCheckin,
        allow_mobile_checkout: formMode === 'BIOMETRIC_ONLY' ? false : formAllowCheckout,
      });

      // Update state in policies list
      setPolicies(prev => prev.map(p => (p.id === selectedOrgId ? updated : p)));

      showToast(
        `✓ ${updated.legal_name} attendance policy saved! Mode: ${updated.attendance_mode}. Flutter app updated immediately.`,
        'success'
      );
    } catch (err: any) {
      showToast('Failed to save policy: ' + (err.message || err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedPolicy = policies.find(p => p.id === selectedOrgId);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Mobile Punch & Attendance Channel Controls</h1>
            <Badge variant="emerald" className="text-[11px] font-bold">
              Runtime Configurable
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            Configure whether employees can check in/out via the Flutter mobile app or are restricted strictly to physical biometric hardware terminals. No codebase deployment required.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || !selectedOrgId}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving Policy...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Save Policy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Main Content Grid: Organization List + Policy Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Organization Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              Organizations ({policies.length})
            </h2>
            <span className="text-[11px] text-gray-400">Select to manage</span>
          </div>

          <div className="space-y-2">
            {policies.map(org => {
              const isSelected = org.id === selectedOrgId;
              const isBiometric = org.attendance_mode === 'BIOMETRIC_ONLY';

              return (
                <div
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  className={cn(
                    'p-4 rounded-2xl border transition-all cursor-pointer text-left',
                    isSelected
                      ? 'bg-emerald-50/50 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                      : 'bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        {org.legal_name}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        slug: {org.slug || org.id.slice(0, 8)}
                      </div>
                    </div>
                    {isBiometric ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Lock className="w-3 h-3" /> Biometric Only
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <Unlock className="w-3 h-3" /> Hybrid / Mobile
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      Check-in: <strong className={org.allow_mobile_checkin ? 'text-emerald-700' : 'text-gray-400'}>{org.allow_mobile_checkin ? 'Enabled' : 'Disabled'}</strong>
                    </span>
                    <span>
                      Check-out: <strong className={org.allow_mobile_checkout ? 'text-emerald-700' : 'text-gray-400'}>{org.allow_mobile_checkout ? 'Enabled' : 'Disabled'}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Policy Configuration & Simulation Preview (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedPolicy ? (
            <>
              {/* Configuration Panel */}
              <div className="p-6 bg-white border border-gray-200/80 rounded-3xl shadow-2xs space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      Policy Settings for {selectedPolicy.legal_name}
                    </h2>
                    <Badge variant={formMode === 'BIOMETRIC_ONLY' ? 'warning' : 'emerald'}>
                      Current: {formMode}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the attendance punch channels authorized for this organization.
                  </p>
                </div>

                {/* Mode Selector Cards */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Primary Attendance Mode
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 1. Biometric Only */}
                    <div
                      onClick={() => handleModeChange('BIOMETRIC_ONLY')}
                      className={cn(
                        'p-4 rounded-2xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between',
                        formMode === 'BIOMETRIC_ONLY'
                          ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                            <Cpu className="w-4 h-4" />
                          </span>
                          {formMode === 'BIOMETRIC_ONLY' && (
                            <CheckCircle2 className="w-4 h-4 text-amber-600" />
                          )}
                        </div>
                        <div className="font-bold text-gray-900 text-xs">Biometric Terminal Only</div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Strict factory/shift hardware punches only. In-app mobile punch buttons are locked to prevent unauthorized mid-shift mobile checkouts.
                        </p>
                      </div>
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full inline-block">
                          Electra EV Recommended
                        </span>
                      </div>
                    </div>

                    {/* 2. Hybrid */}
                    <div
                      onClick={() => handleModeChange('HYBRID')}
                      className={cn(
                        'p-4 rounded-2xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between',
                        formMode === 'HYBRID'
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                            <SlidersHorizontal className="w-4 h-4" />
                          </span>
                          {formMode === 'HYBRID' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <div className="font-bold text-gray-900 text-xs">Hybrid (Biometric + Mobile)</div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Dual channels. Employees can punch either on the physical Biometric machine or in the Flutter mobile app inside geofence zones.
                        </p>
                      </div>
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block">
                          Corporate Standard
                        </span>
                      </div>
                    </div>

                    {/* 3. Mobile Only */}
                    <div
                      onClick={() => handleModeChange('MOBILE_ONLY')}
                      className={cn(
                        'p-4 rounded-2xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between',
                        formMode === 'MOBILE_ONLY'
                          ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                            <Smartphone className="w-4 h-4" />
                          </span>
                          {formMode === 'MOBILE_ONLY' && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="font-bold text-gray-900 text-xs">Mobile App Only</div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          For field and sales workforce where no physical biometric hardware exists at their project locations.
                        </p>
                      </div>
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-full inline-block">
                          Field Workforce
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Granular Toggles */}
                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-gray-600" />
                        Granular Mobile In-App Permissions
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Fine-tune check-in vs check-out permissions on employee mobile devices.
                      </p>
                    </div>
                    {formMode === 'BIOMETRIC_ONLY' && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Locked by Biometric-Only Mode
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Toggle 1: Mobile Punch Master */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-gray-900">Enable Mobile Punching</div>
                        <div className="text-[11px] text-gray-500">
                          Allow attendance punches directly through the mobile app.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        disabled={formMode === 'BIOMETRIC_ONLY'}
                        checked={formMode === 'BIOMETRIC_ONLY' ? false : formMobileEnabled}
                        onChange={e => setFormMobileEnabled(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    {/* Toggle 2: Allow Mobile Check-In */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-gray-900">Allow Mobile Check-In</div>
                        <div className="text-[11px] text-gray-500">
                          Employees can start their work shift using mobile FaceID/GPS.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        disabled={formMode === 'BIOMETRIC_ONLY' || !formMobileEnabled}
                        checked={formMode === 'BIOMETRIC_ONLY' ? false : formAllowCheckin}
                        onChange={e => setFormAllowCheckin(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    {/* Toggle 3: Allow Mobile Check-Out */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-gray-900">Allow Mobile Check-Out</div>
                        <div className="text-[11px] text-gray-500">
                          Employees can end their shift on mobile. Turn OFF to prevent mid-shift mobile punchouts!
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        disabled={formMode === 'BIOMETRIC_ONLY' || !formMobileEnabled}
                        checked={formMode === 'BIOMETRIC_ONLY' ? false : formAllowCheckout}
                        onChange={e => setFormAllowCheckout(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Live Mobile App Simulation HUD */}
              <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold">Live Flutter Mobile App Preview</h3>
                  </div>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400/40 text-[10px]">
                    Real-Time Simulation
                  </Badge>
                </div>
                <p className="text-xs text-slate-300">
                  This simulates how the mobile attendance cards will render on the phone for an employee assigned to <strong>{selectedPolicy.legal_name}</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Left Simulated Card: Check-In */}
                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <div className="text-[11px] text-slate-400 font-medium">Home Screen — Check-In Card</div>
                    {formMode === 'BIOMETRIC_ONLY' || !formAllowCheckin ? (
                      <div className="py-2.5 px-3 rounded-xl bg-slate-700/80 border border-slate-600 flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        Biometric Terminal Only
                      </div>
                    ) : (
                      <div className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white flex items-center justify-center gap-2 text-xs font-bold shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Check In Now
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400">
                      {formMode === 'BIOMETRIC_ONLY' || !formAllowCheckin
                        ? '🔒 Tap shows notice: "Please punch on physical biometric machine."'
                        : '✓ GPS and FaceID enabled for shift start.'}
                    </div>
                  </div>

                  {/* Right Simulated Card: Check-Out */}
                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <div className="text-[11px] text-slate-400 font-medium">Active Shift — Check-Out Card</div>
                    {formMode === 'BIOMETRIC_ONLY' || !formAllowCheckout ? (
                      <div className="py-2.5 px-3 rounded-xl bg-slate-700/80 border border-slate-600 flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        Biometric Only
                      </div>
                    ) : (
                      <div className="py-2.5 px-3 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center gap-2 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        Check-out
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400">
                      {formMode === 'BIOMETRIC_ONLY' || !formAllowCheckout
                        ? '🔒 Prevents mid-shift unapproved mobile checkout.'
                        : '✓ Normal employee mobile clock-out active.'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-500">
              Select an organization from the left to view and configure punch policies.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

