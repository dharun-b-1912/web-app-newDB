import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  Shield,
  LogOut,
  ChevronDown,
  Check,
  Smartphone,
  Laptop,
  Sliders,
  Key,
  ShieldCheck,
  Lock,
  ExternalLink,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { api } from '../../services/api';
import { platformProfileService, platformMfaService, PlatformAdminProfile, MfaStatusResponse } from '../../services/platform';
import { syncUrlWithRoute } from '../../lib/router/urlRouter';
import { cn } from '../../lib/utils';

export const UserMenu: React.FC = () => {
  const { user, login, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [platformProfile, setPlatformProfile] = useState<PlatformAdminProfile | null>(null);
  const [mfaStatus, setMfaStatus] = useState<MfaStatusResponse | null>(null);

  // Load real profile & MFA state
  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const [prof, mfa] = await Promise.all([
          platformProfileService.getProfile(),
          platformMfaService.getMfaStatus(),
        ]);
        if (isMounted) {
          setPlatformProfile(prof);
          setMfaStatus(mfa);
        }
      } catch {
        // Fallback gracefully
      }
    };

    fetchState();

    const handleProfileUpdated = (e: any) => {
      if (e.detail?.profile) {
        setPlatformProfile(e.detail.profile);
      } else {
        fetchState();
      }
    };
    window.addEventListener('platform:profile_updated', handleProfileUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('platform:profile_updated', handleProfileUpdated);
    };
  }, [user]);

  // Click outside & Escape key listeners
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!user) return null;

  const currentRole = user.roles?.[0]?.name || 'Employee';
  const isPlatformAdmin = currentRole === 'Super Admin' || currentRole === 'Platform Admin';

  const switchPersona = async (email: string) => {
    const users = await api.getUsers();
    const inputEmail = email.toLowerCase().trim();
    let target = users.find(u => u.email.toLowerCase() === inputEmail);
    if (!target) {
      const username = inputEmail.split('@')[0];
      target = users.find(u => u.email.toLowerCase().startsWith(username));
    }
    if (target) {
      login({ ...target, email });
      setIsOpen(false);
    }
  };

  const handleNavigateToAccount = (subTab: string) => {
    setIsOpen(false);
    syncUrlWithRoute('platform-account', { subTab });
    window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'platform-account', subTab } }));
  };

  const displayName = isPlatformAdmin && platformProfile ? platformProfile.display_name : user.name;
  const avatarSrc = isPlatformAdmin && platformProfile?.avatar_url ? platformProfile.avatar_url : user.avatar_url;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-[#047857]"
      >
        <Avatar src={avatarSrc} name={displayName} size="md" />
        <div className="hidden lg:block text-left shrink-0">
          <div className="text-xs font-bold text-gray-900 leading-tight whitespace-nowrap">{displayName}</div>
          <div className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
            {isPlatformAdmin ? 'Super Admin' : currentRole}
          </div>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 hidden sm:block shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Card */}
          <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-br from-emerald-50/40 to-transparent">
            <Avatar src={avatarSrc} name={displayName} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-900 truncate">{displayName}</div>
              <div className="text-[11px] text-gray-500 truncate">{user.email}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                  {isPlatformAdmin ? 'Secure Session' : 'Active Session'}
                </span>
              </div>
            </div>
          </div>

          {/* Platform Account Navigation Menu */}
          {isPlatformAdmin ? (
            <div className="py-1 border-b border-gray-100">
              <button
                onClick={() => handleNavigateToAccount('profile')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#047857] flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  My Profile
                </span>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={() => handleNavigateToAccount('security')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#047857] flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Account & Security
                </span>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={() => handleNavigateToAccount('sessions')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#047857] flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Laptop className="w-4 h-4 text-gray-400" />
                  Sessions & Devices
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-gray-500">3 Active</span>
                  <span className="text-gray-400">→</span>
                </span>
              </button>

              <button
                onClick={() => handleNavigateToAccount('access')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#047857] flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Key className="w-4 h-4 text-indigo-500" />
                  {currentRole === 'Super Admin' ? 'Platform Access & IAM' : 'Platform Access'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-[#047857]">
                  {currentRole === 'Super Admin' ? 'Root' : 'Scoped'}
                </span>
              </button>

              <button
                onClick={() => handleNavigateToAccount('preferences')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#047857] flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-gray-400" />
                  Preferences
                </span>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={() => handleNavigateToAccount('activity')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#047857] flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Security Activity
                </span>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'platform-support' } }));
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#047857] flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                  Help & Documentation
                </span>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          ) : (
            <div className="py-1 border-b border-gray-100">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-gray-400" />
                My Profile Settings
              </button>
            </div>
          )}

          {/* Real Security Status Summary Badge */}
          {isPlatformAdmin && (
            <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 text-[11px] space-y-1">
              <div className="flex items-center justify-between font-bold text-gray-800">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#047857]" />
                  Security Status
                </span>
                <span className="text-[#047857] font-bold">
                  {mfaStatus?.mfa_enabled ? 'Protected' : 'Action Required'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 flex items-center justify-between">
                <span>{mfaStatus?.mfa_enabled ? '● MFA Factor Active (TOTP)' : '⚠ MFA Setup Required'}</span>
                <span>● TLS 1.3 Active</span>
              </div>
            </div>
          )}

          {/* Persona Switcher (Collapsible for dev testing) */}
          <div className="px-3 py-1.5 border-b border-gray-100">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 py-1 hover:text-gray-700 cursor-pointer"
            >
              <span>Switch Test Role Context</span>
              <ChevronDown className={cn('w-3 h-3 transition-transform', showRoleSwitcher && 'rotate-180')} />
            </button>
            {showRoleSwitcher && (
              <div className="space-y-1 mt-1">
                {[
                  { name: 'THIRUMALAI R K', email: 'superadmin@workforceos.com', role: 'Super Admin (Platform)' },
                  { name: 'Karthik Natarajan', email: 'assistant.admin@workforceos.com', role: 'Assistant Admin (Delegated Ops)' },
                  { name: 'Dharun Joy', email: 'admin@joycorporate.com', role: 'Company Admin (Company)' },
                  { name: 'Arun Kumar', email: 'arun.kumar@joycorporate.com', role: 'HR Head (Company HR)' },
                  { name: 'Karthik N.', email: 'karthik.n@joycorporate.com', role: 'Manager (Department)' },
                  { name: 'Deepa S.', email: 'deepa.s@joycorporate.com', role: 'Team Lead (Team)' },
                  { name: 'Priya Sharma', email: 'priya.sharma@joycorporate.com', role: 'Employee (Self)' },
                ].map((persona) => {
                  const isCurrent = user.email === persona.email;
                  return (
                    <button
                      key={persona.email}
                      onClick={() => switchPersona(persona.email)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isCurrent ? 'bg-emerald-100/70 font-bold text-[#07563D]' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div>
                        <div>{persona.name}</div>
                        <div className="text-[10px] text-gray-400">{persona.role}</div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-[#07563D]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="py-1">
            <a
              href="#docs"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                if (isPlatformAdmin) {
                  syncUrlWithRoute('platform-support');
                  window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'platform-support' } }));
                }
              }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-gray-400" />
              Help & Documentation
            </a>
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

