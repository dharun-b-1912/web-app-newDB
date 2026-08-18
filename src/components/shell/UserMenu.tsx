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
  Building2,
  Globe,
  Bell,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { api } from '../../services/api';
import { platformProfileService, platformMfaService, PlatformAdminProfile, MfaStatusResponse } from '../../services/platform';
import { syncUrlWithRoute } from '../../lib/router/urlRouter';
import { cn } from '../../lib/utils';

export const UserMenu: React.FC = () => {
  const { user, login, logout } = useAuth();
  const { organization, activeLegalEntity, roleTitle } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false);
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
  const isPlatformAdmin = currentRole === 'Super Admin' || currentRole === 'Assistant Admin' || currentRole === 'Billing Admin' || currentRole === 'Security Officer' || currentRole === 'Platform Admin';

  const TEST_PERSONAS = [
    {
      name: 'THIRUMALAI R K',
      email: 'superadmin@workforceos.com',
      role: 'Platform Super Admin',
      userObj: {
        id: 'user-super-01',
        organization_id: 'org-platform',
        email: 'superadmin@workforceos.com',
        name: 'THIRUMALAI R K',
        avatar_url: '',
        employee_id: 'emp-root-001',
        status: 'Active',
        roles: [{ id: 'role-platform-super-admin', organization_id: 'org-platform', name: 'Super Admin', description: 'Platform Super Admin', permissions: [] }],
        created_at: '2024-01-01T00:00:00Z',
      },
      targetRoute: 'platform-dashboard',
    },
    {
      name: 'Karthik Natarajan',
      email: 'assistant.admin@workforceos.com',
      role: 'Assistant Admin (Platform)',
      userObj: {
        id: 'user-asst-02',
        organization_id: 'org-platform',
        email: 'assistant.admin@workforceos.com',
        name: 'Karthik Natarajan',
        avatar_url: '',
        employee_id: 'emp-asst-002',
        status: 'Active',
        roles: [{ id: 'role-platform-assistant-admin', organization_id: 'org-platform', name: 'Assistant Admin', description: 'Assistant Admin', permissions: [] }],
        created_at: '2024-02-01T00:00:00Z',
      },
      targetRoute: 'platform-tenants',
    },
    {
      name: 'Dharun Joy',
      email: 'admin@joycorporate.com',
      role: 'Company Admin (Company)',
      userObj: {
        id: 'user-admin-01',
        organization_id: 'org-joy-01',
        email: 'admin@joycorporate.com',
        name: 'Dharun Joy',
        avatar_url: '',
        employee_id: 'emp-admin-001',
        status: 'Active',
        roles: [{ id: 'role-002', organization_id: 'org-joy-01', name: 'Company Admin', description: 'Company Admin', permissions: [] }],
        created_at: '2024-01-01T00:00:00Z',
      },
      targetRoute: 'dashboard',
    },
    {
      name: 'Hari priya',
      email: 'haripriya@joycorporate.com',
      role: 'HR Head (Company)',
      userObj: {
        id: 'user-hr-01',
        organization_id: 'org-joy-01',
        email: 'haripriya@joycorporate.com',
        name: 'Hari priya',
        avatar_url: '',
        employee_id: 'emp-hr-001',
        status: 'Active',
        roles: [{ id: 'role-003', organization_id: 'org-joy-01', name: 'HR Head', description: 'HR Head', permissions: [] }],
        created_at: '2024-01-01T00:00:00Z',
      },
      targetRoute: 'dashboard',
    },
    {
      name: 'Karthik Natarajan',
      email: 'karthik.n@joycorporate.com',
      role: 'Manager (Engineering)',
      userObj: {
        id: 'user-mgr-01',
        organization_id: 'org-joy-01',
        email: 'karthik.n@joycorporate.com',
        name: 'Karthik Natarajan',
        avatar_url: '',
        employee_id: 'emp-mgr-001',
        status: 'Active',
        roles: [{ id: 'role-004', organization_id: 'org-joy-01', name: 'Team Lead', description: 'Engineering Manager', permissions: [] }],
        created_at: '2024-01-01T00:00:00Z',
      },
      targetRoute: 'tl-dashboard',
    },
    {
      name: 'Deepa Subramanian',
      email: 'deepa.s@joycorporate.com',
      role: 'Team Lead (Engineering)',
      userObj: {
        id: 'user-tl-01',
        organization_id: 'org-joy-01',
        email: 'deepa.s@joycorporate.com',
        name: 'Deepa Subramanian',
        avatar_url: '',
        employee_id: 'emp-tl-001',
        status: 'Active',
        roles: [{ id: 'role-004', organization_id: 'org-joy-01', name: 'Team Lead', description: 'Team Lead', permissions: [] }],
        created_at: '2024-01-01T00:00:00Z',
      },
      targetRoute: 'tl-dashboard',
    },
    {
      name: 'Priya Sharma',
      email: 'priya.sharma@joycorporate.com',
      role: 'Employee (Self)',
      userObj: {
        id: 'user-emp-01',
        organization_id: 'org-joy-01',
        email: 'priya.sharma@joycorporate.com',
        name: 'Priya Sharma',
        avatar_url: '',
        employee_id: 'emp-001',
        status: 'Active',
        roles: [{ id: 'role-005', organization_id: 'org-joy-01', name: 'Employee', description: 'Employee', permissions: [] }],
        created_at: '2024-01-01T00:00:00Z',
      },
      targetRoute: 'ess-dashboard',
    },
    {
      name: 'Priya Sundaram',
      email: 'priya.sundaram@joycorporate.com',
      role: 'Employee (Staff Architect & Onboarding)',
      userObj: {
        id: 'user-emp-1040',
        organization_id: 'org-joy-01',
        email: 'priya.sundaram@joycorporate.com',
        name: 'Priya Sundaram',
        avatar_url: '',
        employee_id: 'emp-1040',
        status: 'Onboarding',
        roles: [{ id: 'role-005', organization_id: 'org-joy-01', name: 'Employee', description: 'Employee', permissions: [] }],
        created_at: '2026-08-15T09:00:00Z',
      },
      targetRoute: 'ess-dashboard',
    },
  ];

  const switchPersona = async (email: string) => {
    const persona = TEST_PERSONAS.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (persona) {
      api.setCurrentUser(persona.userObj as any);
      login(persona.userObj as any);
      setIsOpen(false);
      setShowDevMode(false);
      syncUrlWithRoute(persona.targetRoute);
      window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: persona.targetRoute } }));
    }
  };

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

  const displayName = user.name || (isPlatformAdmin && platformProfile ? platformProfile.display_name : 'Authorized User');
  const avatarSrc = user.avatar_url || (isPlatformAdmin && platformProfile?.avatar_url ? platformProfile.avatar_url : '');

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
            {roleTitle}
          </div>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 hidden sm:block shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-2xl border border-gray-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Canonical Profile Header Card */}
          <div className="px-4 py-3.5 border-b border-gray-100 bg-gradient-to-br from-emerald-50/50 to-transparent">
            <div className="flex items-center gap-3">
              <Avatar src={avatarSrc} name={displayName} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-gray-900 truncate">{displayName}</div>
                <div className="text-[11px] text-gray-500 truncate">{user.email}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                    Active Session
                  </span>
                </div>
              </div>
            </div>

            {/* Organization & Legal Entity Badge Details */}
            <div className="mt-3 pt-2.5 border-t border-gray-100/80 grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-gray-400 uppercase font-bold text-[9px] block">Role</span>
                <span className="font-extrabold text-[#07563D] truncate block">{roleTitle}</span>
              </div>
              <div>
                <span className="text-gray-400 uppercase font-bold text-[9px] block">Legal Entity</span>
                <span className="font-bold text-gray-800 truncate block">{activeLegalEntity?.legal_name || 'Joy Corporate Solutions Pvt Ltd'}</span>
              </div>
            </div>
          </div>

          {/* Primary Profile & Workspace Actions */}
          <div className="py-1 border-b border-gray-100">
            {isPlatformAdmin ? (
              <>
                <button
                  onClick={() => handleNavigateToAccount('overview')}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-800 hover:bg-emerald-50/70 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4 text-[#07563D]" />
                    Platform Identity & Account Center
                  </span>
                  <span className="text-gray-400 font-bold">→</span>
                </button>

                <button
                  onClick={() => handleNavigateToAccount('security')}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Platform Security & IAM
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

                <button
                  onClick={() => handleNavigateToAccount('preferences')}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-gray-400" />
                    Platform Preferences & Alerts
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

                <button
                  onClick={handleNavigateToProfile}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50/60 hover:text-[#07563D] flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-gray-400" />
                    Notification Preferences
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              </>
            )}
          </div>

          {/* Collapsible Developer / QA Mode Switcher */}
          <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50/40">
            <button
              onClick={() => setShowDevMode(!showDevMode)}
              className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 py-1 hover:text-gray-700 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-gray-400" />
                Developer / QA Mode
              </span>
              <ChevronDown className={cn('w-3 h-3 transition-transform', showDevMode && 'rotate-180')} />
            </button>
            {showDevMode && (
              <div className="space-y-1 mt-1 pb-1">
                <p className="text-[9px] text-gray-400 italic px-1">Simulate persona contexts for testing:</p>
                {TEST_PERSONAS.map((persona) => {
                  const isCurrent = user.email.toLowerCase() === persona.email.toLowerCase();
                  return (
                    <button
                      key={persona.email}
                      onClick={() => switchPersona(persona.email)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isCurrent ? 'bg-emerald-100/70 font-bold text-[#07563D]' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-gray-800">{persona.name}</div>
                        <div className="text-[10px] text-gray-500">{persona.role}</div>
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
