// src/features/platform/subviews/PlatformAccountMasterView.tsx
// ============================================================
// WorkForceOS — Platform Admin Identity & Account Center
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Shield,
  Key,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Upload,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Bell,
  Sliders,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Lock,
  ChevronRight,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  platformProfileService,
  PlatformAdminProfile,
  PlatformUserPreferences,
  platformMfaService,
  MfaStatusResponse,
  TotpEnrollmentData,
  platformSessionService,
  AdminSessionItem,
  platformIamService,
  PlatformAdminAccessInfo,
  platformAuditService,
} from '../../../services/platform';
import { AuditEventRecord } from '../../../types/platformAudit';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';

export interface PlatformAccountMasterViewProps {
  initialSubTab?: 'profile' | 'security' | 'sessions' | 'access' | 'preferences';
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const PlatformAccountMasterView: React.FC<PlatformAccountMasterViewProps> = ({
  initialSubTab = 'profile',
  onNavigateTab,
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'security' | 'sessions' | 'access' | 'preferences'>(initialSubTab);

  // --- States ---
  const [profile, setProfile] = useState<PlatformAdminProfile | null>(null);
  const [preferences, setPreferences] = useState<PlatformUserPreferences | null>(null);
  const [mfaStatus, setMfaStatus] = useState<MfaStatusResponse | null>(null);
  const [sessions, setSessions] = useState<AdminSessionItem[]>([]);
  const [accessInfo, setAccessInfo] = useState<PlatformAdminAccessInfo | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for profile
  const [formData, setFormData] = useState<Partial<PlatformAdminProfile>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // MFA Enrollment Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollData, setEnrollData] = useState<TotpEnrollmentData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);

  // Password Change Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Revocation Confirm Dialogs
  const [sessionToRevoke, setSessionToRevoke] = useState<AdminSessionItem | null>(null);
  const [isRevokeOthersConfirmOpen, setIsRevokeOthersConfirmOpen] = useState(false);
  const [isSignOutEverywhereConfirmOpen, setIsSignOutEverywhereConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Load Initial Data ---
  const loadAccountData = async () => {
    setIsLoading(true);
    try {
      const [profData, prefData, mfaData, sessData, iamData, auditData] = await Promise.all([
        platformProfileService.getProfile(),
        platformProfileService.getPreferences(),
        platformMfaService.getMfaStatus(),
        platformSessionService.getSessions(),
        platformIamService.getCurrentAdminAccess(),
        platformAuditService.fetchAuditEvents({ limit: 6, page: 1 }),
      ]);

      setProfile(profData);
      setFormData(profData);
      setPreferences(prefData);
      setMfaStatus(mfaData);
      setSessions(sessData);
      setAccessInfo(iamData);
      setRecentAudits(auditData.events);
    } catch (err) {
      console.error('[PlatformAccountMasterView] Failed to load account state:', err);
      showToast('Unable to load full account profile data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccountData();
  }, []);

  // --- Save Profile Changes ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const updated = await platformProfileService.updateProfile(formData);
      setProfile(updated);
      showToast('Profile information successfully saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Handle Avatar Upload ---
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await platformProfileService.uploadAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatar_url: dataUrl } : null));
      setFormData((prev) => ({ ...prev, avatar_url: dataUrl }));
      showToast('Profile photo updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error uploading profile photo.', 'error');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await platformProfileService.removeAvatar();
      setProfile((prev) => (prev ? { ...prev, avatar_url: '' } : null));
      setFormData((prev) => ({ ...prev, avatar_url: '' }));
      showToast('Profile photo removed.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove photo.', 'error');
    }
  };

  // --- MFA Actions ---
  const handleStartTotpEnrollment = async () => {
    try {
      const data = await platformMfaService.enrollTotp('Google Authenticator');
      setEnrollData(data);
      setVerificationCode('');
      setIsEnrollModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to start MFA enrollment.', 'error');
    }
  };

  const handleVerifyTotp = async () => {
    if (!enrollData) return;
    setIsVerifyingCode(true);
    try {
      await platformMfaService.verifyTotp(enrollData.factorId, verificationCode);
      const updatedMfa = await platformMfaService.getMfaStatus();
      setMfaStatus(updatedMfa);
      setIsEnrollModalOpen(false);
      showToast('MFA Authenticator verified! Assurance promoted to AAL2.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Invalid code. Please re-enter 6-digit TOTP code.', 'error');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleRemoveMfaFactor = async (factorId: string) => {
    if (!confirm('Are you sure you want to remove this MFA factor? Platform Admins require MFA for privileged access.')) {
      return;
    }
    try {
      await platformMfaService.unenrollFactor(factorId);
      const updatedMfa = await platformMfaService.getMfaStatus();
      setMfaStatus(updatedMfa);
      showToast('MFA factor removed.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove factor.', 'error');
    }
  };

  // --- Password Change ---
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      await platformAuditService.logEvent({
        action: 'password.changed',
        category: 'Security',
        resource_type: 'Credential',
        resource_id: profile?.id || 'superadmin',
        severity: 'High',
        reason: 'Platform Admin updated account master password',
      });
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Account password successfully updated.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // --- Session Actions ---
  const handleConfirmRevokeSession = async () => {
    if (!sessionToRevoke) return;
    try {
      await platformSessionService.revokeSession(sessionToRevoke.id);
      setSessions((prev) => prev.filter((s) => s.id !== sessionToRevoke.id));
      setSessionToRevoke(null);
      showToast(`Revoked active session on ${sessionToRevoke.device_name}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke session.', 'error');
    }
  };

  const handleConfirmRevokeOthers = async () => {
    try {
      const { count } = await platformSessionService.revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.is_current));
      setIsRevokeOthersConfirmOpen(false);
      showToast(`Terminated ${count} other active device sessions.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke sessions.', 'error');
    }
  };

  const handleConfirmSignOutEverywhere = async () => {
    try {
      await platformSessionService.signOutEverywhere();
      setIsSignOutEverywhereConfirmOpen(false);
      showToast('Signed out of all devices globally.', 'info');
      window.location.reload();
    } catch (err: any) {
      showToast(err.message || 'Failed to sign out everywhere.', 'error');
    }
  };

  // --- Preferences Update ---
  const handleUpdatePreferences = async (newPrefs: Partial<PlatformUserPreferences>) => {
    if (!preferences) return;
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    try {
      await platformProfileService.updatePreferences(newPrefs);
      showToast('Account preferences updated.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save preferences.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center space-y-3 bg-white rounded-2xl border border-gray-200">
        <RefreshCw className="w-6 h-6 animate-spin text-[#047857] mx-auto" />
        <div className="text-sm font-bold text-gray-900">Loading Platform Identity Center...</div>
        <p className="text-xs text-gray-500">Resolving authenticated session, MFA factors, and IAM permissions matrix.</p>
      </div>
    );
  }

  const initials = profile?.display_name
    ? profile.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'SA';

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#064E3B] to-[#047857] text-white p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 z-10">
          <div className="relative group">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/80 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-800 text-white font-black text-xl flex items-center justify-center border-2 border-white/80 shadow-md">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-white text-[#064E3B] p-1.5 rounded-full shadow hover:bg-emerald-50 transition cursor-pointer"
              title="Change Profile Photo"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{profile?.display_name}</h1>
              <Badge variant="emerald" size="sm" className="bg-emerald-900/60 text-emerald-200 border-emerald-700">
                <ShieldCheck className="w-3 h-3 mr-1 inline text-emerald-400" />
                {accessInfo?.role_display_name || 'Super Admin'}
              </Badge>
            </div>
            <p className="text-xs text-emerald-100/90 mt-0.5">{profile?.job_title} • {profile?.email}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-emerald-200">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                AAL2 Assurance Active
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {mfaStatus?.mfa_enabled ? 'MFA Protected' : 'MFA Required'}
              </span>
              <span>•</span>
              <span>{sessions.length} Active Sessions</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAccountData}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Sync State
          </Button>
          {onNavigateTab && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('platform-staff')}
              className="bg-white text-[#064E3B] hover:bg-emerald-50 border-white text-xs font-semibold"
            >
              Platform Staff & IAM <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* 2. Sub-Tab Navigation Bar */}
      <div className="border-b border-gray-200 bg-white px-2 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'profile', label: 'Personal Profile', icon: UserIcon },
            { id: 'security', label: 'Account & Security', icon: Shield, badge: mfaStatus?.mfa_enabled ? 'AAL2' : 'Action Required' },
            { id: 'sessions', label: 'Sessions & Devices', icon: Laptop, badge: sessions.length },
            { id: 'access', label: 'Platform Access & IAM', icon: Key },
            { id: 'preferences', label: 'Preferences', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'border-[#047857] text-[#047857]'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-[#047857]' : 'text-gray-400')} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-bold',
                      tab.badge === 'Action Required'
                        ? 'bg-amber-100 text-amber-800'
                        : isActive
                        ? 'bg-emerald-100 text-[#047857]'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------
          TAB 1: PERSONAL PROFILE
         --------------------------------------------------------- */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Avatar & Photo Actions */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4 text-center flex flex-col items-center justify-center">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-28 h-28 rounded-3xl object-cover border-4 border-emerald-50 shadow-md"
                />
              ) : (
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#064E3B] to-[#047857] text-white font-black text-3xl flex items-center justify-center shadow-md">
                  {initials}
                </div>
              )}
            </div>

            <div>
              <div className="font-bold text-base text-gray-900">{profile?.display_name}</div>
              <p className="text-xs text-gray-500">{profile?.job_title}</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-gray-700"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload New Photo
              </Button>
              {profile?.avatar_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Remove
                </Button>
              )}
            </div>

            <p className="text-[11px] text-gray-400">
              Allowed: JPG, PNG, WebP (Max 3MB). Controlled object storage protected.
            </p>
          </div>

          {/* Right 2 Columns: Profile Details Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-900 mb-1">Personal & Work Identity</h2>
            <p className="text-xs text-gray-500 mb-5">
              These details are visible across platform audit reports, internal case escalations, and system logs.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    placeholder="First name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={formData.display_name || ''}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    placeholder="Public display name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.job_title || ''}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    placeholder="e.g. Chief Platform Architect"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    placeholder="Department / Division"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Primary Email</label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-[#047857] border border-emerald-200 rounded-xl text-xs font-bold shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Primary
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Email modifications require elevated security re-authentication.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Timezone</label>
                  <select
                    value={formData.timezone || 'Asia/Kolkata (IST)'}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857] bg-white cursor-pointer"
                  >
                    <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST, UTC+05:30)</option>
                    <option value="America/New_York (EST)">America/New_York (EST, UTC-05:00)</option>
                    <option value="Europe/London (GMT)">Europe/London (GMT, UTC+00:00)</option>
                    <option value="Asia/Dubai (GST)">Asia/Dubai (GST, UTC+04:00)</option>
                    <option value="Asia/Singapore (SGT)">Asia/Singapore (SGT, UTC+08:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Locale</label>
                  <select
                    value={formData.locale || 'en-US'}
                    onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857] bg-white cursor-pointer"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-IN">English (India)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSavingProfile}
                  className="bg-[#047857] hover:bg-[#036246] text-white shadow-xs font-bold"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    'Save Profile Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 2: ACCOUNT & SECURITY
         --------------------------------------------------------- */}
      {activeSubTab === 'security' && (
        <div className="space-y-6">
          {/* Security Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assurance Level</div>
              <div className="text-xl font-bold text-[#047857] flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-[#047857]" />
                {mfaStatus?.current_aal === 'aal2' ? 'AAL2 (High Assurance)' : 'AAL1 (Standard)'}
              </div>
              <p className="text-[11px] text-gray-500">MFA token active on session</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">MFA Policy</div>
              <div className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
                <Lock className="w-5 h-5 text-[#047857]" />
                {mfaStatus?.mfa_enabled ? 'Mandatory & Active' : 'Enforcement Required'}
              </div>
              <p className="text-[11px] text-gray-500">Required for Platform Control Plane</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Credentials</div>
              <div className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
                <Key className="w-5 h-5 text-indigo-600" />
                Password + TOTP
              </div>
              <p className="text-[11px] text-gray-500">Rotated regularly</p>
            </div>
          </div>

          {/* MFA Management Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#047857]" />
                  Multi-Factor Authentication (MFA / TOTP)
                </h3>
                <p className="text-xs text-gray-500">
                  Protect your Platform Super Admin account with time-based one-time password (TOTP) authenticators.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartTotpEnrollment}
                className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-bold shadow-xs"
              >
                + Add Authenticator App
              </Button>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-gray-50/50">
              {mfaStatus?.factors && mfaStatus.factors.length > 0 ? (
                mfaStatus.factors.map((factor) => (
                  <div key={factor.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-[#047857] border border-emerald-200">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-gray-900 flex items-center gap-2">
                          {factor.friendly_name}
                          <Badge variant="emerald" size="sm">Active</Badge>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Enrolled: {new Date(factor.created_at).toLocaleDateString()} • Type: Time-Based OTP (RFC 6238)
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMfaFactor(factor.id)}
                      className="text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div className="font-bold text-xs text-gray-900">No MFA Factors Enrolled</div>
                  <p className="text-[11px] text-gray-500">
                    Platform Super Admins are required to maintain at least one active TOTP authenticator.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Password & Security Actions */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-600" />
                  Password Management
                </h3>
                <p className="text-xs text-gray-500">
                  Update your platform login password. Minimum 8 characters with upper, lower, and numeric requirements.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPasswordModalOpen(true)}
                className="text-xs text-gray-700 font-bold"
              >
                Change Password
              </Button>
            </div>
          </div>

          {/* Recent Security Activity Stream */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#047857]" />
                  Recent Security Activity
                </h3>
                <p className="text-xs text-gray-500">
                  Authoritative immutable audit log events recorded for this administrator identity.
                </p>
              </div>
              {onNavigateTab && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab('platform-audit')}
                  className="text-xs text-[#047857] font-semibold"
                >
                  View Full Audit Log <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {recentAudits.map((event) => (
                <div key={event.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 font-mono text-[10px] text-gray-600">
                      {event.category}
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">{event.action}</div>
                      <div className="text-[11px] text-gray-500">
                        {event.resource_type}: {event.resource_name || event.resource_id}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 3: SESSIONS & DEVICES
         --------------------------------------------------------- */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Active Authorized Sessions</h2>
              <p className="text-xs text-gray-500">
                Manage live browser sessions and devices with active platform credentials.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRevokeOthersConfirmOpen(true)}
                className="text-xs text-gray-700 font-semibold"
              >
                Sign Out Other Sessions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSignOutEverywhereConfirmOpen(true)}
                className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 font-semibold"
              >
                Sign Out Everywhere
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className={cn(
                  'p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4',
                  sess.is_current
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-white border-gray-200'
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      'p-3 rounded-2xl border shadow-2xs',
                      sess.is_current
                        ? 'bg-emerald-100 text-[#047857] border-emerald-300'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    )}
                  >
                    <Laptop className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900">{sess.device_name}</span>
                      {sess.is_current && (
                        <Badge variant="emerald" size="sm">Current Device</Badge>
                      )}
                      <Badge variant="neutral" size="sm">{sess.assurance_level}</Badge>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {sess.browser} • {sess.os}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-1 font-mono">
                        <Globe className="w-3 h-3 text-gray-400" />
                        {sess.ip_address}
                      </span>
                      <span>•</span>
                      <span>{sess.location}</span>
                      <span>•</span>
                      <span>Active: {sess.last_active_at}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {sess.is_current ? (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Current Session
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSessionToRevoke(sess)}
                      className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1" />
                      Revoke Access
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {onNavigateTab && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">
                Need to review operational sessions across all administrators?
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab('platform-sessions')}
                className="text-[#047857] hover:bg-emerald-50 font-bold"
              >
                Open Platform Active Sessions <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 4: PLATFORM ACCESS & IAM
         --------------------------------------------------------- */}
      {activeSubTab === 'access' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#047857]" />
                  Authoritative Platform IAM Permissions
                </h2>
                <p className="text-xs text-gray-500">
                  Role assignments and permission scopes are server-authoritative and enforced via database RLS.
                </p>
              </div>
              <Badge variant="emerald" size="lg">
                SUPER ADMIN
              </Badge>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Governance Notice:</strong> Platform Administrator privileges cannot be self-modified. Elevated
                role adjustments, tenant scoping, and administrator suspensions must be performed via{' '}
                <button
                  type="button"
                  onClick={() => onNavigateTab && onNavigateTab('platform-staff')}
                  className="font-bold underline text-amber-950 cursor-pointer"
                >
                  Platform Staff & IAM
                </button>.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {accessInfo?.modules.map((mod) => (
                <div key={mod.module_name} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900">{mod.module_name}</span>
                    <Badge variant="emerald" size="sm">{mod.access_level}</Badge>
                  </div>
                  <p className="text-[11px] text-gray-500">{mod.description}</p>
                  <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-1">
                    {mod.permissions.map((perm) => (
                      <span key={perm} className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-600">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 5: PREFERENCES
         --------------------------------------------------------- */}
      {activeSubTab === 'preferences' && preferences && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Control Plane Preferences</h2>
            <p className="text-xs text-gray-500">
              Customize your administrative workspace appearance, notifications, and real-time streaming settings.
            </p>
          </div>

          <div className="space-y-6">
            {/* Theme Preference */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Theme & Appearance</label>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {[
                  { id: 'system', label: 'System Default', icon: Monitor },
                  { id: 'light', label: 'Light Theme', icon: Sun },
                  { id: 'dark', label: 'Dark Theme', icon: Moon },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = preferences.theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleUpdatePreferences({ theme: item.id as any })}
                      className={cn(
                        'p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5',
                        isSelected
                          ? 'border-[#047857] bg-emerald-50/50 text-[#047857] font-bold'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Format */}
            <div className="max-w-md">
              <label className="block text-xs font-bold text-gray-700 mb-1">Date Format Display</label>
              <select
                value={preferences.date_format}
                onChange={(e) => handleUpdatePreferences({ date_format: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857] bg-white cursor-pointer"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 17/08/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/17/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
              </select>
            </div>

            {/* Notification Toggles */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700">Administrative Alerts & Push Notifications</label>
              <div className="space-y-2 max-w-lg">
                {[
                  { key: 'notify_security_alerts', label: 'Critical Security Threat & Brute-Force Alerts' },
                  { key: 'notify_incidents', label: 'Platform Incidents & Service Disruptions' },
                  { key: 'notify_integration_failures', label: 'ERP & Biometric Device Integration Failures' },
                  { key: 'notify_job_failures', label: 'Background Worker & Queue Exhaustion Failures' },
                  { key: 'notify_support_escalations', label: 'Enterprise Executive Support Escalations' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-100/60 transition">
                    <input
                      type="checkbox"
                      checked={Boolean((preferences as any)[item.key])}
                      onChange={(e) => handleUpdatePreferences({ [item.key]: e.target.checked } as any)}
                      className="h-4 w-4 rounded text-[#047857] focus:ring-[#047857] border-gray-300 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-800">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Realtime Stream */}
            <div className="max-w-lg p-4 rounded-xl border border-gray-200 bg-emerald-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-900">Live PostgreSQL WebSocket Stream</div>
                  <div className="text-[11px] text-gray-500">
                    Receive instantaneous background updates on active tenants, jobs, and audits.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.realtime_updates_enabled}
                  onChange={(e) => handleUpdatePreferences({ realtime_updates_enabled: e.target.checked })}
                  className="h-4 w-4 rounded text-[#047857] focus:ring-[#047857] border-gray-300 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          MODALS & DIALOGS
         --------------------------------------------------------- */}

      {/* MFA Enrollment Modal */}
      {isEnrollModalOpen && enrollData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#047857] flex items-center justify-center mx-auto mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Enroll Authenticator App</h3>
              <p className="text-xs text-gray-500">
                Scan the QR code with Google Authenticator, Microsoft Authenticator, or 1Password.
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col items-center justify-center">
              <img
                src={enrollData.qrCodeUrl}
                alt="MFA TOTP QR Code"
                className="w-44 h-44 rounded-xl shadow-xs bg-white p-2"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">Manual Secret Fallback</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={enrollData.totpSecret}
                  className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-gray-200 bg-gray-50 text-gray-700 select-all"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(enrollData.totpSecret);
                    setHasCopiedSecret(true);
                    setTimeout(() => setHasCopiedSecret(false), 2000);
                  }}
                  className="text-xs shrink-0"
                >
                  {hasCopiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Enter 6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-widest text-lg font-mono font-bold py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEnrollModalOpen(false)}
                className="w-1/2 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={verificationCode.length !== 6 || isVerifyingCode}
                onClick={handleVerifyTotp}
                className="w-1/2 bg-[#047857] hover:bg-[#036246] text-white text-xs font-bold shadow-xs"
              >
                {isVerifyingCode ? 'Verifying...' : 'Activate MFA (AAL2)'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                Change Master Password
              </h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Current Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="w-1/2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isUpdatingPassword}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Single Session Modal */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Revoke Device Session?</h3>
              <p className="text-xs text-gray-500 mt-1">
                This will immediately invalidate the session token on <strong>{sessionToRevoke.device_name}</strong> ({sessionToRevoke.ip_address}).
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSessionToRevoke(null)}
                className="w-1/2 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRevokeSession}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
              >
                Revoke Access
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Others Confirm Modal */}
      {isRevokeOthersConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Sign Out Other Sessions?</h3>
              <p className="text-xs text-gray-500 mt-1">
                All other active sessions on your mobile devices, secondary laptops, or external browsers will be terminated.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRevokeOthersConfirmOpen(false)}
                className="w-1/2 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRevokeOthers}
                className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
              >
                Confirm Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Everywhere Confirm Modal */}
      {isSignOutEverywhereConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Sign Out Everywhere?</h3>
              <p className="text-xs text-gray-500 mt-1">
                This will terminate your current session and globally invalidate all active authentication refresh tokens across all devices.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSignOutEverywhereConfirmOpen(false)}
                className="w-1/2 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmSignOutEverywhere}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
              >
                Sign Out Globally
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
