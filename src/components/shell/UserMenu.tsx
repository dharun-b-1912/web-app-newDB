// src/components/shell/UserMenu.tsx
// ============================================================
// Joy PeopleHR / WorkForceOS — Production User Profile Menu & Secure Session Action
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  LogOut,
  ChevronDown,
  Smartphone,
  ShieldCheck,
  Building2,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { platformProfileService, platformMfaService, PlatformAdminProfile, MfaStatusResponse } from '../../services/platform';
import { syncUrlWithRoute } from '../../lib/router/urlRouter';
import { getPrimaryRole } from '../../lib/rbac/permissionEngine';
import { cn } from '../../lib/utils';

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeLegalEntity, roleTitle } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
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

  const currentRole = getPrimaryRole(user);
  const isPlatformAdmin = currentRole === 'Super Admin' || Boolean((user as any).is_platform_admin);

  const handleNavigateToProfile = () => {
    setIsOpen(false);
    syncUrlWithRoute('my-profile');
    window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'my-profile' } }));
  };

  const handleNavigateToAccount = (subTab: string) => {
    setIsOpen(false);
    syncUrlWithRoute('platform-account', { subTab });
    window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'platform-account', subTab } }));
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  const displayName = user.name || (isPlatformAdmin && platformProfile ? platformProfile.display_name : 'Super Admin');
  const avatarSrc = user.avatar_url || (isPlatformAdmin && platformProfile?.avatar_url ? platformProfile.avatar_url : '');
  const effectiveRoleBadge = isPlatformAdmin ? 'Platform Super Admin' : roleTitle;

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
          <div className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[140px]">
            {displayName}
          </div>
          <div className="text-[10px] text-gray-500 font-medium truncate max-w-[140px]">
            {effectiveRoleBadge}
          </div>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-gray-100">
          {/* User Header */}
          <div className="px-4 py-3 bg-gray-50/50">
            <div className="font-bold text-gray-900 text-xs truncate">{displayName}</div>
            <div className="text-[11px] text-gray-500 font-medium truncate">{user.email}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={isPlatformAdmin ? 'purple' : 'emerald'} size="sm" className="text-[10px]">
                {effectiveRoleBadge}
              </Badge>
              {isPlatformAdmin ? (
                <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md truncate max-w-[200px]">
                  <Globe className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                  <span className="truncate">Joy PeopleHR Platform</span>
                </span>
              ) : activeLegalEntity ? (
                <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1 bg-white border border-gray-200 px-1.5 py-0.5 rounded-md truncate max-w-[170px]">
                  <Building2 className="w-2.5 h-2.5 shrink-0 text-gray-400" />
                  <span className="truncate">{activeLegalEntity.legal_name || activeLegalEntity.trade_name}</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Menu Options */}
          <div className="py-1">
            {isPlatformAdmin ? (
              <>
                <button
                  onClick={() => handleNavigateToAccount('profile')}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-800 hover:bg-emerald-50/70 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4 text-[#07563D]" />
                    Root Admin Identity
                  </span>
                  <span className="text-gray-400 font-bold">→</span>
                </button>

                <button
                  onClick={() => handleNavigateToAccount('security')}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Security & MFA Settings
                  </span>
                  <span className="text-gray-400">→</span>
                </button>

                <button
                  onClick={() => handleNavigateToAccount('sessions')}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    Active Sessions & Devices
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              </>
            ) : currentRole === 'Company Admin' ? (
              <>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    syncUrlWithRoute('admin');
                    window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'admin' } }));
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-800 hover:bg-emerald-50/70 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#064E3B]" />
                    Company Admin Center
                  </span>
                  <span className="text-gray-400 font-bold">→</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    syncUrlWithRoute('organization');
                    window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'organization' } }));
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Legal Entities & Hierarchy
                  </span>
                  <span className="text-gray-400">→</span>
                </button>

                <button
                  onClick={handleNavigateToProfile}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    My Admin Profile
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleNavigateToProfile}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-800 hover:bg-emerald-50/70 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4 text-[#07563D]" />
                    My Profile Workspace
                  </span>
                  <span className="text-gray-400 font-bold">→</span>
                </button>

                <button
                  onClick={handleNavigateToProfile}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Account & Security
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
