import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  GitFork,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Clock,
  CircleDollarSign,
  UserCheck,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  HelpCircle,
  KeyRound,
  Sparkles,
  MapPin,
  ListOrdered,
  Package,
  UserPlus,
  UserMinus,
  CalendarRange,
  Hourglass,
  Laptop,
  LineChart,
  Award,
  GraduationCap,
  TrendingUp,
  Coins,
  HeartHandshake,
  HeartPulse,
  MessageSquare,
  Scale,
  Megaphone,
  Send,
  BarChart3,
  PieChart,
  Activity,
  Workflow,
  CheckSquare,
  Bell,
  Timer,
  BookOpen,
  FileCode,
  SlidersHorizontal,
  Lock,
  History,
  ShieldCheck,
  Cpu,
  Calendar,
  Layers,
  CheckCircle,
  Gift,
  Play,
  Minus,
  FileSpreadsheet,
  RefreshCw,
  Star,
  Target,
  AlertTriangle,
  Plane,
  LifeBuoy,
  CreditCard,
  Plus,
  FileCheck2,
  Folder,
  Share2,
  Zap,
  ScanFace,
  Camera,
  MonitorDot,
  Crosshair,
  Smartphone,
  Navigation,
  Coffee,
  ArrowRightLeft,
  CheckCircle2,
  MinusCircle,
  FileEdit,
  Terminal,
  DollarSign,
  Receipt,
  Calculator,
  Upload,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePermission } from '../../hooks/usePermission';
import { platformTenantService } from '../../services/platform/platformTenantService';
import { platformIncidentService } from '../../services/platform/platformIncidentService';
import { platformBillingService } from '../../services/platform/platformBillingService';
import { platformCustomerHealthService } from '../../services/platform/platformCustomerHealthService';
import { platformJobService } from '../../services/platform/platformJobService';
import { api } from '../../services/api';
import { onboardingService } from '../../services/onboardingService';
import { hrEventBus } from '../../services/hrEventBus';
import { supabase } from '../../lib/supabase';
import { canUseFeature, featureEntitlementService } from '../../services/tenant/featureEntitlementService';
import { moduleRegistryService } from '../../services/platform/moduleRegistryService';
import { isActiveRoute } from '../../lib/router/routeRegistry';
import { JoyLogo } from '../common/JoyLogo';

export interface SidebarProps {
  activeNav: string;
  onSelectNav?: (id: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  sectionHeader?: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const isItemActive = (itemId: string, currentNav: string): boolean => {
  if (!currentNav) return false;
  if (isActiveRoute(itemId, currentNav)) return true;
  if (itemId === currentNav) return true;

  // Leave module mappings
  if (itemId === 'leave' && (currentNav === 'leave' || currentNav.startsWith('leave-'))) return true;

  // Payroll module mappings
  if (itemId === 'payroll-dashboard' && (currentNav === 'payroll' || currentNav === 'payroll-dashboard')) return true;
  if (itemId === 'client-billing' && (
    currentNav === 'client-billing' ||
    currentNav === 'vendor-wages' ||
    currentNav === 'vendor/wages' ||
    currentNav === 'vendors/wages' ||
    currentNav === 'vendor-billing' ||
    currentNav === 'wage-engine' ||
    currentNav === 'payroll-billing' ||
    currentNav === 'billing' ||
    currentNav === 'invoicing' ||
    currentNav === 'payroll/billing' ||
    currentNav.startsWith('client-billing') ||
    currentNav === 'client-contracts' ||
    currentNav === 'client-invoicing' ||
    currentNav === 'billing-runs'
  )) return true;
  if (itemId === 'payroll-processing' && (currentNav === 'payroll-processing' || currentNav === 'processing' || currentNav === 'payroll-runs')) return true;
  if (itemId === 'payroll-salary' && (currentNav === 'payroll-salary' || currentNav === 'salary')) return true;
  if (itemId === 'payroll-earnings' && (currentNav === 'payroll-earnings' || currentNav === 'earnings')) return true;
  if (itemId === 'payroll-deductions' && (currentNav === 'payroll-deductions' || currentNav === 'deductions')) return true;
  if (itemId === 'payroll-statutory' && (currentNav === 'payroll-statutory' || currentNav === 'statutory')) return true;
  if (itemId === 'payroll-claims' && (currentNav === 'payroll-claims' || currentNav === 'claims' || currentNav === 'expense-desk' || currentNav === 'payroll-expenses')) return true;
  if (itemId === 'payroll-disbursement' && (currentNav === 'payroll-disbursement' || currentNav === 'disbursement' || currentNav === 'bank-disbursement')) return true;
  if (itemId === 'payroll-documents' && (currentNav === 'payroll-documents' || currentNav === 'payslips' || currentNav === 'digital-payslips')) return true;
  if (itemId === 'payroll-fnf' && (currentNav === 'payroll-fnf' || currentNav === 'fnf' || currentNav === 'settlement')) return true;
  if (itemId === 'payroll-reports' && (currentNav === 'payroll-reports' || currentNav === 'reports')) return true;
  if (itemId === 'payroll-settings' && (currentNav === 'payroll-settings')) return true;

  // Attendance module mappings
  if (itemId === 'attendance' && (currentNav === 'attendance' || currentNav === 'attendance-dashboard')) return true;
  if (itemId === 'attendance-employees' && (currentNav === 'employee-attendance' || currentNav === 'employees' || currentNav === 'attendance-employees')) return true;
  if (itemId === 'history' && (currentNav === 'attendance-history' || currentNav === 'ledger' || currentNav === 'history')) return true;
  if (itemId === 'late-early' && (currentNav === 'late-early')) return true;
  if (itemId === 'regularization' && (currentNav === 'regularization')) return true;
  if (itemId === 'exceptions' && (currentNav === 'exceptions')) return true;
  if (itemId === 'attendance-reports' && (currentNav === 'attendance-reports' || currentNav === 'reports' || currentNav === 'attendance/reports' || currentNav === '/attendance/reports' || currentNav === 'mis' || currentNav === 'attendance/mis')) return true;
  if (itemId === 'shifts' && (currentNav === 'shifts' || currentNav === 'shift-master' || currentNav === '/shifts')) return true;
  if (itemId === 'roster' && (currentNav === 'roster' || currentNav === 'shift-roster' || currentNav === 'shifts/roster' || currentNav === '/shifts/roster')) return true;
  if (itemId === 'shift-calendar' && (currentNav === 'shift-calendar' || currentNav === 'calendar' || currentNav === 'shifts/calendar' || currentNav === '/shifts/calendar')) return true;
  if (itemId === 'policies' && (currentNav === 'policies' || currentNav === 'attendance-policies' || currentNav === 'shifts/policies' || currentNav === '/policies' || currentNav === '/shifts/policies')) return true;
  // Clocking & Devices mappings with strict mutual exclusivity
  if (itemId === 'biometric') {
    if (
      currentNav === 'attendance-rules' ||
      currentNav === 'rules' ||
      currentNav === 'biometric-rules' ||
      currentNav === 'rules-engine' ||
      currentNav === 'biometric/rules' ||
      currentNav === '/biometric/rules' ||
      currentNav === '/attendance-rules' ||
      currentNav === 'gps' ||
      currentNav === 'biometric/gps' ||
      currentNav === '/biometric/gps' ||
      currentNav === 'face-attendance' ||
      currentNav === 'biometric/face' ||
      currentNav === '/biometric/face' ||
      currentNav === 'geofences' ||
      currentNav === 'biometric/geofences' ||
      currentNav === '/biometric/geofences'
    ) return false;
    if (currentNav === 'biometric' || currentNav === 'biometric-devices' || currentNav === '/biometric' || currentNav === '/biometric/devices' || currentNav === 'device-enrollment' || currentNav === 'device-sync' || currentNav === 'device-logs') return true;
  }
  if (itemId === 'attendance-rules') {
    if (currentNav === 'biometric' || currentNav === '/biometric' || currentNav === 'biometric-devices' || currentNav === '/biometric/devices') return false;
    if (currentNav === 'attendance-rules' || currentNav === 'rules' || currentNav === 'biometric-rules' || currentNav === 'rules-engine' || currentNav === 'biometric/rules' || currentNav === '/biometric/rules' || currentNav === '/attendance-rules') return true;
  }
  if (itemId === 'gps' && (currentNav === 'gps' || currentNav === 'gps-attendance' || currentNav === 'mobile-clocking' || currentNav === 'biometric/gps' || currentNav === '/biometric/gps')) return true;
  if (itemId === 'geofences' && (currentNav === 'geofences' || currentNav === 'geofencing' || currentNav === 'geofence-boundaries' || currentNav === 'biometric/geofences' || currentNav === '/biometric/geofences')) return true;
  if (itemId === 'face-attendance' && (currentNav === 'face-attendance' || currentNav === 'face-enrollment' || currentNav === 'face-devices' || currentNav === 'face-recognition' || currentNav === 'biometric/face' || currentNav === '/biometric/face')) return true;
  if (itemId === 'calculation-audit' && (currentNav === 'calculation-audit' || currentNav === 'payroll-inputs' || currentNav === 'payable-days' || currentNav === 'lop-desk' || currentNav === 'payroll-freeze' || currentNav === 'audit/ledger' || currentNav === '/audit/ledger')) return true;
  if (itemId === 'attendance-corrections' && (currentNav === 'attendance-corrections' || currentNav === 'audit/corrections' || currentNav === '/audit/corrections' || currentNav === 'corrections')) return true;
  if (itemId === 'approval-history' && (currentNav === 'approval-history' || currentNav === 'audit/approvals' || currentNav === '/audit/approvals' || currentNav === 'approvals')) return true;
  if (itemId === 'attendance-activity-logs' && (currentNav === 'attendance-activity-logs' || currentNav === 'audit/activity' || currentNav === '/audit/activity' || currentNav === 'activity-logs')) return true;

  // Work & Overtime mappings
  if (itemId === 'overtime' && (currentNav === 'overtime' || currentNav === 'work-overtime')) return true;
  if (itemId === 'overtime-requests' && (currentNav === 'overtime-requests' || currentNav === 'ot-requests')) return true;
  if (itemId === 'wfh' && (currentNav === 'wfh')) return true;
  if (itemId === 'breaks-workhours' && (currentNav === 'breaks-workhours' || currentNav === 'breaks')) return true;

  // People & Org mappings
  if (itemId === 'people' && (currentNav === 'people' || currentNav === 'workforce' || currentNav === 'employees')) return true;
  if (itemId === 'organization' && (currentNav === 'organization' || currentNav === 'departments' || currentNav === 'designations')) return true;
  if (itemId === 'storage-admin' && (currentNav === 'storage-admin' || currentNav === 'storage' || currentNav === 'storage/vault' || currentNav === 'vendor-storage' || currentNav === 'vendor/storage')) return true;
  if (itemId === 'documents' && (currentNav === 'documents')) return true;
  if (itemId === 'assets' && (currentNav === 'assets' || currentNav === 'company-asset-master' || currentNav === 'asset-master' || currentNav === 'company-assets')) return true;
  if (itemId === 'onboarding' && (currentNav === 'onboarding')) return true;
  if (itemId === 'offboarding' && (currentNav === 'offboarding')) return true;
  if (itemId === 'my-workspace' && (currentNav === 'my-workspace' || currentNav === 'workspace')) return true;

  // Performance mappings
  if (itemId === 'performance-dashboard' && (currentNav === 'performance' || currentNav === 'performance-dashboard')) return true;

  // LMS mappings
  if (itemId === 'lms-dashboard' && (currentNav === 'lms' || currentNav === 'lms-dashboard')) return true;

  // Workspace & Modern SaaS mappings
  if (itemId === 'command-center' && currentNav === 'command-center') return true;
  if (itemId === 'resources' && currentNav === 'resources') return true;
  if (itemId === 'approvals' && (currentNav === 'approvals' || currentNav === 'requests' || currentNav === 'admin-approvals' || currentNav === 'leave-approval')) return true;
  if (itemId === 'admin-access' && (currentNav === 'admin-access' || currentNav === 'admin-roles' || currentNav === 'admin-users' || currentNav === 'admin-permissions' || currentNav === 'admin' || currentNav === 'rbac' || currentNav === 'roles' || currentNav === 'users')) return true;

  // Admin mappings
  if (itemId === 'admin' && (currentNav === 'admin' || currentNav === 'administration' || currentNav === 'admin-dashboard')) return true;
  if (itemId === 'admin-users' && (currentNav === 'admin-users' || currentNav === 'users')) return true;
  if (itemId === 'admin-roles' && (currentNav === 'admin-roles' || currentNav === 'roles' || currentNav === 'rbac')) return true;
  if (itemId === 'admin-permissions' && (currentNav === 'admin-permissions' || currentNav === 'permissions')) return true;
  if (itemId === 'admin-workflows' && (currentNav === 'admin-workflows' || currentNav === 'workflows')) return true;
  if (itemId === 'admin-approvals' && (currentNav === 'admin-approvals' || currentNav === 'approvals')) return true;
  if (itemId === 'admin-notifications' && (currentNav === 'admin-notifications' || currentNav === 'notification-settings' || currentNav === 'notifications-settings')) return true;
  if (itemId === 'admin-audit' && (currentNav === 'admin-audit' || currentNav === 'audit-logs')) return true;
  if (itemId === 'admin-security' && (currentNav === 'admin-security' || currentNav === 'security')) return true;
  if (itemId === 'admin-api' && (currentNav === 'admin-api' || currentNav === 'api')) return true;
  if (itemId === 'admin-integrations' && (currentNav === 'admin-integrations' || currentNav === 'integrations')) return true;
  if (itemId === 'admin-subscription' && (currentNav === 'admin-subscription' || currentNav === 'subscription')) return true;
  if (itemId === 'admin-billing' && (currentNav === 'admin-billing' || currentNav === 'billing')) return true;
  if (itemId === 'admin-settings' && (currentNav === 'admin-settings' || currentNav === 'settings')) return true;
  if (itemId === 'notifications' && currentNav === 'notifications') return true;

  // SaaS Platform mappings
  if (itemId === 'platform-dashboard' && (currentNav === 'platform' || currentNav === 'platform-dashboard')) return true;
  if (itemId === 'platform-clients' && (currentNav === 'platform-clients' || currentNav === 'clients' || currentNav === 'saas-clients')) return true;
  if (itemId === 'platform-tenants' && (currentNav === 'platform-tenants' || currentNav === 'platform-organizations' || currentNav === 'platform-provisioning')) return true;
  if (itemId === 'platform-tenant-health' && (currentNav === 'platform-tenant-health' || currentNav === 'platform-health')) return true;
  if (itemId === 'saas-revenue' && (currentNav === 'saas-revenue' || (currentNav.startsWith('saas-') && currentNav !== 'saas-subscriptions' && currentNav !== 'saas-sales'))) return true;
  if (itemId === 'platform-sales' && (currentNav === 'platform-sales' || currentNav === 'sales' || currentNav === 'saas-sales' || currentNav === 'sales-pipeline')) return true;
  if (itemId === 'platform-quotations' && (currentNav === 'platform-quotations' || currentNav === 'quotations' || currentNav === 'saas-quotations')) return true;
  if (itemId === 'platform-subscriptions' && (currentNav === 'platform-subscriptions' || currentNav === 'saas-subscriptions')) return true;
  if ((itemId === 'platform-invoices' || itemId === 'platform-billing') && (currentNav === 'platform-invoices' || currentNav === 'platform-billing' || currentNav === 'invoices' || currentNav === 'saas-invoices')) return true;
  if (itemId === 'platform-plans' && (currentNav === 'platform-plans' || currentNav === 'platform-pricing' || currentNav === 'platform-entitlements')) return true;
  if (itemId === 'platform-addons' && (currentNav === 'platform-addons' || currentNav === 'saas-addons')) return true;
  if (itemId === 'platform-pricing-calculator' && (currentNav === 'platform-pricing-calculator' || currentNav === 'pricing-calculator')) return true;
  if (itemId === 'platform-catalogue' && (currentNav === 'platform-catalogue' || currentNav === 'platform-feature-catalogue' || currentNav === 'product-catalogue')) return true;
  if (itemId === 'platform-usage' && (currentNav === 'platform-usage' || currentNav === 'platform-metering')) return true;
  if (itemId === 'platform-features' && (currentNav === 'platform-features' || currentNav === 'platform-flags')) return true;
  if (itemId === 'platform-security' && (currentNav === 'platform-security')) return true;
  if (itemId === 'platform-sessions' && (currentNav === 'platform-sessions')) return true;
  if (itemId === 'platform-audit' && (currentNav === 'platform-audit')) return true;
  if (itemId === 'platform-support' && (currentNav === 'platform-support')) return true;
  if (itemId === 'platform-jobs' && (currentNav === 'platform-jobs')) return true;
  if (itemId === 'platform-incidents' && (currentNav === 'platform-incidents' || currentNav === 'platform-operations')) return true;
  if (itemId === 'platform-webhooks' && (currentNav === 'platform-webhooks')) return true;
  if (itemId === 'platform-notifications' && (currentNav === 'platform-notifications' || currentNav === 'platform-dlq' || currentNav === 'platform-events')) return true;
  if (itemId === 'platform-settings' && (currentNav === 'platform-settings' || currentNav === 'platform-account' || currentNav === 'platform-profile' || currentNav.startsWith('platform-account-'))) return true;
  if (itemId === 'platform-api' && (currentNav === 'platform-api' || currentNav === 'platform-keys')) return true;
  if (itemId === 'platform-staff' && (currentNav === 'platform-staff' || currentNav.startsWith('platform-staff/') || currentNav === 'platform-iam')) return true;

  // ESS & TL mappings
  if (itemId === 'ess-dashboard' && currentNav === 'ess') return true;
  if (itemId === 'tl-dashboard' && (currentNav === 'tl' || currentNav === 'supervisor')) return true;

  // Vendor Portal & Governance mappings
  if (itemId === 'vendors' && (currentNav === 'vendors' || currentNav === 'vendor-directory' || currentNav === 'vendor-hub' || currentNav === 'vendor')) return true;
  if (itemId === 'vendor-portal' && (currentNav === 'vendor' || currentNav === 'vendor-portal' || currentNav === 'vendor/portal' || currentNav === 'vendor-dashboard' || currentNav === 'vendor/dashboard')) return true;
  if (itemId === 'vendor-directory' && (currentNav === 'vendor-directory' || currentNav === 'vendor/directory' || currentNav === 'vendors/directory')) return true;
  if (itemId === 'vendor-purchase-orders' && (currentNav === 'vendor-purchase-orders' || currentNav === 'vendor/purchase-orders' || currentNav === 'vendor-pos' || currentNav === 'vendor/pos' || currentNav === 'purchase-orders' || currentNav === 'vendors/purchase-orders')) return true;
  if (itemId === 'vendor-invoices' && (currentNav === 'vendor-invoices' || currentNav === 'vendor/invoices' || currentNav === 'invoices' || currentNav === 'vendors/invoices')) return true;
  if (itemId === 'vendor-attendance-recon' && (currentNav === 'vendor-attendance-recon' || currentNav === 'vendor/attendance-recon' || currentNav === 'attendance-recon' || currentNav === 'vendors/attendance-recon' || currentNav === 'vendor-portal/attendance-recon')) return true;
  if (itemId === 'vendor-onboarding' && (currentNav === 'vendor-onboarding' || currentNav === 'vendor/onboarding')) return true;
  if (itemId === 'vendor-company' && (currentNav === 'vendor-company' || currentNav === 'vendor/company')) return true;
  if (itemId === 'vendor-contracts' && (currentNav === 'vendor-contracts' || currentNav === 'vendor/contracts')) return true;
  if (itemId === 'vendor-employee-onboarding' && (currentNav === 'vendor-employee-onboarding' || currentNav === 'vendor/employee-onboarding')) return true;
  if (itemId === 'vendor-workforce' && (currentNav === 'vendor-workforce' || currentNav === 'vendor/workforce')) return true;
  if (itemId === 'vendor-attendance' && (currentNav === 'vendor-attendance' || currentNav === 'vendor/attendance')) return true;
  if (itemId === 'vendor-miss-report' && (currentNav === 'vendor-miss-report' || currentNav === 'vendor/miss-report')) return true;
  if (itemId === 'vendor-payroll' && (currentNav === 'vendor-payroll' || currentNav === 'vendor/payroll')) return true;
  if (itemId === 'vendor-compliance' && (currentNav === 'vendor-compliance' || currentNav === 'vendor/compliance')) return true;
  if (itemId === 'vendor-leaderboard' && (currentNav === 'vendor-leaderboard' || currentNav === 'vendor/leaderboard')) return true;
  if (itemId === 'vendor-assets' && (currentNav === 'vendor-assets' || currentNav === 'vendor/assets')) return true;
  if (itemId === 'vendor-communication' && (currentNav === 'vendor-communication' || currentNav === 'vendor/communication')) return true;
  if (itemId === 'vendor-reports' && (currentNav === 'vendor-reports' || currentNav === 'vendor/reports')) return true;
  if (itemId === 'vendor-storage' && (currentNav === 'vendor-storage' || currentNav === 'vendor/storage')) return true;
  if (itemId === 'vendor-audit' && (currentNav === 'vendor-audit' || currentNav === 'vendor/audit')) return true;
  if (itemId.startsWith('vendor-') && currentNav === itemId) return true;

  // Specific prefix mappings for sub-modules that don't have separate parent nav items
  if (itemId === 'leave' && currentNav.startsWith('leave-')) return true;

  return false;
};

export const Sidebar: React.FC<SidebarProps> = ({ activeNav, onSelectNav }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { canViewModule, primaryRole, filterAccessibleEmployees, user } = usePermission();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Each role gets its own isolated collapse-state key so Super Admin and
  // Company Admin (or any other role switch) never share or overwrite each other.
  const getStorageKey = (role: string) =>
    `workforce_sidebar_collapsed_groups_${role.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      return {};
    } catch {
      return {};
    }
  });

  // Re-read from localStorage whenever the active role changes (e.g. role-switch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(primaryRole));
      setCollapsedGroups(saved ? JSON.parse(saved) : {});
    } catch {
      setCollapsedGroups({});
    }
  }, [primaryRole]);

  // Restore scroll position on initial render
  useEffect(() => {
    try {
      const savedScroll = sessionStorage.getItem('workforce_sidebar_scroll');
      if (savedScroll && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = Number(savedScroll);
      }
    } catch { }
  }, []);

  // Ensure active menu item is scrolled into view smoothly without blocking click handlers or causing layout thrashing
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (activeItemRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const element = activeItemRef.current;
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const isVisible = elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom;
        if (!isVisible) {
          element.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [activeNav, primaryRole]);

  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    try {
      sessionStorage.setItem('workforce_sidebar_scroll', String(e.currentTarget.scrollTop));
    } catch { }
  };

  const toggleGroup = (groupName: string) => {
    const next = { ...collapsedGroups, [groupName]: !collapsedGroups[groupName] };
    setCollapsedGroups(next);
    try {
      localStorage.setItem(getStorageKey(primaryRole), JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Only internal SaaS Platform roles see the Platform Control Plane.
  // Company Admin and HR roles see the HRMS workspace.
  const isPlatformAdmin = ['Super Admin', 'Platform Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(primaryRole);

  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [onboardingCount, setOnboardingCount] = useState<number>(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [, setEntitlementVersion] = useState<number>(0);

  // Subscribe to live tenant plan and feature entitlement updates
  useEffect(() => {
    const handleEntitlementChange = () => {
      setEntitlementVersion((v) => v + 1);
    };
    window.addEventListener('tenant:plan_updated', handleEntitlementChange);
    window.addEventListener('tenant:features_updated', handleEntitlementChange);
    window.addEventListener('tenant:addons_updated', handleEntitlementChange);
    window.addEventListener('organization:context_updated', handleEntitlementChange);

    return () => {
      window.removeEventListener('tenant:plan_updated', handleEntitlementChange);
      window.removeEventListener('tenant:features_updated', handleEntitlementChange);
      window.removeEventListener('tenant:addons_updated', handleEntitlementChange);
      window.removeEventListener('organization:context_updated', handleEntitlementChange);
    };
  }, []);

  const isRefreshingRef = useRef(false);
  const refreshCountsDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshCounts = useCallback(async () => {
    if (isRefreshingRef.current || isPlatformAdmin) return;
    isRefreshingRef.current = true;
    try {
      try {
        const activeComp = api.getActiveCompany();
        const emps = await api.getEmployees(activeComp?.id);
        const accessible = filterAccessibleEmployees(emps);
        const activeEmployees = accessible.filter(
          (e) => (e.status || 'Active').toLowerCase() === 'active' && (e as any).employment_status !== 'SUSPENDED'
        );
        setEmployeeCount(activeEmployees.length);
      } catch { }

      try {
        const m = await onboardingService.getMetrics();
        setOnboardingCount(m.active_onboardings);
      } catch { }

      try {
        const leaveRes = await supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING').limit(1);
        const docRes = await supabase.from('employee_documents').select('id', { count: 'exact', head: true }).eq('verification_status', 'PENDING').limit(1);
        const totalPending = (leaveRes.count || 0) + (docRes.count || 0);
        setPendingApprovalsCount(totalPending);
      } catch { }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [isPlatformAdmin, filterAccessibleEmployees]);

  useEffect(() => {
    refreshCounts();

    const debouncedRefresh = () => {
      if (refreshCountsDebounceTimer.current) clearTimeout(refreshCountsDebounceTimer.current);
      refreshCountsDebounceTimer.current = setTimeout(() => {
        refreshCounts();
      }, 500);
    };

    const unsubEmp = hrEventBus.subscribe('employee.*', debouncedRefresh);
    const unsubLeave = hrEventBus.subscribe('leave.*', debouncedRefresh);
    const unsubOnb = hrEventBus.subscribe('onboarding.*', debouncedRefresh);
    const unsubAppr = hrEventBus.subscribe('approval.*', debouncedRefresh);
    const unsubDoc = hrEventBus.subscribe('document.*', debouncedRefresh);

    const handleEmployeeCreated = () => debouncedRefresh();
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'workforce_employees' || e.key === 'workforce_employee_onboardings') {
        debouncedRefresh();
      }
    };

    window.addEventListener('employee:created', handleEmployeeCreated);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (refreshCountsDebounceTimer.current) clearTimeout(refreshCountsDebounceTimer.current);
      unsubEmp();
      unsubLeave();
      unsubOnb();
      unsubAppr();
      unsubDoc();
      window.removeEventListener('employee:created', handleEmployeeCreated);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [refreshCounts, primaryRole]);

  const orgCount = isPlatformAdmin ? platformTenantService.getOrganizations().items.length : 0;
  const activeIncidentsCount = isPlatformAdmin ? platformIncidentService.getActiveIncidents().length : 0;
  const overdueInvoicesCount = isPlatformAdmin ? platformBillingService.getInvoices().filter(i => i.status === 'Overdue').length : 0;
  const atRiskHealthCount = isPlatformAdmin ? (platformCustomerHealthService.getPortfolioMetrics().atRiskTenants + platformCustomerHealthService.getPortfolioMetrics().criticalTenants) : 0;
  const failedJobsCount = isPlatformAdmin ? platformJobService.getJobs().filter(j => j.status === 'Failed').length : 0;

  const platformGroups: NavGroup[] = [
    {
      groupName: 'PLATFORM',
      items: [
        { id: 'platform-dashboard', label: 'Command Center', icon: LayoutDashboard },
        { id: 'platform-tenants', label: 'Organizations', icon: Building2, badge: orgCount > 0 ? orgCount : undefined },
        { id: 'platform-staff', label: 'Platform Staff & IAM', icon: Users },
        { id: 'platform-incidents', label: 'Incidents', icon: ShieldAlert, badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined, badgeVariant: 'danger' },
      ],
    },
    {
      groupName: 'SAAS BUSINESS',
      items: [
        { id: 'saas-revenue', label: 'Revenue & Growth', icon: LineChart },
        { id: 'platform-sales', label: 'Sales & Pipeline', icon: TrendingUp },
        { id: 'platform-clients', label: 'Clients', icon: Building2 },
        { id: 'platform-quotations', label: 'Quotations', icon: FileText },
        { id: 'platform-subscriptions', label: 'Subscriptions', icon: Package },
        { id: 'platform-invoices', label: 'Invoices & Billing', icon: CreditCard, badge: overdueInvoicesCount > 0 ? overdueInvoicesCount : undefined, badgeVariant: 'danger' },
        { id: 'platform-plans', label: 'Plans & Pricing', icon: Layers },
        { id: 'platform-addons', label: 'Add-ons', icon: Sparkles },
        { id: 'platform-pricing-calculator', label: 'Pricing Calculator', icon: Calculator },
        { id: 'platform-usage', label: 'Usage & Metering', icon: BarChart3 },
      ],
    },
    {
      groupName: 'PRODUCT',
      items: [
        { id: 'platform-catalogue', label: 'Feature Catalogue', icon: BookOpen },
        { id: 'platform-features', label: 'Feature Flags', icon: SlidersHorizontal },
      ],
    },
    {
      groupName: 'SECURITY',
      items: [
        { id: 'platform-security', label: 'Security Center', icon: ShieldCheck },
        { id: 'platform-audit', label: 'Audit Log', icon: History },
        { id: 'platform-sessions', label: 'Active Sessions', icon: Laptop },
      ],
    },
    {
      groupName: 'OPERATIONS',
      items: [
        { id: 'platform-support', label: 'Support Center', icon: HelpCircle },
        { id: 'platform-jobs', label: 'Background Jobs', icon: Workflow, badge: failedJobsCount > 0 ? failedJobsCount : undefined, badgeVariant: 'danger' },
        { id: 'platform-webhooks', label: 'Webhooks & Mesh', icon: Send },
        { id: 'platform-notifications', label: 'Event Bus & DLQ', icon: Bell },
      ],
    },
    {
      groupName: 'SYSTEM',
      items: [
        { id: 'platform-settings', label: 'Platform Settings', icon: Settings },
        { id: 'platform-api', label: 'API & Integrations', icon: KeyRound },
      ],
    },
  ];

  const standardGroups: NavGroup[] = [
    {
      groupName: 'MY WORKSPACE',
      items: [
        { id: 'my-workspace', label: 'My Workspace', icon: Sparkles },
      ],
    },
    {
      groupName: 'DASHBOARD',
      items: [
        { id: 'dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
        { id: 'workforce-overview', label: 'Workforce Overview', icon: LineChart },
        { id: 'executive-overview', label: 'Executive HR Overview', icon: BarChart3 },
      ],
    },
    {
      groupName: 'PEOPLE & CORE HR',
      items: [
        { id: 'onboarding', label: 'Onboarding Engine', icon: UserPlus, badge: onboardingCount > 0 ? onboardingCount : undefined },
        { id: 'people', label: 'Employee Management', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'organization', label: 'Organization Architecture', icon: Building2 },
        { id: 'storage-admin', label: 'Document Vault & Storage', icon: Lock, badge: 'Vault' },
        { id: 'documents', label: 'Documents & E-Sign', icon: FileText },
        { id: 'assets', label: 'Asset Management', icon: Package },
        { id: 'offboarding', label: 'Offboarding & Exit', icon: UserMinus },
      ],
    },
    {
      groupName: 'CORE ATTENDANCE',
      items: [
        { id: 'attendance', label: 'Attendance Dashboard', icon: LayoutDashboard },
        { id: 'attendance-employees', label: 'Employee Attendance', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'history', label: 'Attendance History & Ledger', icon: History },
        { id: 'late-early', label: 'Late / Early Tracking', icon: Timer },
        { id: 'regularization', label: 'Regularization Desk', icon: FileText },
        { id: 'exceptions', label: 'Exceptions Queue', icon: ShieldAlert },
        { id: 'attendance-reports', label: 'Reports & Scope MIS', icon: BarChart3 },
      ],
    },
    {
      groupName: 'VENDOR & PROCUREMENT GOVERNANCE',
      items: [
        { id: 'vendor-portal', label: 'Vendor Governance Overview', icon: Building2 },
        { id: 'vendor-directory', label: 'Vendor Master Directory', icon: Building2 },
        { id: 'vendor-purchase-orders', label: 'Purchase Orders & Contracts', icon: ShoppingCart },
        { id: 'vendor-attendance-recon', label: 'Attendance & OT Recon', icon: Clock },
        { id: 'client-billing', label: 'Client Wage Billing & Invoicing', icon: Calculator, badge: 'Active' },
        { id: 'vendor-invoices', label: 'Invoices & 3-Way Match', icon: Receipt },
        { id: 'vendor-compliance', label: 'Statutory Vault & Compliance', icon: FileCheck2 },
      ],
    },
    {
      groupName: 'VENDOR WORKFORCE & FIELD OPS',
      items: [
        { id: 'vendor-workforce', label: 'Workforce Allocation', icon: Users },
        { id: 'vendor-attendance', label: 'Attendance & Ingestion', icon: Clock },
        { id: 'vendor-leaderboard', label: 'Performance Analytics', icon: Award },
        { id: 'vendor-assets', label: 'Asset Allocation', icon: Package },
        { id: 'vendor-communication', label: 'Communication Desk', icon: MessageSquare },
        { id: 'vendor-reports', label: 'Reports & Audit', icon: BarChart3 },
      ],
    },
    {
      groupName: 'RECRUITMENT & ATS',
      items: [
        { id: 'recruitment-dashboard', label: 'Recruitment Dashboard', icon: Briefcase },
        { id: 'recruitment-requisitions', label: 'Requisitions', icon: FileCheck2 },
        { id: 'recruitment-jobs', label: 'Job Openings', icon: Layers },
        { id: 'recruitment-applicants', label: 'Applicants', icon: Users },
        { id: 'recruitment-interviews', label: 'Interviews', icon: Calendar },
        { id: 'recruitment-offers', label: 'Offers', icon: Award },
        { id: 'recruitment-referrals', label: 'Referrals', icon: Share2 },
        { id: 'recruitment-talent-pool', label: 'Talent Pool', icon: Folder },
        { id: 'recruitment-analytics', label: 'Recruitment Analytics', icon: BarChart3 },
        { id: 'recruitment-automation', label: 'Recruitment Automation', icon: Zap },
      ],
    },
    {
      groupName: 'LEAVE',
      items: [
        { id: 'leave', label: 'Leave Management', icon: CalendarDays },
      ],
    },
    {
      groupName: 'WORK & OVERTIME',
      items: [
        { id: 'overtime', label: 'Overtime Engine', icon: TrendingUp },
        { id: 'overtime-requests', label: 'Overtime Requests', icon: Clock },
        { id: 'wfh', label: 'WFH Requests', icon: Laptop },
        { id: 'breaks-workhours', label: 'Breaks & Work Hours', icon: Coffee },
      ],
    },
    {
      groupName: 'SHIFT & SCHEDULING',
      items: [
        { id: 'shifts', label: 'Shift Master', icon: Clock },
        { id: 'roster', label: 'Shift Roster & Matrix', icon: CalendarRange },
        { id: 'shift-calendar', label: 'Shift Calendar', icon: Calendar },
        { id: 'policies', label: 'Attendance Policies', icon: SlidersHorizontal },
      ],
    },
    {
      groupName: 'PAYROLL',
      items: [
        { id: 'payroll-dashboard', label: 'Payroll Dashboard', icon: LayoutDashboard },
        { id: 'payroll-settings', label: 'Payroll Settings', icon: Settings },
        { id: 'payroll-statutory', label: 'Statutory & Tax Rules', icon: ShieldCheck },
        { id: 'payroll-salary', label: 'Salary Structures & Staff', icon: Building2 },
        { id: 'payroll-earnings', label: 'Earnings & Overtime', icon: TrendingUp },
        { id: 'payroll-deductions', label: 'Deductions, Loans & LOP', icon: Minus },
        { id: 'payroll-claims', label: 'Expense Claims & Approvals', icon: Receipt },
        { id: 'payroll-processing', label: 'Payroll Processing & Runs', icon: Play },
        { id: 'payroll-reports', label: 'Payroll Reports & ECR', icon: FileSpreadsheet },
        { id: 'payroll-disbursement', label: 'Bank Disbursement', icon: CreditCard },
        { id: 'payroll-documents', label: 'Digital Payslips & Docs', icon: FileText },
        { id: 'payroll-fnf', label: 'Full & Final (F&F)', icon: UserMinus },
      ],
    },
    {
      groupName: 'CLOCKING & DEVICES',
      items: [
        { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
        { id: 'attendance-rules', label: 'Attendance Rules', icon: SlidersHorizontal },
        { id: 'gps', label: 'GPS & Mobile Channel', icon: MapPin },
        { id: 'face-attendance', label: 'Face Recognition', icon: ScanFace },
        { id: 'geofences', label: 'Geofence Boundaries', icon: Crosshair },
      ],
    },
    {
      groupName: 'AUDIT & CONTROL',
      items: [
        { id: 'calculation-audit', label: 'Ledger & Audits', icon: ShieldCheck },
        { id: 'attendance-corrections', label: 'Attendance Corrections', icon: FileEdit },
        { id: 'approval-history', label: 'Approval History', icon: History },
        { id: 'attendance-activity-logs', label: 'System Activity Logs', icon: Terminal },
      ],
    },
    {
      groupName: 'PERFORMANCE',
      items: [
        { id: 'performance-dashboard', label: 'Performance Dashboard', icon: LayoutDashboard },
        { id: 'performance-goals', label: 'Goals', icon: Target },
        { id: 'performance-okr', label: 'OKR Objectives', icon: Target },
        { id: 'performance-kpi', label: 'KPI Library', icon: BarChart3 },
        { id: 'performance-kra', label: 'KRA Framework', icon: Layers },
        { id: 'performance-cycles', label: 'Review Cycles', icon: RefreshCw },
        { id: 'performance-reviews', label: 'Reviews & 360°', icon: Award },
        { id: 'performance-ratings', label: 'Ratings & Calibration', icon: Star },
        { id: 'performance-development', label: 'Development Plans', icon: GraduationCap },
        { id: 'performance-promotion', label: 'Promotions', icon: UserCheck },
        { id: 'performance-pip', label: 'PIP Engine', icon: AlertTriangle },
        { id: 'performance-reports', label: 'Performance Reports', icon: FileSpreadsheet },
      ],
    },
    {
      groupName: 'LEARNING & DEVELOPMENT',
      items: [
        { id: 'lms-dashboard', label: 'Learning Dashboard', icon: LayoutDashboard },
        { id: 'lms-courses', label: 'Courses & Player', icon: BookOpen },
        { id: 'lms-programs', label: 'Training Programs', icon: GraduationCap },
        { id: 'lms-calendar', label: 'Training Calendar', icon: Calendar },
        { id: 'lms-enrollment', label: 'Enrollments', icon: UserCheck },
        { id: 'lms-trainers', label: 'Trainers & Instructors', icon: Users },
        { id: 'lms-assessments', label: 'Assessments & Exams', icon: Award },
        { id: 'lms-certifications', label: 'Certifications & Expiry', icon: Award },
        { id: 'lms-mandatory', label: 'Mandatory Compliance', icon: ShieldCheck },
        { id: 'lms-skills', label: 'Skill Gap & Paths', icon: GitFork },
        { id: 'lms-feedback', label: 'Feedback & Ratings', icon: MessageSquare },
        { id: 'lms-reports', label: 'LMS Reports', icon: FileSpreadsheet },
        { id: 'lms-settings', label: 'LMS Settings', icon: Settings },
      ],
    },
    {
      groupName: 'EMPLOYEE RELATIONS',
      items: [
        { id: 'engagement', label: 'Engagement & Surveys', icon: HeartHandshake },
        { id: 'grievances', label: 'Grievance Desk', icon: MessageSquare },
        { id: 'discipline', label: 'Disciplinary Actions', icon: Scale },
        { id: 'posh', label: 'POSH Committee', icon: ShieldAlert },
        { id: 'compliance', label: 'Statutory Compliance', icon: ShieldCheck },
      ],
    },
    {
      groupName: 'TRAVEL & EXPENSE',
      items: [
        { id: 'other-travel', label: 'Travel & Expense Management', icon: Plane },
      ],
    },
    {
      groupName: 'COMMUNICATION & HELP',
      items: [
        { id: 'other-communication', label: 'HR Communications', icon: Megaphone },
        { id: 'helpdesk', label: 'Help Desk', icon: HelpCircle },
        { id: 'knowledge', label: 'Knowledge Centre', icon: BookOpen },
      ],
    },
    {
      groupName: 'ANALYTICS & REPORTS',
      items: [
        { id: 'analytics-overview', label: 'Analytics Overview', icon: BarChart3 },
        { id: 'analytics-hr', label: 'HR Dashboard', icon: Users },
        { id: 'analytics-ceo', label: 'CEO Dashboard', icon: Sparkles },
        { id: 'analytics-finance', label: 'Finance Dashboard', icon: CircleDollarSign },
        { id: 'analytics-recruitment', label: 'Recruitment Analytics', icon: Activity },
        { id: 'analytics-attendance', label: 'Attendance Analytics', icon: Clock },
        { id: 'analytics-leave', label: 'Leave Analytics', icon: Calendar },
        { id: 'analytics-payroll', label: 'Payroll Analytics', icon: CircleDollarSign },
        { id: 'analytics-performance', label: 'Performance Analytics', icon: Award },
        { id: 'analytics-training', label: 'Training Analytics', icon: GraduationCap },
        { id: 'analytics-attrition', label: 'Attrition Analytics', icon: TrendingUp },
        { id: 'analytics-workforce', label: 'Workforce Analytics', icon: Users },
        { id: 'analytics-cost', label: 'Cost Analytics', icon: CircleDollarSign },
        { id: 'analytics-reports', label: 'Custom Reports & Builder', icon: FileSpreadsheet },
        { id: 'analytics-settings', label: 'Analytics Settings', icon: Settings },
      ],
    },
    {
      groupName: 'AUTOMATION & ADMIN',
      items: [
        { id: 'company-onboarding', label: 'Company Setup Wizard', icon: Sparkles },
        { id: 'trust-legal', label: 'Trust & Legal Center', icon: ShieldCheck },
        { id: 'admin-roles', label: 'Role Management', icon: KeyRound },
        { id: 'admin-notifications', label: 'Notification Rules & Delivery', icon: SlidersHorizontal },
      ],
    },
  ];

  // ─── COMPANY ADMIN & ORGANIZATION OWNER: Authoritative 7-Group Operational Hierarchy ─
  const companyAdminGroups: NavGroup[] = [
    {
      groupName: 'MY WORK',
      items: [
        { id: 'my-workspace', label: 'Personal Workspace', icon: CheckSquare },
        { id: 'approvals', label: 'Tasks & Approvals', icon: CheckCircle2, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined },
        { id: 'notifications', label: 'Notifications', icon: Bell },
      ],
    },
    {
      groupName: 'WORKFORCE',
      items: [
        { id: 'people', label: 'People & Directory', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'onboarding', label: 'Onboarding', icon: UserPlus, badge: onboardingCount > 0 ? onboardingCount : undefined },
        { id: 'offboarding', label: 'Offboarding & Exits', icon: UserMinus },
        { id: 'organization', label: 'Organization & Hierarchy', icon: Building2 },
        { id: 'departments', label: 'Departments & Designations', icon: Layers },
        { id: 'locations', label: 'Locations & Geofences', icon: MapPin },
      ],
    },
    {
      groupName: 'OPERATIONS',
      items: [
        { id: 'attendance', label: 'Attendance Dashboard', icon: LayoutDashboard },
        { id: 'history', label: 'Attendance Ledger', icon: Clock },
        { id: 'shifts', label: 'Shifts & Rosters', icon: CalendarRange },
        { id: 'attendance-rules', label: 'Attendance Rules', icon: SlidersHorizontal },
        { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
        { id: 'regularization', label: 'Exceptions & Regularization', icon: AlertTriangle },
        { id: 'overtime', label: 'Overtime Governance', icon: TrendingUp },
      ],
    },
    {
      groupName: 'VENDOR & CLIENT OPERATIONS',
      items: [
        { id: 'vendor-portal', label: 'Vendor & Manpower Portal', icon: Building2, badge: 'Unified' },
        { id: 'vendor-workforce', label: 'Workforce Allocation', icon: Users },
        { id: 'client-billing', label: 'Client Billing & Invoicing', icon: Receipt, badge: 'Active' },
        { id: 'vendor-attendance', label: 'Vendor Attendance & Recon', icon: Clock },
        { id: 'vendor-compliance', label: 'Statutory Vault & Compliance', icon: FileCheck2 },
        { id: 'vendor-reports', label: 'Vendor Reports & Audit', icon: BarChart3 },
      ],
    },
    {
      groupName: 'PAYROLL & COMPLIANCE',
      items: [
        { id: 'payroll-dashboard', label: 'Payroll Center', icon: CircleDollarSign },
        { id: 'payroll-salary', label: 'Salary Structures', icon: Building2 },
        { id: 'payroll-documents', label: 'Digital Payslips', icon: FileText },
        { id: 'payroll-statutory', label: 'Statutory Compliance', icon: ShieldCheck },
        { id: 'payroll-reports', label: 'Payroll Reports & ECR', icon: FileSpreadsheet },
      ],
    },
    {
      groupName: 'REPORTS & COMMUNICATIONS',
      items: [
        { id: 'attendance-reports', label: 'HR Intelligence MIS', icon: BarChart3 },
        { id: 'other-communication', label: 'Communication Desk', icon: Megaphone },
        { id: 'helpdesk', label: 'Help Desk', icon: HelpCircle },
      ],
    },
    {
      groupName: 'ADMINISTRATION',
      items: [
        { id: 'admin-roles', label: 'Access & Roles', icon: KeyRound },
        { id: 'admin-security', label: 'Security', icon: Lock },
        { id: 'admin-integrations', label: 'Integrations', icon: GitFork },
        { id: 'admin-audit', label: 'Audit & Monitoring', icon: History },
        { id: 'admin-settings', label: 'Company Settings', icon: Settings },
      ],
    },
  ];

  // ─── HR HEAD: Full HR operations — no system admin config ────────────────
  const hrHeadGroups: NavGroup[] = [
    {
      groupName: 'MY WORKSPACE',
      items: [
        { id: 'my-workspace', label: 'My Workspace', icon: Sparkles },
      ],
    },
    {
      groupName: 'DASHBOARD',
      items: [
        { id: 'dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
        { id: 'workforce-overview', label: 'Workforce Overview', icon: LineChart },
        { id: 'executive-overview', label: 'Executive HR Overview', icon: BarChart3 },
      ],
    },
    {
      groupName: 'PEOPLE & CORE HR',
      items: [
        { id: 'onboarding', label: 'Onboarding Engine', icon: UserPlus, badge: onboardingCount > 0 ? onboardingCount : undefined },
        { id: 'people', label: 'Employee Management', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'organization', label: 'Organization Architecture', icon: Building2 },
        { id: 'documents', label: 'Documents & E-Sign', icon: FileText },
        { id: 'assets', label: 'Asset Management', icon: Package },
        { id: 'offboarding', label: 'Offboarding & Exit', icon: UserMinus },
      ],
    },
    {
      groupName: 'CORE ATTENDANCE',
      items: [
        { id: 'attendance', label: 'Attendance Dashboard', icon: LayoutDashboard },
        { id: 'attendance-employees', label: 'Employee Attendance', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'history', label: 'Attendance History & Ledger', icon: History },
        { id: 'late-early', label: 'Late / Early Tracking', icon: Timer },
        { id: 'regularization', label: 'Regularization Desk', icon: FileText },
        { id: 'exceptions', label: 'Exceptions Queue', icon: ShieldAlert },
        { id: 'attendance-reports', label: 'Reports & Scope MIS', icon: BarChart3 },
      ],
    },
    {
      groupName: 'VENDOR & PROCUREMENT GOVERNANCE',
      items: [
        { id: 'vendor-portal', label: 'Vendor Governance Overview', icon: Building2 },
        { id: 'vendor-directory', label: 'Vendor Master Directory', icon: Building2 },
        { id: 'vendor-purchase-orders', label: 'Purchase Orders & Contracts', icon: ShoppingCart },
        { id: 'vendor-attendance-recon', label: 'Attendance & OT Recon', icon: Clock },
        { id: 'client-billing', label: 'Client Wage Billing & Invoicing', icon: Calculator, badge: 'Active' },
        { id: 'vendor-invoices', label: 'Invoices & 3-Way Match', icon: Receipt },
        { id: 'vendor-compliance', label: 'Statutory Vault & Compliance', icon: FileCheck2 },
      ],
    },
    {
      groupName: 'VENDOR WORKFORCE & FIELD OPS',
      items: [
        { id: 'vendor-workforce', label: 'Workforce Allocation', icon: Users },
        { id: 'vendor-attendance', label: 'Attendance & Ingestion', icon: Clock },
        { id: 'vendor-leaderboard', label: 'Performance Analytics', icon: Award },
        { id: 'vendor-assets', label: 'Asset Allocation', icon: Package },
        { id: 'vendor-communication', label: 'Communication Desk', icon: MessageSquare },
        { id: 'vendor-reports', label: 'Reports & Audit', icon: BarChart3 },
      ],
    },
    {
      groupName: 'RECRUITMENT & ATS',
      items: [
        { id: 'recruitment', label: 'Recruitment / ATS', icon: Briefcase },
        { id: 'career-dev', label: 'Career Development', icon: TrendingUp },
      ],
    },
    {
      groupName: 'LEAVE',
      items: [
        { id: 'leave', label: 'Leave Management', icon: CalendarDays },
      ],
    },
    {
      groupName: 'WORK & OVERTIME',
      items: [
        { id: 'overtime', label: 'Overtime Engine', icon: TrendingUp },
        { id: 'overtime-requests', label: 'Overtime Requests', icon: Clock },
        { id: 'wfh', label: 'WFH Requests', icon: Laptop },
        { id: 'breaks-workhours', label: 'Breaks & Work Hours', icon: Coffee },
      ],
    },
    {
      groupName: 'SHIFT & SCHEDULING',
      items: [
        { id: 'shifts', label: 'Shift Master', icon: Clock },
        { id: 'roster', label: 'Shift Roster & Matrix', icon: CalendarRange },
        { id: 'shift-calendar', label: 'Shift Calendar', icon: Calendar },
        { id: 'policies', label: 'Attendance Policies', icon: SlidersHorizontal },
      ],
    },
    {
      groupName: 'PAYROLL',
      items: [
        { id: 'payroll-dashboard', label: 'Payroll Dashboard', icon: LayoutDashboard },
        { id: 'payroll-settings', label: 'Payroll Settings', icon: Settings },
        { id: 'payroll-statutory', label: 'Statutory & Tax Rules', icon: ShieldCheck },
        { id: 'payroll-salary', label: 'Salary Structures & Staff', icon: Building2 },
        { id: 'payroll-earnings', label: 'Earnings & Overtime', icon: TrendingUp },
        { id: 'payroll-deductions', label: 'Deductions, Loans & LOP', icon: Minus },
        { id: 'payroll-claims', label: 'Expense Claims & Approvals', icon: Receipt },
        { id: 'payroll-processing', label: 'Payroll Processing & Runs', icon: Play },
        { id: 'payroll-disbursement', label: 'Bank Disbursement', icon: CreditCard },
        { id: 'payroll-reports', label: 'Payroll Reports & ECR', icon: FileSpreadsheet },
        { id: 'payroll-documents', label: 'Digital Payslips & Docs', icon: FileText },
        { id: 'payroll-fnf', label: 'Full & Final (F&F)', icon: UserMinus },
      ],
    },
    {
      groupName: 'CLOCKING & DEVICES',
      items: [
        { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
        { id: 'attendance-rules', label: 'Biometric Rules & Automation', icon: SlidersHorizontal },
        { id: 'gps', label: 'GPS & Mobile Channel', icon: MapPin },
        { id: 'face-attendance', label: 'Face Recognition', icon: ScanFace },
        { id: 'geofences', label: 'Geofence Boundaries', icon: Crosshair },
      ],
    },
    {
      groupName: 'AUDIT & CONTROL',
      items: [
        { id: 'calculation-audit', label: 'Ledger & Audits', icon: ShieldCheck },
        { id: 'attendance-corrections', label: 'Attendance Corrections', icon: FileEdit },
        { id: 'approval-history', label: 'Approval History', icon: History },
        { id: 'attendance-activity-logs', label: 'System Activity Logs', icon: Terminal },
        { id: 'realtime-health', label: 'Realtime Sync Health', icon: Activity },
      ],
    },
    {
      groupName: 'PERFORMANCE',
      items: [
        { id: 'performance-dashboard', label: 'Performance Dashboard', icon: LayoutDashboard },
        { id: 'performance-goals', label: 'Goals', icon: Target },
        { id: 'performance-okr', label: 'OKR Objectives', icon: Target },
        { id: 'performance-kpi', label: 'KPI Library', icon: BarChart3 },
        { id: 'performance-kra', label: 'KRA Framework', icon: Layers },
        { id: 'performance-cycles', label: 'Review Cycles', icon: RefreshCw },
        { id: 'performance-reviews', label: 'Reviews & 360°', icon: Award },
        { id: 'performance-ratings', label: 'Ratings & Calibration', icon: Star },
        { id: 'performance-development', label: 'Development Plans', icon: GraduationCap },
        { id: 'performance-promotion', label: 'Promotions', icon: UserCheck },
        { id: 'performance-pip', label: 'PIP Engine', icon: AlertTriangle },
        { id: 'performance-reports', label: 'Performance Reports', icon: FileSpreadsheet },
      ],
    },
    {
      groupName: 'LEARNING & DEVELOPMENT',
      items: [
        { id: 'lms-dashboard', label: 'Learning Dashboard', icon: LayoutDashboard },
        { id: 'lms-courses', label: 'Courses & Player', icon: BookOpen },
        { id: 'lms-programs', label: 'Training Programs', icon: GraduationCap },
        { id: 'lms-calendar', label: 'Training Calendar', icon: Calendar },
        { id: 'lms-enrollment', label: 'Enrollments', icon: UserCheck },
        { id: 'lms-trainers', label: 'Trainers & Instructors', icon: Users },
        { id: 'lms-assessments', label: 'Assessments & Exams', icon: Award },
        { id: 'lms-certifications', label: 'Certifications & Expiry', icon: Award },
        { id: 'lms-mandatory', label: 'Mandatory Compliance', icon: ShieldCheck },
        { id: 'lms-skills', label: 'Skill Gap & Paths', icon: GitFork },
        { id: 'lms-feedback', label: 'Feedback & Ratings', icon: MessageSquare },
        { id: 'lms-reports', label: 'LMS Reports', icon: FileSpreadsheet },
        { id: 'lms-settings', label: 'LMS Settings', icon: Settings },
      ],
    },
    {
      groupName: 'EMPLOYEE RELATIONS',
      items: [
        { id: 'engagement', label: 'Engagement & Surveys', icon: HeartHandshake },
        { id: 'grievances', label: 'Grievance Desk', icon: MessageSquare },
        { id: 'discipline', label: 'Disciplinary Actions', icon: Scale },
        { id: 'posh', label: 'POSH Committee', icon: ShieldAlert },
        { id: 'compliance', label: 'Statutory Compliance', icon: ShieldCheck },
      ],
    },
    {
      groupName: 'TRAVEL & EXPENSE',
      items: [
        { id: 'other-travel', label: 'Travel & Expense Management', icon: Plane },
      ],
    },
    {
      groupName: 'COMMUNICATION & HELP',
      items: [
        { id: 'other-communication', label: 'HR Communications', icon: Megaphone },
        { id: 'helpdesk', label: 'Help Desk', icon: HelpCircle },
        { id: 'knowledge', label: 'Knowledge Centre', icon: BookOpen },
      ],
    },
    {
      groupName: 'ANALYTICS & REPORTS',
      items: [
        { id: 'analytics-overview', label: 'Analytics Overview', icon: BarChart3 },
        { id: 'analytics-hr', label: 'HR Dashboard', icon: Users },
        { id: 'analytics-ceo', label: 'CEO Dashboard', icon: Sparkles },
        { id: 'analytics-finance', label: 'Finance Dashboard', icon: CircleDollarSign },
        { id: 'analytics-recruitment', label: 'Recruitment Analytics', icon: Activity },
        { id: 'analytics-attendance', label: 'Attendance Analytics', icon: Clock },
        { id: 'analytics-leave', label: 'Leave Analytics', icon: Calendar },
        { id: 'analytics-payroll', label: 'Payroll Analytics', icon: CircleDollarSign },
        { id: 'analytics-performance', label: 'Performance Analytics', icon: Award },
        { id: 'analytics-training', label: 'Training Analytics', icon: GraduationCap },
        { id: 'analytics-attrition', label: 'Attrition Analytics', icon: TrendingUp },
        { id: 'analytics-workforce', label: 'Workforce Analytics', icon: Users },
        { id: 'analytics-cost', label: 'Cost Analytics', icon: CircleDollarSign },
        { id: 'analytics-reports', label: 'Custom Reports & Builder', icon: FileSpreadsheet },
      ],
    },
    {
      groupName: 'AUTOMATION & ADMIN',
      items: [
        { id: 'admin-roles', label: 'Role Management', icon: KeyRound },
        { id: 'admin-notifications', label: 'Notification Rules & Delivery', icon: SlidersHorizontal },
      ],
    },
  ];

  // ─── MANAGER: Department-level operations ────────────────────────────────
  const managerGroups: NavGroup[] = [
    {
      groupName: 'DASHBOARD',
      items: [
        { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
        { id: 'my-workspace', label: 'My Workspace', icon: Sparkles },
      ],
    },
    {
      groupName: 'CORE ATTENDANCE',
      items: [
        { id: 'attendance', label: 'Attendance Dashboard', icon: LayoutDashboard },
        { id: 'attendance-employees', label: 'Employee Attendance', icon: Users },
        { id: 'history', label: 'Attendance History & Ledger', icon: History },
        { id: 'late-early', label: 'Late / Early Tracking', icon: Timer },
        { id: 'regularization', label: 'Regularization Desk', icon: FileText },
        { id: 'exceptions', label: 'Exceptions Queue', icon: ShieldAlert },
        { id: 'attendance-reports', label: 'Reports & Scope MIS', icon: BarChart3 },
      ],
    },
    {
      groupName: 'LEAVE',
      items: [
        { id: 'leave', label: 'Leave Management', icon: CalendarDays },
      ],
    },
    {
      groupName: 'WORK & OVERTIME',
      items: [
        { id: 'overtime', label: 'Overtime Engine', icon: TrendingUp },
        { id: 'wfh', label: 'WFH Requests', icon: Laptop },
        { id: 'breaks-workhours', label: 'Breaks & Work Hours', icon: Coffee },
      ],
    },
    {
      groupName: 'SHIFT & SCHEDULING',
      items: [
        { id: 'shifts', label: 'Shift Master', icon: Clock },
        { id: 'roster', label: 'Shift Roster & Matrix', icon: CalendarRange },
        { id: 'shift-calendar', label: 'Shift Calendar', icon: Calendar },
        { id: 'policies', label: 'Attendance Policies', icon: SlidersHorizontal },
      ],
    },
    {
      groupName: 'CLOCKING & DEVICES',
      items: [
        { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
        { id: 'attendance-rules', label: 'Biometric Rules & Automation', icon: SlidersHorizontal },
        { id: 'gps', label: 'GPS & Mobile Channel', icon: MapPin },
        { id: 'face-attendance', label: 'Face Recognition', icon: ScanFace },
        { id: 'geofences', label: 'Geofence Boundaries', icon: Crosshair },
      ],
    },
    {
      groupName: 'APPROVALS',
      items: [
        { id: 'approvals', label: 'Unified Approval Hub', icon: CheckSquare, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined },
      ],
    },
    {
      groupName: 'PERFORMANCE',
      items: [
        { id: 'performance-dashboard', label: 'Performance Dashboard', icon: LayoutDashboard },
        { id: 'performance-goals', label: 'Goals', icon: Target },
        { id: 'performance-reviews', label: 'Reviews & 360°', icon: Award },
        { id: 'performance-ratings', label: 'Ratings & Calibration', icon: Star },
        { id: 'performance-development', label: 'Development Plans', icon: GraduationCap },
      ],
    },
    {
      groupName: 'LEARNING & DEVELOPMENT',
      items: [
        { id: 'lms-dashboard', label: 'Learning Dashboard', icon: LayoutDashboard },
        { id: 'lms-enrollment', label: 'Enrollments', icon: UserCheck },
      ],
    },
    {
      groupName: 'COMMUNICATION & HELP',
      items: [
        { id: 'helpdesk', label: 'HR Helpdesk Tickets', icon: HelpCircle, badge: 5 },
        { id: 'other-communication', label: 'Communication Hub', icon: Megaphone },
        { id: 'requests', label: 'Employee Service Requests', icon: Send },
      ],
    },
    {
      groupName: 'EMPLOYEE SELF-SERVICE',
      items: [
        { id: 'ess-dashboard', label: 'ESS Home', icon: LayoutDashboard },
        { id: 'ess-attendance', label: 'My Attendance', icon: Clock },
        { id: 'ess-leave', label: 'My Leave', icon: Calendar },
        { id: 'ess-payroll', label: 'My Payroll', icon: CircleDollarSign },
        { id: 'ess-requests', label: 'My Requests', icon: Plus },
        { id: 'ess-documents', label: 'My Documents', icon: FileText },
        { id: 'ess-profile', label: 'My Profile', icon: UserCheck },
      ],
    },
  ];

  // ─── TEAM LEAD: Team section + own ESS ──────────────────────────────────
  const teamLeadGroups: NavGroup[] = [
    {
      groupName: 'TL / SUPERVISOR',
      items: [
        { id: 'tl-dashboard', label: 'TL Dashboard', icon: LayoutDashboard },
        { id: 'tl-my-team', label: 'My Team', icon: Users },
        { id: 'tl-attendance', label: 'Team Attendance', icon: Clock },
        { id: 'tl-leave', label: 'Team Leave', icon: Calendar },
        { id: 'tl-approvals', label: 'Approval Center', icon: CheckCircle },
        { id: 'tl-tasks', label: 'Team Tasks', icon: Plus },
        { id: 'tl-performance', label: 'Performance', icon: Award },
        { id: 'tl-training', label: 'Team Training', icon: GraduationCap },
        { id: 'tl-communication', label: 'Communication', icon: Megaphone },
        { id: 'tl-reports', label: 'Team Reports', icon: BarChart3 },
      ],
    },
    {
      groupName: 'EMPLOYEE SELF-SERVICE',
      items: [
        { id: 'ess-dashboard', label: 'ESS Home', icon: LayoutDashboard },
        { id: 'ess-attendance', label: 'My Attendance', icon: Clock },
        { id: 'ess-leave', label: 'My Leave', icon: Calendar },
        { id: 'ess-payroll', label: 'My Payroll', icon: CircleDollarSign },
        { id: 'ess-requests', label: 'My Requests', icon: Plus },
        { id: 'ess-performance', label: 'My Performance', icon: Award },
        { id: 'ess-learning', label: 'My Learning', icon: GraduationCap },
        { id: 'ess-documents', label: 'My Documents', icon: FileText },
        { id: 'ess-communication', label: 'Communication', icon: Megaphone },
        { id: 'ess-profile', label: 'My Profile', icon: UserCheck },
      ],
    },
  ];

  // ─── EMPLOYEE: Self-service only ─────────────────────────────────────────
  const employeeGroups: NavGroup[] = [
    {
      groupName: 'EMPLOYEE SELF-SERVICE',
      items: [
        { id: 'ess-dashboard', label: 'ESS Home', icon: LayoutDashboard },
        { id: 'ess-attendance', label: 'My Attendance', icon: Clock },
        { id: 'ess-leave', label: 'My Leave', icon: Calendar },
        { id: 'ess-payroll', label: 'My Payroll', icon: CircleDollarSign },
        { id: 'ess-requests', label: 'My Requests', icon: Plus },
        { id: 'ess-performance', label: 'My Performance', icon: Award },
        { id: 'ess-learning', label: 'My Learning', icon: GraduationCap },
        { id: 'ess-documents', label: 'My Documents', icon: FileText },
        { id: 'ess-communication', label: 'Communication', icon: Megaphone },
        { id: 'ess-profile', label: 'My Profile', icon: UserCheck },
      ],
    },
  ];

  // ─── DEDICATED VENDOR PORTAL: 6 Purpose-Built Operational Pillars ───
  const vendorPortalGroups: NavGroup[] = [
    {
      groupName: 'WORKSPACE',
      items: [
        { id: 'vendor-dashboard', label: 'Vendor Dashboard', icon: LayoutDashboard },
        { id: 'vendor-tasks', label: 'Tasks & Approvals', icon: CheckSquare },
        { id: 'vendor-communication', label: 'Notifications & Desk', icon: MessageSquare },
      ],
    },
    {
      groupName: 'MY ORGANIZATION',
      items: [
        { id: 'vendor-company', label: 'Company Profile & Contracts', icon: Building2 },
        { id: 'vendor-compliance', label: 'Compliance Documents', icon: FileCheck2 },
      ],
    },
    {
      groupName: 'CONTRACTS & DEPLOYMENTS',
      items: [
        { id: 'vendor-contracts', label: 'My Contracts & Sites', icon: Briefcase },
        { id: 'vendor-workforce', label: 'Workforce Directory', icon: Users },
        { id: 'vendor-employee-onboarding', label: 'Employee Nominations', icon: UserPlus },
      ],
    },
    {
      groupName: 'ATTENDANCE & OPERATIONS',
      items: [
        { id: 'vendor-attendance', label: 'Attendance & Biometrics', icon: Clock },
        { id: 'vendor-attendance-recon', label: 'Attendance & OT Recon', icon: Clock },
        { id: 'vendor-miss-report', label: 'Attendance Exceptions', icon: ShieldAlert },
        { id: 'vendor-leaderboard', label: 'Performance Analytics', icon: Award },
      ],
    },
    {
      groupName: 'ORDERS & INVOICING',
      items: [
        { id: 'vendor-purchase-orders', label: 'Received Purchase Orders', icon: ShoppingCart },
        { id: 'vendor-invoices', label: 'Invoices & Payments', icon: Receipt },
      ],
    },
    {
      groupName: 'DOCUMENTS & SUPPORT',
      items: [
        { id: 'vendor-storage', label: 'Document Vault', icon: Lock },
        { id: 'vendor-audit', label: 'Audit & Access Logs', icon: History },
      ],
    },
  ];

  // Check if current user is an authorized vendor user
  const currentUser = user || api.getCurrentUser();
  const vendorRoleTitles = [
    'Vendor Admin',
    'Vendor Owner',
    'Vendor Partner',
    'Vendor HR Executive',
    'Vendor Operations Manager',
    'Vendor Finance Executive',
    'Vendor Viewer',
  ];
  const directRole = String((currentUser as any)?.role || (currentUser as any)?.role_display_name || '');
  const hasVendorRole =
    primaryRole === 'Vendor Admin' ||
    vendorRoleTitles.includes(primaryRole as string) ||
    vendorRoleTitles.includes(directRole) ||
    Boolean(
      currentUser?.roles?.some((r: any) =>
        vendorRoleTitles.some((vr) => vr.toLowerCase() === String(r?.name || '').toLowerCase())
      )
    );

  const isVendorRole =
    hasVendorRole ||
    (currentUser as any)?.userType === 'VENDOR' ||
    !!(currentUser as any)?.vendor_id;

  // Select nav groups based on the user's primary role
  const navGroups = (() => {
    if (isPlatformAdmin) return platformGroups;
    if (isVendorRole) return vendorPortalGroups;
    if (primaryRole === 'Company Admin') return companyAdminGroups;
    if (primaryRole === 'HR Head' || primaryRole === 'HR Admin') return hrHeadGroups;
    if (primaryRole === 'Manager') return managerGroups;
    if (primaryRole === 'Team Lead') return teamLeadGroups;
    if (primaryRole === 'Employee') return employeeGroups;
    return hrHeadGroups; // fallback
  })();

  // Dynamic tenant-level subscription and feature entitlement resolution
  const filteredNavGroups = navGroups
    .filter((group) => {
      // 1. Centralized Module Registry Group Visibility (Launch Scope / Paused Status)
      if (!moduleRegistryService.isNavGroupVisible(group.groupName, primaryRole)) {
        return false;
      }

      // 2. Tenant Subscription Plan Entitlement for the Group
      if (!isPlatformAdmin) {
        if (!featureEntitlementService.isNavGroupEntitled(group.groupName)) {
          return false;
        }
      }
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // 1. Centralized Module Registry Item Visibility & Dependency Check
        if (!moduleRegistryService.isNavItemVisible(item.id, primaryRole)) {
          return false;
        }

        // 2. Tenant Subscription Entitlement: verify module is purchased by tenant
        if (!isPlatformAdmin) {
          if (!featureEntitlementService.isModuleEntitledForCurrentTenant(item.id)) {
            return false;
          }
        }

        // 3. User RBAC Permission
        return canViewModule(item.id);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        'relative bg-white border-r border-gray-200/80 flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0 select-none z-30',
        isCollapsed ? 'w-[72px]' : 'w-[290px]'
      )}
    >
      {/* Brand Header */}
      <div className="h-[72px] px-3.5 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        {!isCollapsed ? (
          <div className="flex items-center min-w-0 flex-1 overflow-hidden">
            <JoyLogo size="sm" showText animated={false} />
          </div>
        ) : (
          <div className="mx-auto flex items-center justify-center">
            <JoyLogo size="sm" showText={false} animated glow />
          </div>
        )}

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer hidden md:block shrink-0 ml-1"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Group Items */}
      <div
        ref={scrollContainerRef}
        onScroll={handleSidebarScroll}
        className="flex-1 overflow-y-auto py-3 px-2.5 space-y-3"
      >
        {filteredNavGroups.map((group, idx) => {
          const hasActiveItem = group.items.some(item => isItemActive(item.id, activeNav));
          const isGroupCollapsed = hasActiveItem ? false : (collapsedGroups[group.groupName] ?? false);

          return (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <button
                  onClick={() => toggleGroup(group.groupName)}
                  className="w-full px-2.5 py-1.5 text-[10.5px] font-bold text-gray-500 hover:text-[#07563D] tracking-wider uppercase flex items-center justify-between cursor-pointer rounded-lg transition-colors hover:bg-gray-100/70 mb-0.5"
                >
                  <span className="font-extrabold tracking-wide">{group.groupName}</span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
                      isGroupCollapsed && '-rotate-90'
                    )}
                  />
                </button>
              )}

              {(!isGroupCollapsed || isCollapsed) && (
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = isItemActive(item.id, activeNav);

                    return (
                      <React.Fragment key={item.id}>
                        {item.sectionHeader && !isCollapsed && (
                          <div className="pt-2 pb-0.5 px-2.5 text-[9px] font-black tracking-widest text-emerald-800/60 uppercase border-t border-gray-100/60 mt-1 first:mt-0 first:border-t-0 first:pt-0">
                            {item.sectionHeader}
                          </div>
                        )}
                        <button
                          ref={isActive ? activeItemRef : undefined}
                          onClick={() => onSelectNav?.(item.id)}
                          title={item.label}
                          className={cn(
                            'relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer group focus:outline-none',
                            isActive
                              ? 'bg-emerald-50/90 text-[#07563D] font-bold border border-emerald-200/90 shadow-xs ring-1 ring-emerald-500/10'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 font-medium',
                            isCollapsed && 'justify-center px-0'
                          )}
                        >
                          {/* Left Active Bar */}
                          {isActive && !isCollapsed && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#07563D] rounded-r-full shadow-xs" />
                          )}

                          <Icon
                            className={cn(
                              'w-4 h-4 shrink-0 transition-colors',
                              isActive ? 'text-[#07563D] stroke-[2.4]' : 'text-gray-400 group-hover:text-gray-600'
                            )}
                          />

                          {!isCollapsed && (
                            <span className={cn(
                              'truncate flex-1 text-left text-[12px] leading-tight tracking-tight',
                              isActive ? 'font-bold text-[#07563D]' : 'font-medium text-gray-700'
                            )}>
                              {item.label}
                            </span>
                          )}

                          {!isCollapsed && item.badge !== undefined && (
                            <span
                              className={cn(
                                'ml-auto text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 tracking-tight leading-none',
                                isActive
                                  ? 'bg-emerald-100 text-[#07563D]'
                                  : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="text-[11px] truncate">
              <span className="font-bold text-[#07563D]">Role:</span>{' '}
              <span className="text-gray-700 font-bold">{primaryRole}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

