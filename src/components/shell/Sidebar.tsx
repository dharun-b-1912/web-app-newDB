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
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePermission } from '../../hooks/usePermission';
import {
  platformTenantService,
  platformIncidentService,
  platformBillingService,
  platformCustomerHealthService,
  platformJobService,
} from '../../services/platform';
import { api } from '../../services/api';
import { onboardingService } from '../../services/onboardingService';
import { hrEventBus } from '../../services/hrEventBus';
import { supabase } from '../../lib/supabase';

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

export const isItemActive = (itemId: string, currentNav: string): boolean => {
  if (!currentNav) return false;
  if (itemId === currentNav) return true;

  // Leave module mappings
  if (itemId === 'leave' && (currentNav === 'leave' || currentNav.startsWith('leave-'))) return true;

  // Payroll module mappings
  if (itemId === 'payroll-dashboard' && (currentNav === 'payroll' || currentNav === 'payroll-dashboard')) return true;
  if (itemId === 'payroll-processing' && (currentNav === 'payroll-processing' || currentNav === 'processing' || currentNav === 'payroll-runs')) return true;
  if (itemId === 'payroll-salary' && (currentNav === 'payroll-salary' || currentNav === 'salary')) return true;
  if (itemId === 'payroll-earnings' && (currentNav === 'payroll-earnings' || currentNav === 'earnings')) return true;
  if (itemId === 'payroll-deductions' && (currentNav === 'payroll-deductions' || currentNav === 'deductions')) return true;
  if (itemId === 'payroll-statutory' && (currentNav === 'payroll-statutory' || currentNav === 'statutory')) return true;
  if (itemId === 'payroll-claims' && (currentNav === 'payroll-claims' || currentNav === 'claims' || currentNav === 'expense-desk')) return true;
  if (itemId === 'payroll-disbursement' && (currentNav === 'payroll-disbursement' || currentNav === 'disbursement' || currentNav === 'bank-disbursement')) return true;
  if (itemId === 'payroll-documents' && (currentNav === 'payroll-documents' || currentNav === 'documents')) return true;
  if (itemId === 'payroll-fnf' && (currentNav === 'payroll-fnf' || currentNav === 'fnf')) return true;
  if (itemId === 'payroll-reports' && (currentNav === 'payroll-reports' || currentNav === 'reports')) return true;
  if (itemId === 'payroll-settings' && (currentNav === 'payroll-settings')) return true;

  // Attendance module mappings
  if (itemId === 'attendance' && (currentNav === 'attendance' || currentNav === 'attendance-dashboard')) return true;
  if (itemId === 'attendance-employees' && (currentNav === 'employee-attendance' || currentNav === 'employees' || currentNav === 'attendance-employees')) return true;
  if (itemId === 'history' && (currentNav === 'attendance-history' || currentNav === 'ledger' || currentNav === 'history')) return true;
  if (itemId === 'late-early' && (currentNav === 'late-early')) return true;
  if (itemId === 'regularization' && (currentNav === 'regularization')) return true;
  if (itemId === 'exceptions' && (currentNav === 'exceptions')) return true;
  if (itemId === 'shifts' && (currentNav === 'shifts' || currentNav === 'roster' || currentNav === 'shift-calendar')) return true;
  if (itemId === 'roster' && (currentNav === 'roster' || currentNav === 'shift-calendar')) return true;
  if (itemId === 'policies' && (currentNav === 'policies')) return true;
  if (itemId === 'biometric' && (currentNav === 'biometric' || currentNav === 'biometric-devices' || currentNav === 'device-enrollment' || currentNav === 'device-sync' || currentNav === 'device-logs')) return true;
  if (itemId === 'gps' && (currentNav === 'gps' || currentNav === 'gps-attendance' || currentNav === 'geofences' || currentNav === 'mobile-clocking')) return true;
  if (itemId === 'face-attendance' && (currentNav === 'face-attendance' || currentNav === 'face-enrollment' || currentNav === 'face-devices')) return true;
  if (itemId === 'calculation-audit' && (currentNav === 'calculation-audit' || currentNav === 'payroll-inputs' || currentNav === 'payable-days' || currentNav === 'lop-desk' || currentNav === 'payroll-freeze')) return true;
  if (itemId === 'attendance-corrections' && (currentNav === 'attendance-corrections')) return true;
  if (itemId === 'approval-history' && (currentNav === 'approval-history')) return true;
  if (itemId === 'attendance-activity-logs' && (currentNav === 'attendance-activity-logs')) return true;

  // Work & Overtime mappings
  if (itemId === 'overtime' && (currentNav === 'overtime' || currentNav === 'work-overtime')) return true;
  if (itemId === 'overtime-requests' && (currentNav === 'overtime-requests')) return true;
  if (itemId === 'wfh' && (currentNav === 'wfh')) return true;
  if (itemId === 'breaks-workhours' && (currentNav === 'breaks-workhours' || currentNav === 'breaks')) return true;

  // People & Org mappings
  if (itemId === 'people' && (currentNav === 'people')) return true;
  if (itemId === 'organization' && (currentNav === 'organization' || currentNav === 'departments' || currentNav === 'designations' || currentNav === 'locations')) return true;
  if (itemId === 'vendors' && (currentNav === 'vendors' || currentNav === 'organization-vendors')) return true;
  if (itemId === 'documents' && (currentNav === 'documents')) return true;
  if (itemId === 'assets' && (currentNav === 'assets')) return true;
  if (itemId === 'onboarding' && (currentNav === 'onboarding')) return true;
  if (itemId === 'offboarding' && (currentNav === 'offboarding')) return true;

  // Performance mappings
  if (itemId === 'performance-dashboard' && (currentNav === 'performance' || currentNav === 'performance-dashboard')) return true;

  // LMS mappings
  if (itemId === 'lms-dashboard' && (currentNav === 'lms' || currentNav === 'lms-dashboard')) return true;

  // Admin mappings
  if (itemId === 'admin-roles' && (currentNav === 'admin' || currentNav === 'rbac' || currentNav === 'admin-roles' || currentNav === 'roles' || currentNav === 'users' || currentNav === 'permissions')) return true;
  if (itemId === 'admin-notifications' && (currentNav === 'admin-notifications')) return true;
  if (itemId === 'notifications' && (currentNav === 'notifications')) return true;

  // SaaS Platform mappings
  if (itemId === 'platform-dashboard' && (currentNav === 'platform' || currentNav === 'platform-dashboard')) return true;
  if (itemId === 'platform-tenants' && (currentNav === 'platform-tenants' || currentNav === 'platform-organizations' || currentNav === 'platform-provisioning')) return true;
  if (itemId === 'platform-tenant-health' && (currentNav === 'platform-tenant-health' || currentNav === 'platform-health')) return true;
  if (itemId === 'saas-revenue' && (currentNav === 'saas-revenue' || (currentNav.startsWith('saas-') && currentNav !== 'saas-subscriptions'))) return true;
  if (itemId === 'platform-subscriptions' && (currentNav === 'platform-subscriptions' || currentNav === 'saas-subscriptions')) return true;
  if (itemId === 'platform-billing' && (currentNav === 'platform-billing' || currentNav === 'platform-invoices')) return true;
  if (itemId === 'platform-usage' && (currentNav === 'platform-usage' || currentNav === 'platform-metering')) return true;
  if (itemId === 'platform-features' && (currentNav === 'platform-features' || currentNav === 'platform-flags')) return true;
  if (itemId === 'platform-plans' && (currentNav === 'platform-plans')) return true;
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

  // Specific prefix mappings for sub-modules that don't have separate parent nav items
  if (itemId === 'leave' && currentNav.startsWith('leave-')) return true;
  if (itemId === 'payroll-dashboard' && currentNav.startsWith('payroll-')) return true;

  return false;
};

export const Sidebar: React.FC<SidebarProps> = ({ activeNav, onSelectNav }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { canViewModule, primaryRole, filterAccessibleEmployees } = usePermission();
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

  // Ensure active menu item is scrolled into view whenever activeNav or primaryRole changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeItemRef.current) {
        activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 120);
    return () => clearTimeout(timer);
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

  const refreshCounts = useCallback(async () => {
    if (!isPlatformAdmin) {
      try {
        const activeComp = api.getActiveCompany();
        const emps = await api.getEmployees(activeComp?.id);
        const accessible = filterAccessibleEmployees(emps);
        setEmployeeCount(accessible.length);
      } catch { }

      try {
        const m = await onboardingService.getMetrics();
        setOnboardingCount(m.active_onboardings);
      } catch { }

      try {
        const leaveRes = await supabase.from('leave_requests').select('id', { count: 'exact' }).eq('status', 'PENDING').limit(1);
        const docRes = await supabase.from('document_requirements').select('id', { count: 'exact' }).eq('status', 'SUBMITTED').limit(1);
        const totalPending = (leaveRes.count || 0) + (docRes.count || 0);
        setPendingApprovalsCount(totalPending);
      } catch { }
    }
  }, [isPlatformAdmin, filterAccessibleEmployees]);

  useEffect(() => {
    refreshCounts();

    const unsub = hrEventBus.subscribe('*', () => {
      refreshCounts();
    });

    const handleEmployeeCreated = () => refreshCounts();
    window.addEventListener('employee:created', handleEmployeeCreated);
    window.addEventListener('storage', handleEmployeeCreated);

    return () => {
      unsub();
      window.removeEventListener('employee:created', handleEmployeeCreated);
      window.removeEventListener('storage', handleEmployeeCreated);
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
        { id: 'platform-incidents', label: 'Incidents', icon: ShieldAlert, badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined, badgeVariant: 'danger' },
        { id: 'platform-staff', label: 'Platform Staff & IAM', icon: Users },
      ],
    },
    {
      groupName: 'SAAS BUSINESS',
      items: [
        { id: 'saas-revenue', label: 'Revenue & Growth', icon: LineChart },
        { id: 'platform-subscriptions', label: 'Subscriptions', icon: Package },
        { id: 'platform-billing', label: 'Billing & Invoices', icon: CreditCard, badge: overdueInvoicesCount > 0 ? overdueInvoicesCount : undefined, badgeVariant: 'danger' },
        { id: 'platform-usage', label: 'Usage & Metering', icon: BarChart3 },
        { id: 'platform-tenant-health', label: 'Tenant Health', icon: HeartPulse, badge: atRiskHealthCount > 0 ? atRiskHealthCount : undefined, badgeVariant: 'warning' },
      ],
    },
    {
      groupName: 'PRODUCT',
      items: [
        { id: 'platform-features', label: 'Feature Flags', icon: SlidersHorizontal },
        { id: 'platform-plans', label: 'Plans & Entitlements', icon: Layers },
      ],
    },
    {
      groupName: 'SECURITY',
      items: [
        { id: 'platform-security', label: 'Security Center', icon: ShieldCheck },
        { id: 'platform-sessions', label: 'Active Sessions', icon: Laptop },
        { id: 'platform-audit', label: 'Audit Log', icon: History },
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
      groupName: 'DASHBOARD',
      items: [
        { id: 'dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
        { id: 'workforce-overview', label: 'Workforce Overview', icon: LineChart },
        { id: 'executive-overview', label: 'Executive HR Overview', icon: BarChart3 },
        { id: 'my-workspace', label: 'My Workspace', icon: Sparkles },
      ],
    },
    {
      groupName: 'PEOPLE & CORE HR',
      items: [
        { id: 'people', label: 'Employee Management', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'organization', label: 'Organization Architecture', icon: Building2 },
        { id: 'vendors', label: 'Vendors & Manpower', icon: HeartHandshake },
        { id: 'documents', label: 'Documents & E-Sign', icon: FileText },
        { id: 'assets', label: 'Asset Management', icon: Package },
        { id: 'onboarding', label: 'Onboarding Engine', icon: UserPlus, badge: onboardingCount > 0 ? onboardingCount : undefined },
        { id: 'offboarding', label: 'Offboarding & Exit', icon: UserMinus },
      ],
    },
    {
      groupName: 'VENDOR & CONTRACTOR GOVERNANCE',
      items: [
        { id: 'vendors', label: 'Vendor Directory & Onboarding', icon: Building2, badge: 'Command' },
        { id: 'vendor-dashboard', label: 'Compliance Intelligence & Risk', icon: LayoutDashboard },
        { id: 'vendor-settlement-workspace', label: 'Settlement & 3-Way Match', icon: Sparkles, badge: 'Master' },
        { id: 'vendor-licenses', label: 'Licenses & Expiry Radar', icon: ShieldCheck, badge: 'Smart 🔔' },
        { id: 'vendor-statutory-returns', label: 'Form V & Statutory Returns', icon: FileSpreadsheet },
        { id: 'vendor-employees', label: 'Contract Workforce & Gate Pass', icon: Users },
        { id: 'vendor-assignments', label: 'Deployments & Sites', icon: MapPin },
        { id: 'vendor-attendance', label: 'Attendance & OT Audit', icon: Clock },
        { id: 'vendor-wages', label: 'Wage Breakdown', icon: Calculator },
        { id: 'vendor-payroll', label: 'Payroll Verification', icon: ShieldCheck },
        { id: 'vendor-payable', label: 'Vendor Payable Engine', icon: CircleDollarSign },
        { id: 'vendor-po', label: 'Purchase Orders', icon: FileText },
        { id: 'vendor-invoices', label: 'Invoices & 3-Way Match', icon: Upload },
        { id: 'vendor-compliance', label: 'Statutory (PF/ESI)', icon: Layers },
        { id: 'vendor-payslips', label: 'Payslip Package', icon: FileSpreadsheet },
        { id: 'vendor-payments', label: 'Payment Reconciliation', icon: CreditCard },
        { id: 'vendor-compliance-calendar', label: 'Compliance Deadlines Calendar', icon: Calendar },
        { id: 'vendor-audit-reports', label: 'Audit Trail & Reports', icon: History },
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
      groupName: 'CORE ATTENDANCE',
      items: [
        { id: 'attendance', label: 'Attendance Dashboard', icon: LayoutDashboard },
        { id: 'attendance-employees', label: 'Employee Attendance', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'history', label: 'Attendance History & Ledger', icon: History },
        { id: 'late-early', label: 'Late / Early Tracking', icon: Timer },
        { id: 'regularization', label: 'Regularization Desk', icon: FileText },
        { id: 'exceptions', label: 'Exceptions Queue', icon: ShieldAlert },
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
      groupName: 'CLOCKING & DEVICES',
      items: [
        { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
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
      groupName: 'PAYROLL',
      items: [
        { id: 'payroll-dashboard', label: 'Payroll Dashboard', icon: LayoutDashboard },
        { id: 'client-billing', label: 'Client Wage Billing & Invoicing', icon: Receipt, badge: 'Master' },
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
        { id: 'lms-trainers', label: 'Trainers & Vendors', icon: Users },
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
        { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
        { id: 'admin-notifications', label: 'Notification Settings', icon: SlidersHorizontal },
      ],
    },
  ];

  // ─── COMPANY ADMIN & ORGANIZATION OWNER: Executive Control, Multi-Entity, RBAC & Commercials ─
  const companyAdminGroups: NavGroup[] = [
    {
      groupName: 'EXECUTIVE COCKPIT',
      items: [
        { id: 'executive-overview', label: 'Executive Cockpit', icon: BarChart3 },
        { id: 'workforce-overview', label: 'Workforce Overview', icon: LineChart },
        { id: 'dashboard', label: 'Operations Summary', icon: LayoutDashboard },
        { id: 'my-workspace', label: 'My Workspace', icon: Sparkles },
      ],
    },
    {
      groupName: 'ORGANIZATION ARCHITECTURE',
      items: [
        { id: 'organization', label: 'Legal Entities & Hierarchy', icon: Building2 },
        { id: 'departments', label: 'Departments Master', icon: Layers },
        { id: 'designations', label: 'Designation Framework', icon: Award },
        { id: 'locations', label: 'Operating Locations', icon: MapPin },
      ],
    },
    {
      groupName: 'GOVERNANCE & ACCESS',
      items: [
        { id: 'people', label: 'Workforce Directory', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'admin-roles', label: 'RBAC & Access Control', icon: KeyRound },
        { id: 'documents', label: 'Enterprise Documents & E-Sign', icon: FileText },
        { id: 'assets', label: 'Company Asset Master', icon: Package },
      ],
    },
    {
      groupName: 'MANPOWER & COMMERCIALS',
      items: [
        { id: 'vendors', label: 'Vendor & Manpower Master', icon: HeartHandshake },
        { id: 'vendor-settlement-workspace', label: 'Settlement Workspace', icon: Sparkles, badge: 'Master' },
        { id: 'client-billing', label: 'Client Wage Invoicing', icon: Receipt, badge: 'Master' },
        { id: 'vendor-audit-reports', label: 'Vendor Compliance & ECR', icon: ShieldCheck },
      ],
    },
    {
      groupName: 'FINANCIAL & PAYROLL OVERSIGHT',
      items: [
        { id: 'payroll-dashboard', label: 'Payroll Executive Desk', icon: LayoutDashboard },
        { id: 'payroll-statutory', label: 'Statutory & Tax Rules', icon: ShieldCheck },
        { id: 'payroll-freeze', label: 'Payroll Freeze Controls', icon: SlidersHorizontal },
        { id: 'payroll-reports', label: 'Statutory Reports & ECR', icon: FileSpreadsheet },
      ],
    },
    {
      groupName: 'AUDIT, COMPLIANCE & ALERTS',
      items: [
        { id: 'calculation-audit', label: 'Financial Audit Logs', icon: ShieldCheck },
        { id: 'approval-history', label: 'Approval Audit Trail', icon: History },
        { id: 'trust-legal', label: 'Trust & Legal Center', icon: ShieldCheck },
        { id: 'notifications', label: 'Notification Center', icon: Bell },
      ],
    },
  ];

  // ─── HR HEAD: Full HR operations — no system admin config ────────────────
  const hrHeadGroups: NavGroup[] = [
    {
      groupName: 'DASHBOARD',
      items: [
        { id: 'dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
        { id: 'workforce-overview', label: 'Workforce Overview', icon: LineChart },
        { id: 'executive-overview', label: 'Executive HR Overview', icon: BarChart3 },
        { id: 'my-workspace', label: 'My Workspace', icon: Sparkles },
      ],
    },
    {
      groupName: 'PEOPLE & CORE HR',
      items: [
        { id: 'people', label: 'Employee Management', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'organization', label: 'Organization Architecture', icon: Building2 },
        { id: 'documents', label: 'Documents & E-Sign', icon: FileText },
        { id: 'assets', label: 'Asset Management', icon: Package },
        { id: 'onboarding', label: 'Onboarding Engine', icon: UserPlus, badge: onboardingCount > 0 ? onboardingCount : undefined },
        { id: 'offboarding', label: 'Offboarding & Exit', icon: UserMinus },
      ],
    },
    {
      groupName: 'VENDOR & CONTRACTOR GOVERNANCE',
      items: [
        { id: 'vendors', label: 'Vendor Directory & Onboarding', icon: Building2, badge: 'Command' },
        { id: 'vendor-dashboard', label: 'Compliance Intelligence & Risk', icon: LayoutDashboard },
        { id: 'vendor-settlement-workspace', label: 'Settlement & 3-Way Match', icon: Sparkles, badge: 'Master' },
        { id: 'vendor-licenses', label: 'Licenses & Expiry Radar', icon: ShieldCheck, badge: 'Smart 🔔' },
        { id: 'vendor-statutory-returns', label: 'Form V & Statutory Returns', icon: FileSpreadsheet },
        { id: 'vendor-employees', label: 'Contract Workforce & Gate Pass', icon: Users },
        { id: 'vendor-assignments', label: 'Deployments & Sites', icon: MapPin },
        { id: 'vendor-attendance', label: 'Attendance & OT Audit', icon: Clock },
        { id: 'vendor-wages', label: 'Wage Breakdown', icon: Calculator },
        { id: 'vendor-payroll', label: 'Payroll Verification', icon: ShieldCheck },
        { id: 'vendor-payable', label: 'Vendor Payable Engine', icon: CircleDollarSign },
        { id: 'vendor-po', label: 'Purchase Orders', icon: FileText },
        { id: 'vendor-invoices', label: 'Invoices & 3-Way Match', icon: Upload },
        { id: 'vendor-compliance', label: 'Statutory (PF/ESI)', icon: Layers },
        { id: 'vendor-payslips', label: 'Payslip Package', icon: FileSpreadsheet },
        { id: 'vendor-payments', label: 'Payment Reconciliation', icon: CreditCard },
        { id: 'vendor-compliance-calendar', label: 'Compliance Deadlines Calendar', icon: Calendar },
        { id: 'vendor-audit-reports', label: 'Audit Trail & Reports', icon: History },
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
      groupName: 'CORE ATTENDANCE',
      items: [
        { id: 'attendance', label: 'Attendance Dashboard', icon: LayoutDashboard },
        { id: 'attendance-employees', label: 'Employee Attendance', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'history', label: 'Attendance History & Ledger', icon: History },
        { id: 'late-early', label: 'Late / Early Tracking', icon: Timer },
        { id: 'regularization', label: 'Regularization Desk', icon: FileText },
        { id: 'exceptions', label: 'Exceptions Queue', icon: ShieldAlert },
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
      groupName: 'CLOCKING & DEVICES',
      items: [
        { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
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
        { id: 'lms-trainers', label: 'Trainers & Vendors', icon: Users },
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
        { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
        { id: 'admin-notifications', label: 'Notification Settings', icon: SlidersHorizontal },
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

  const vendorGroups: NavGroup[] = [
    {
      groupName: 'VENDOR OPERATIONS & COMPLIANCE',
      items: [
        { id: 'vendor-settlement-workspace', label: 'Settlement Workspace', icon: Sparkles, badge: 'Master' },
        { id: 'vendor-dashboard', label: 'Vendor Dashboard & Risk', icon: LayoutDashboard },
        { id: 'vendor-licenses', label: 'Licenses & Expiry Hub', icon: ShieldCheck, badge: 'Smart 🔔' },
        { id: 'vendor-compliance-calendar', label: 'Compliance Calendar', icon: Calendar },
        { id: 'vendor-statutory-returns', label: 'Form V & Returns', icon: FileSpreadsheet },
      ],
    },
    {
      groupName: 'CONTRACT WORKFORCE',
      items: [
        { id: 'vendor-employees', label: 'Assigned Workforce', icon: Users },
        { id: 'vendor-assignments', label: 'Deployments & Sites', icon: MapPin },
        { id: 'vendor-attendance', label: 'Attendance & OT', icon: Clock },
      ],
    },
    {
      groupName: 'PAYROLL & INVOICES',
      items: [
        { id: 'vendor-wages', label: 'Wage Breakdown', icon: Calculator },
        { id: 'vendor-payroll', label: 'Payroll Verification', icon: ShieldCheck },
        { id: 'vendor-payable', label: 'Vendor Payable Engine', icon: CircleDollarSign },
        { id: 'vendor-po', label: 'Purchase Orders', icon: FileText },
        { id: 'vendor-invoices', label: 'Invoices & 3-Way Match', icon: Upload },
        { id: 'vendor-compliance', label: 'Statutory (PF/ESI)', icon: Layers },
        { id: 'vendor-payslips', label: 'Payslip Package', icon: FileSpreadsheet },
        { id: 'vendor-payments', label: 'Payment Reconciliation', icon: CreditCard },
        { id: 'vendor-audit-reports', label: 'Audit Trail & Reports', icon: History },
      ],
    },
  ];

  // Select nav groups based on the user's primary role
  const navGroups = (() => {
    if (isPlatformAdmin) return platformGroups;
    if (primaryRole === 'Vendor Admin') return vendorGroups;
    if (primaryRole === 'Company Admin') return companyAdminGroups;
    if (primaryRole === 'HR Head' || primaryRole === 'HR Admin') return hrHeadGroups;
    if (primaryRole === 'Manager') return managerGroups;
    if (primaryRole === 'Team Lead') return teamLeadGroups;
    if (primaryRole === 'Employee') return employeeGroups;
    return hrHeadGroups; // fallback
  })();

  // Tenant-level feature toggle: For Joy Manpower / current tenant, Recruitment & ATS, Career Development, Performance, L&D, Analytics, and Travel & Expense are disabled,
  // while remaining fully preserved and configurable in the SaaS platform for future tenants.
  const isRecruitmentEnabledForTenant = false;
  const isPerformanceEnabledForTenant = false;
  const isLndEnabledForTenant = false;
  const isAnalyticsEnabledForTenant = false;
  const isTravelExpenseEnabledForTenant = false;

  const filteredNavGroups = navGroups
    .filter(group => {
      if (!isPlatformAdmin && primaryRole !== 'Vendor Admin') {
        if (group.groupName === 'RECRUITMENT & ATS' && !isRecruitmentEnabledForTenant) return false;
        if (group.groupName === 'PERFORMANCE' && !isPerformanceEnabledForTenant) return false;
        if (group.groupName === 'LEARNING & DEVELOPMENT' && !isLndEnabledForTenant) return false;
        if (group.groupName === 'ANALYTICS & REPORTS' && !isAnalyticsEnabledForTenant) return false;
        if (group.groupName === 'TRAVEL & EXPENSE' && !isTravelExpenseEnabledForTenant) return false;
      }
      return true;
    })
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (primaryRole === 'Vendor Admin') return true;
        if (!isPlatformAdmin) {
          if (!isRecruitmentEnabledForTenant && (item.id === 'recruitment' || item.id.startsWith('recruitment-') || item.id === 'career-dev')) {
            return false;
          }
          if (!isPerformanceEnabledForTenant && (item.id.startsWith('performance-') || item.id === 'ess-performance' || item.id === 'tl-performance')) {
            return false;
          }
          if (!isLndEnabledForTenant && (item.id.startsWith('lms-') || item.id === 'ess-learning' || item.id === 'tl-training')) {
            return false;
          }
          if (!isAnalyticsEnabledForTenant && item.id.startsWith('analytics-')) {
            return false;
          }
          if (!isTravelExpenseEnabledForTenant && (item.id === 'other-travel' || item.id.startsWith('travel-'))) {
            return false;
          }
        }
        return canViewModule(item.id);
      }),
    }))
    .filter(group => group.items.length > 0);

  return (
    <aside
      className={cn(
        'relative bg-white border-r border-gray-200/80 flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0 select-none z-30',
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Brand Header */}
      <div className="h-[72px] px-3.5 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        {!isCollapsed ? (
          <div className="flex items-center min-w-0 flex-1">
            <img
              src="/joy-people-hr-logo.png"
              alt="Joy PeopleHR"
              className="h-12 w-auto max-w-[200px] object-contain shrink-0"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200/80 p-1.5 shadow-xs mx-auto flex items-center justify-center overflow-hidden">
            <img src="/logo-icon.png" alt="Joy PeopleHR" className="w-full h-full object-contain" />
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
        className="flex-1 overflow-y-auto py-3 px-2 space-y-3"
      >
        {filteredNavGroups.map((group, idx) => {
          const hasActiveItem = group.items.some(item => isItemActive(item.id, activeNav));
          const isGroupCollapsed = hasActiveItem ? false : (collapsedGroups[group.groupName] ?? false);

          return (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <button
                  onClick={() => toggleGroup(group.groupName)}
                  className="w-full px-2.5 py-1.5 text-[11px] font-black text-gray-800 hover:text-[#07563D] tracking-wider uppercase flex items-center justify-between cursor-pointer rounded-lg transition-colors border-b border-gray-100/80 mb-1 bg-gray-50/40 hover:bg-emerald-50/60"
                >
                  <span className="font-extrabold tracking-wide">{group.groupName}</span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-gray-500 transition-transform duration-200',
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
                          title={isCollapsed ? item.label : undefined}
                          className={cn(
                            'relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group',
                            isActive
                              ? 'bg-emerald-50 text-[#07563D] font-bold shadow-2xs'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80',
                            isCollapsed && 'justify-center px-0'
                          )}
                        >
                          {/* Left Active Bar */}
                          {isActive && !isCollapsed && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#07563D] rounded-r-full" />
                          )}

                          <Icon
                            className={cn(
                              'w-4 h-4 shrink-0 transition-colors',
                              isActive ? 'text-[#07563D]' : 'text-gray-400 group-hover:text-gray-600'
                            )}
                          />

                          {!isCollapsed && <span className="truncate text-[11px] sm:text-xs">{item.label}</span>}

                          {!isCollapsed && item.badge !== undefined && (
                            <span
                              className={cn(
                                'ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0',
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

