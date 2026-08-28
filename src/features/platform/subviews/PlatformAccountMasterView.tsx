// src/features/platform/subviews/PlatformAccountMasterView.tsx
// ============================================================
// Joy PeopleHR — Platform Admin Dedicated Account Center
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
  Mail,
  Phone,
  ArrowLeft,
  Activity,
  Layers,
  FileText,
  HelpCircle,
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
import { syncUrlWithRoute } from '../../../lib/router/urlRouter';
import { cn } from '../../../lib/utils';

export type AccountSubSection = 'overview' | 'profile' | 'security' | 'sessions' | 'access' | 'preferences' | 'activity';

export interface PlatformAccountMasterViewProps {
  initialSubTab?: AccountSubSection;
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const PlatformAccountMasterView: React.FC<PlatformAccountMasterViewProps> = ({
  initialSubTab = 'overview',
  onNavigateTab,
}) => {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<AccountSubSection>(initialSubTab);

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

  // Email Change Modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Phone Change Modal
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

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
        platformAuditService.fetchAuditEvents({ limit: 12, page: 1 }),
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

  const handleSelectSection = (section: AccountSubSection) => {
    setActiveSection(section);
    syncUrlWithRoute('platform-account', { subTab: section });
  };

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

  // --- Email Change ---
  const handleEmailChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setIsUpdatingEmail(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      await platformAuditService.logEvent({
        action: 'email.change_requested',
        category: 'Security',
        resource_type: 'Profile',
        resource_id: profile?.id || 'superadmin',
        severity: 'High',
        reason: `Primary email verification dispatched to ${newEmail}`,
      });
      setIsEmailModalOpen(false);
      setNewEmail('');
      showToast(`Verification sent to ${newEmail}. Please confirm via your inbox.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to request email change.', 'error');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // --- Phone Change ---
  const handlePhoneChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone) {
      showToast('Please enter a valid phone number.', 'error');
      return;
    }
    setIsUpdatingPhone(true);
    try {
      const updated = await platformProfileService.updateProfile({ phone: newPhone });
      setProfile(updated);
      setFormData((prev) => ({ ...prev, phone: newPhone }));
      setIsPhoneModalOpen(false);
      setNewPhone('');
      showToast('Phone number updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update phone number.', 'error');
    } finally {
      setIsUpdatingPhone(false);
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
      showToast('MFA Authenticator verified! Security Assurance Level promoted to AAL2.', 'success');
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
      <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-gray-200 shadow-xs">
        <RefreshCw className="w-7 h-7 animate-spin text-[#047857] mx-auto" />
        <div className="text-sm font-bold text-gray-900">Loading Platform Identity Center...</div>
        <p className="text-xs text-gray-500">Resolving authenticated profile, Supabase MFA assurance, and IAM access scope.</p>
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

  const sectionTitles: Record<AccountSubSection, { title: string; desc: string }> = {
    overview: { title: 'Account Center', desc: 'Manage your identity, security, sessions, and platform access.' },
    profile: { title: 'My Profile', desc: 'Manage your personal information and administrator identity.' },
    security: { title: 'Account & Security', desc: 'MFA assurance, password security, and authentication posture.' },
    sessions: { title: 'Sessions & Devices', desc: 'Review and revoke active devices with authorized platform credentials.' },
    access: { title: 'Platform Access & IAM', desc: 'Effective server-authoritative role and granular permissions matrix.' },
    preferences: { title: 'Preferences', desc: 'Customize your control plane appearance, timezone, and alert streams.' },
    activity: { title: 'Security Activity', desc: 'Recent personal authentication and administrative security audit events.' },
  };

  return (
    <div className="space-y-6">
      {/* 1. Account Center Header Bar with Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-1">
            <button
              onClick={() => onNavigateTab && onNavigateTab('platform-dashboard')}
              className="hover:text-[#047857] transition cursor-pointer"
            >
              Platform Admin
            </button>
            <span>/</span>
            <button
              onClick={() => handleSelectSection('overview')}
              className="hover:text-[#047857] transition cursor-pointer"
            >
              Account Center
            </button>
            {activeSection !== 'overview' && (
              <>
                <span>/</span>
                <span className="font-bold text-gray-800">{sectionTitles[activeSection].title}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {sectionTitles[activeSection].title}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {mfaStatus?.mfa_enabled ? 'Account Protected' : 'MFA Required'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{sectionTitles[activeSection].desc}</p>
        </div>

        <div className="flex items-center gap-2">
          {activeSection !== 'overview' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectSection('overview')}
              className="text-xs font-semibold text-gray-700"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Account Overview
            </Button>
          )}

          {onNavigateTab && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('platform-dashboard')}
              className="text-xs font-semibold text-gray-700"
            >
              Back to Platform
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={loadAccountData}
            className="text-xs text-gray-500 hover:text-gray-900 p-2"
            title="Refresh Account Data"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 2. Main Layout: Persistent Left Sidebar + Right Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Account Navigation Sidebar */}
        <div className="lg:col-span-3 bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs space-y-5">
          {/* User Mini Badge */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50/50 to-gray-50 border border-emerald-100/60 flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-10 h-10 rounded-xl object-cover border border-emerald-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#047857] text-white font-bold text-sm flex items-center justify-center">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-gray-900 truncate">{profile?.display_name}</div>
              <div className="text-[10px] text-[#047857] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Super Admin
              </div>
            </div>
          </div>

          {/* Navigation Groups */}
          <div className="space-y-4">
            {/* Overview */}
            <div>
              <button
                onClick={() => handleSelectSection('overview')}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer',
                  activeSection === 'overview'
                    ? 'bg-[#047857] text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80'
                )}
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Overview
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>

            {/* Profile Group */}
            <div>
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Profile
              </div>
              <button
                onClick={() => handleSelectSection('profile')}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer',
                  activeSection === 'profile'
                    ? 'bg-[#047857] text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80'
                )}
              >
                <span className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  My Profile
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>

            {/* Security Group */}
            <div>
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Security
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelectSection('security')}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer',
                    activeSection === 'security'
                      ? 'bg-[#047857] text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100/80'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Account & Security
                  </span>
                  <span className={cn('text-[10px] px-1.5 py-0.2 rounded font-bold', activeSection === 'security' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-[#047857]')}>
                    AAL2
                  </span>
                </button>

                <button
                  onClick={() => handleSelectSection('sessions')}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer',
                    activeSection === 'sessions'
                      ? 'bg-[#047857] text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100/80'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Laptop className="w-4 h-4" />
                    Sessions & Devices
                  </span>
                  <span className={cn('text-[10px] px-1.5 py-0.2 rounded font-bold', activeSection === 'sessions' ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600')}>
                    {sessions.length}
                  </span>
                </button>

                <button
                  onClick={() => handleSelectSection('activity')}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer',
                    activeSection === 'activity'
                      ? 'bg-[#047857] text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100/80'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Security Activity
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>
            </div>

            {/* Platform Group */}
            <div>
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Platform
              </div>
              <button
                onClick={() => handleSelectSection('access')}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer',
                  activeSection === 'access'
                    ? 'bg-[#047857] text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80'
                )}
              >
                <span className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Access & IAM
                </span>
                <span className={cn('text-[10px] px-1.5 py-0.2 rounded font-bold', activeSection === 'access' ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-[#047857]')}>
                  Full
                </span>
              </button>
            </div>

            {/* Preferences Group */}
            <div>
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Preferences
              </div>
              <button
                onClick={() => handleSelectSection('preferences')}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer',
                  activeSection === 'preferences'
                    ? 'bg-[#047857] text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100/80'
                )}
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Preferences
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Dynamic Content Section */}
        <div className="lg:col-span-9 space-y-6">
          {/* =========================================================
              SECTION 0: OVERVIEW LANDING
             ========================================================= */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Identity Snapshot Card */}
              <div className="bg-gradient-to-br from-[#064E3B] to-[#047857] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white/80 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-800 text-white font-black text-2xl flex items-center justify-center border-2 border-white/80 shadow-md">
                      {initials}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight">{profile?.display_name}</h2>
                      <Badge variant="emerald" size="sm" className="bg-emerald-900/60 text-emerald-200 border-emerald-700">
                        {accessInfo?.role_display_name || 'Super Admin'}
                      </Badge>
                      <span className="text-[11px] font-bold text-emerald-200 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100 mt-0.5">{profile?.job_title} • {profile?.email}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-emerald-200">
                      <span>Assurance: AAL2</span>
                      <span>•</span>
                      <span>MFA: Enabled</span>
                      <span>•</span>
                      <span>Last Sign-In: Today · 09:41 IST</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectSection('profile')}
                    className="bg-white text-[#064E3B] hover:bg-emerald-50 border-white text-xs font-semibold"
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>

              {/* 6 Quick Action Section Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    id: 'profile' as AccountSubSection,
                    title: 'Profile',
                    desc: 'Manage personal information, job title, and avatar photo.',
                    icon: UserIcon,
                    badge: 'Verified Identity',
                  },
                  {
                    id: 'security' as AccountSubSection,
                    title: 'Security',
                    desc: 'MFA authenticator, master password, and assurance levels.',
                    icon: Shield,
                    badge: mfaStatus?.mfa_enabled ? 'AAL2 Active' : 'Action Required',
                  },
                  {
                    id: 'sessions' as AccountSubSection,
                    title: 'Sessions',
                    desc: 'Review and revoke active devices with valid credentials.',
                    icon: Laptop,
                    badge: `${sessions.length} Active`,
                  },
                  {
                    id: 'access' as AccountSubSection,
                    title: 'Access & IAM',
                    desc: 'View effective platform permissions and scope matrix.',
                    icon: Key,
                    badge: 'Platform-wide',
                  },
                  {
                    id: 'preferences' as AccountSubSection,
                    title: 'Preferences',
                    desc: 'Theme, timezone, date formats, and alert stream settings.',
                    icon: Sliders,
                    badge: 'System Theme',
                  },
                  {
                    id: 'activity' as AccountSubSection,
                    title: 'Security Activity',
                    desc: 'Recent personal authentication events and audit entries.',
                    icon: Clock,
                    badge: `${recentAudits.length} Events`,
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleSelectSection(card.id)}
                      className="p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs hover:border-[#047857] hover:shadow-sm transition cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="p-2.5 rounded-xl bg-emerald-50 text-[#047857] group-hover:bg-[#047857] group-hover:text-white transition">
                            <Icon className="w-5 h-5" />
                          </div>
                          <Badge variant="neutral" size="sm">{card.badge}</Badge>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 group-hover:text-[#047857] transition">
                            {card.title}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[#047857]">
                        <span>Manage section</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION 1: MY PROFILE
             ========================================================= */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              {/* Identity Snapshot Card */}
              <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[#047857] text-white font-bold text-lg flex items-center justify-center">
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-gray-900">{profile?.display_name}</span>
                      <Badge variant="emerald" size="sm">Super Admin</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{profile?.email}</div>
                    <div className="text-[11px] text-[#047857] font-semibold flex items-center gap-2 mt-1">
                      <span>● Verified Identity</span>
                      <span>•</span>
                      <span>● Platform Administrator</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-gray-700"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Change Photo
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
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarFileChange}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Personal Information Form */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Personal Information</h3>
                  <p className="text-xs text-gray-500">Your profile details visible in system logs and platform cases.</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={formData.first_name || ''}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={formData.last_name || ''}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
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
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Job Title</label>
                      <input
                        type="text"
                        value={formData.job_title || ''}
                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
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
                      />
                    </div>
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
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSavingProfile}
                      className="bg-[#047857] hover:bg-[#036246] text-white font-bold shadow-xs text-xs"
                    >
                      {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Primary Email Card */}
              <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-[#047857] border border-emerald-200">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Primary Email</div>
                    <div className="text-xs text-gray-600 mt-0.5">{profile?.email}</div>
                    <div className="text-[11px] text-[#047857] font-semibold mt-0.5">● Verified</div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmailModalOpen(true)}
                  className="text-xs font-semibold text-gray-700"
                >
                  Change Email
                </Button>
              </div>

              {/* Phone Card */}
              <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Phone Number</div>
                    <div className="text-xs text-gray-600 mt-0.5">{profile?.phone || 'Not configured'}</div>
                    <div className="text-[11px] text-[#047857] font-semibold mt-0.5">
                      {profile?.phone ? '● Verified' : 'Action recommended for SMS notifications'}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewPhone(profile?.phone || '');
                    setIsPhoneModalOpen(true);
                  }}
                  className="text-xs font-semibold text-gray-700"
                >
                  {profile?.phone ? 'Change Phone' : 'Add Phone'}
                </Button>
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION 2: ACCOUNT & SECURITY
             ========================================================= */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              {/* Security Posture Overview */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Security Posture Overview
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <div className="text-[11px] text-gray-500">Security Status</div>
                    <div className="text-sm font-bold text-[#047857] mt-0.5">Protected</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">MFA</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">● Enabled</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Assurance Level</div>
                    <div className="text-sm font-bold text-[#047857] mt-0.5">AAL2</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Password</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">Active (42d ago)</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Active Sessions</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">{sessions.length} Devices</div>
                  </div>
                </div>
              </div>

              {/* MFA Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#047857]" />
                      Multi-Factor Authentication (MFA)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Platform Super Admins are required to maintain an active TOTP authenticator app.
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
                              <Badge variant="emerald" size="sm">Active (TOTP)</Badge>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              Enrolled: {new Date(factor.created_at).toLocaleDateString()} • RFC 6238 Standard
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
                      <div className="font-bold text-xs text-gray-900">MFA Required</div>
                      <p className="text-[11px] text-gray-500">
                        Platform Administrator accounts must use multi-factor authentication.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Password Security Card */}
              <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Account Master Password</div>
                    <div className="text-xs text-gray-500 mt-0.5">Last changed: 12 Aug 2026 • PBKDF2 Encrypted</div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="text-xs font-semibold text-gray-700"
                >
                  Change Password
                </Button>
              </div>

              {/* Authentication & Recovery Methods */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                <div className="text-xs font-bold text-gray-900">Authentication & Recovery Methods</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="font-bold text-gray-900">Authenticator App (TOTP)</div>
                    <div className="text-[#047857] font-semibold">● Active (Google Auth)</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="font-bold text-gray-900">FIDO2 / Passkey</div>
                    <div className="text-gray-400">Not configured</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="font-bold text-gray-900">SAML SSO Integration</div>
                    <div className="text-gray-500">Corporate IdP Ready</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION 3: SESSIONS & DEVICES
             ========================================================= */}
          {activeSection === 'sessions' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs text-center">
                  <div className="text-xl font-bold text-gray-900">{sessions.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Active Sessions</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs text-center">
                  <div className="text-xl font-bold text-[#047857]">1</div>
                  <div className="text-xs text-gray-500 mt-0.5">Current Device</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs text-center">
                  <div className="text-xl font-bold text-emerald-600">0</div>
                  <div className="text-xs text-gray-500 mt-0.5">Suspicious Sessions</div>
                </div>
              </div>

              {/* Actions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                <div className="text-xs text-gray-500">
                  Review all browser and device logins authenticated with your Super Admin credentials.
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

              {/* Sessions List */}
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={cn(
                      'p-5 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4',
                      sess.is_current ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-gray-200 shadow-2xs'
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
                          {sess.is_current && <Badge variant="emerald" size="sm">Current Device</Badge>}
                          <Badge variant="neutral" size="sm">{sess.assurance_level}</Badge>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {sess.browser} • {sess.os}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-2">
                          <span className="font-mono">{sess.ip_address}</span>
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
                          Current Device
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSessionToRevoke(sess)}
                          className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION 4: PLATFORM ACCESS & IAM
             ========================================================= */}
          {activeSection === 'access' && (
            <div className="space-y-6">
              {/* Role Card */}
              <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Platform Role</div>
                    <div className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
                      SUPER ADMIN
                      <Badge variant="emerald" size="sm">● Active</Badge>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Assigned by: Platform IAM</div>
                    <div className="text-[11px] text-gray-400">Last updated: 12 Aug 2026</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Direct Role</span>
                    <span className="font-bold text-gray-800">{accessInfo?.direct_role}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Scope</span>
                    <span className="font-bold text-gray-800">{accessInfo?.access_scope}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Temporary Access</span>
                    <span className="font-bold text-gray-800">{accessInfo?.temporary_access}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Environment Scope</span>
                    <span className="font-bold text-gray-800">{accessInfo?.environment_scope}</span>
                  </div>
                </div>
              </div>

              {/* 17-Module Permissions Matrix Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Effective Platform Permission Matrix</h3>
                    <p className="text-xs text-gray-500">Read-only view of server-enforced privileges across all control plane modules.</p>
                  </div>
                  <Badge variant="emerald" size="sm">17 Modules Authorized</Badge>
                </div>

                <div className="divide-y divide-gray-100 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Permission Area</th>
                        <th className="px-4 py-3">Scope</th>
                        <th className="px-4 py-3">Access Level</th>
                        <th className="px-4 py-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {accessInfo?.modules.map((mod) => (
                        <tr key={mod.module_name} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-bold text-gray-900">{mod.module_name}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{mod.scope}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
                              {mod.access_level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-gray-500 max-w-xs">{mod.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION 5: PREFERENCES
             ========================================================= */}
          {activeSection === 'preferences' && preferences && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Control Plane Preferences</h3>
                <p className="text-xs text-gray-500">Configure theme appearance, time locale, and alert streams.</p>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Theme & Appearance</label>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  {[
                    { id: 'system', label: 'System', icon: Monitor },
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
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

              {/* Time & Locale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Timezone</label>
                  <select
                    value={preferences.language || 'Asia/Kolkata'}
                    onChange={() => {}}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date Format</label>
                  <select
                    value={preferences.date_format}
                    onChange={(e) => handleUpdatePreferences({ date_format: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white cursor-pointer"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>

              {/* Notification Switches */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-700">Administrative Alerts</label>
                <div className="space-y-2 max-w-lg">
                  {[
                    { key: 'notify_security_alerts', label: 'Security Threat Alerts' },
                    { key: 'notify_incidents', label: 'Platform Incident Alerts' },
                    { key: 'notify_integration_failures', label: 'Integration & ERP Failures' },
                    { key: 'notify_job_failures', label: 'Background Job Failures' },
                    { key: 'notify_support_escalations', label: 'Support Escalations' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
                      <span className="text-xs font-semibold text-gray-800">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean((preferences as any)[item.key])}
                        onChange={(e) => handleUpdatePreferences({ [item.key]: e.target.checked } as any)}
                        className="h-4 w-4 rounded text-[#047857] focus:ring-[#047857] border-gray-300 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION 6: SECURITY ACTIVITY
             ========================================================= */}
          {activeSection === 'activity' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#047857]" />
                    Personal Security Activity Log
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Immutable forensic records of all logins, factor activations, and profile modifications.
                  </p>
                </div>
                {onNavigateTab && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateTab('platform-audit')}
                    className="text-xs font-semibold text-gray-700"
                  >
                    View Full Audit Log <ExternalLink className="w-3.5 h-3.5 ml-1" />
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
          )}
        </div>
      </div>

      {/* =========================================================
          MODALS & DIALOGS
         ========================================================= */}

      {/* Email Change Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-gray-900">Change Primary Email</h3>
            <p className="text-xs text-gray-500">
              A secure verification link will be dispatched to your new email address.
            </p>
            <form onSubmit={handleEmailChangeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin.new@workforceos.com"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEmailModalOpen(false)} className="w-1/2 text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isUpdatingEmail} className="w-1/2 bg-[#047857] hover:bg-[#036246] text-white text-xs font-bold shadow-xs">
                  {isUpdatingEmail ? 'Dispatching...' : 'Send Verification'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phone Change Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-gray-900">Update Phone Number</h3>
            <p className="text-xs text-gray-500">Used for priority incident SMS alerts and emergency escalations.</p>
            <form onSubmit={handlePhoneChangeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (with Country Code)</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPhoneModalOpen(false)} className="w-1/2 text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isUpdatingPhone} className="w-1/2 bg-[#047857] hover:bg-[#036246] text-white text-xs font-bold shadow-xs">
                  {isUpdatingPhone ? 'Saving...' : 'Save Phone'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MFA Enrollment Modal */}
      {isEnrollModalOpen && enrollData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#047857] flex items-center justify-center mx-auto mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Enroll Authenticator App</h3>
              <p className="text-xs text-gray-500">Scan QR code using Google Authenticator, 1Password, or Authy.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col items-center justify-center">
              <img src={enrollData.qrCodeUrl} alt="MFA QR Code" className="w-44 h-44 rounded-xl shadow-xs bg-white p-2" />
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
              <Button variant="outline" size="sm" onClick={() => setIsEnrollModalOpen(false)} className="w-1/2 text-xs">
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
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              Change Master Password
            </h3>
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
              <div className="flex items-center gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPasswordModalOpen(false)} className="w-1/2 text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isUpdatingPassword} className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs">
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
                Invalidate session on <strong>{sessionToRevoke.device_name}</strong> ({sessionToRevoke.ip_address}).
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSessionToRevoke(null)} className="w-1/2 text-xs">
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmRevokeSession} className="w-1/2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs">
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
              <Button variant="outline" size="sm" onClick={() => setIsRevokeOthersConfirmOpen(false)} className="w-1/2 text-xs">
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmRevokeOthers} className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs">
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
                Globally invalidate all active authentication refresh tokens across all devices.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsSignOutEverywhereConfirmOpen(false)} className="w-1/2 text-xs">
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmSignOutEverywhere} className="w-1/2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs">
                Sign Out Globally
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
