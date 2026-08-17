import React, { useState, useEffect } from 'react';
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

export interface SidebarProps {
  activeNav: string;
  onSelectNav?: (id: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeNav, onSelectNav }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { canViewModule, primaryRole } = usePermission();

  // Each role gets its own isolated collapse-state key so Super Admin and
  // Company Admin (or any other role switch) never share or overwrite each other.
  const getStorageKey = (role: string) =>
    `workforce_sidebar_collapsed_groups_${role.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      // primaryRole isn't available yet in the lazy initialiser; we'll sync in useEffect
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
  useEffect(() => {
    let isMounted = true;
    if (!isPlatformAdmin) {
      api.getEmployees().then((emps) => {
        if (isMounted) setEmployeeCount(emps.length);
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [primaryRole, isPlatformAdmin]);

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
        { id: 'documents', label: 'Documents & E-Sign', icon: FileText },
        { id: 'assets', label: 'Asset Management', icon: Package },
        { id: 'onboarding', label: 'Onboarding Engine', icon: UserPlus },
        { id: 'offboarding', label: 'Offboarding & Exit', icon: UserMinus },
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
      groupName: 'ATTENDANCE & TIME',
      items: [
        { id: 'attendance', label: 'Attendance Dashboard', icon: LayoutDashboard },
        { id: 'attendance-employees', label: 'Employee Attendance', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'regularization', label: 'Regularization Desk', icon: FileText },
        { id: 'overtime', label: 'Overtime Engine', icon: TrendingUp },
        { id: 'shifts', label: 'Shift Roster & Swaps', icon: CalendarRange },
        { id: 'time-tracking', label: 'Time Tracking & Log', icon: Hourglass },
        { id: 'wfh', label: 'WFH Requests', icon: Laptop },
        { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
        { id: 'gps', label: 'GPS Geofence Clocking', icon: MapPin },
        { id: 'late-early', label: 'Late / Early Tracking', icon: Clock },
      ],
    },
    {
      groupName: 'LEAVE',
      items: [
        { id: 'leave-dashboard', label: 'Leave Dashboard', icon: LayoutDashboard },
        { id: 'leave-types', label: 'Leave Types', icon: SlidersHorizontal },
        { id: 'leave-policies', label: 'Leave Policies', icon: BookOpen },
        { id: 'leave-calendar', label: 'Leave Calendar', icon: Calendar },
        { id: 'leave-balance', label: 'Leave Balance', icon: Layers },
        { id: 'leave-requests', label: 'Leave Requests', icon: FileText },
        { id: 'leave-approval', label: 'Approval', icon: CheckCircle },
        { id: 'leave-holidays', label: 'Holiday Calendar', icon: CalendarDays },
        { id: 'leave-compoff', label: 'Compensatory Off', icon: Gift },
        { id: 'leave-encashment', label: 'Leave Encashment', icon: Coins },
        { id: 'leave-adjustments', label: 'Leave Adjustments', icon: History },
        { id: 'leave-accrual', label: 'Leave Accrual', icon: Timer },
        { id: 'leave-exceptions', label: 'Leave Exceptions', icon: ShieldAlert },
        { id: 'leave-reports', label: 'Leave Reports', icon: BarChart3 },
      ],
    },
    {
      groupName: 'PAYROLL',
      items: [
        { id: 'payroll-dashboard', label: 'Payroll Dashboard', icon: LayoutDashboard },
        { id: 'payroll-salary', label: 'Salary Management', icon: Building2 },
        { id: 'payroll-processing', label: 'Payroll Processing', icon: Play },
        { id: 'payroll-earnings', label: 'Earnings', icon: TrendingUp },
        { id: 'payroll-deductions', label: 'Deductions & LOP', icon: Minus },
        { id: 'payroll-statutory', label: 'Statutory Compliance', icon: ShieldCheck },
        { id: 'payroll-documents', label: 'Payslips & Tax Docs', icon: FileText },
        { id: 'payroll-fnf', label: 'Full & Final (F&F)', icon: UserMinus },
        { id: 'payroll-reports', label: 'Payroll Reports', icon: FileSpreadsheet },
        { id: 'payroll-settings', label: 'Payroll Settings', icon: Settings },
      ],
    },
    {
      groupName: 'WORKFORCE PLANNING',
      items: [
        { id: 'workforce-planning', label: 'Headcount & Capacity Planning', icon: LineChart },
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
        { id: 'helpdesk', label: 'HR Helpdesk Tickets', icon: HelpCircle },
        { id: 'other-communication', label: 'Communication Hub', icon: Megaphone },
        { id: 'requests', label: 'Employee Service Requests', icon: Send },
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
        { id: 'workflows', label: 'Workflow Engine', icon: Workflow },
        { id: 'approvals', label: 'Unified Approval Hub', icon: CheckSquare, badge: 27 },
        { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
        { id: 'scheduled-jobs', label: 'Scheduled Cron Jobs', icon: Timer },
        { id: 'admin-dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
        { id: 'admin-users', label: 'User Management', icon: UserCheck },
        { id: 'admin-roles', label: 'Role Management', icon: KeyRound },
        { id: 'admin-permissions', label: 'Permissions & Scope', icon: SlidersHorizontal },
        { id: 'admin-workflows', label: 'Workflow Builder', icon: Workflow },
        { id: 'admin-approvals', label: 'Approval Config', icon: CheckCircle },
        { id: 'admin-notifications', label: 'Notification Settings', icon: Bell },
        { id: 'admin-audit', label: 'Audit Logs', icon: History },
        { id: 'admin-security', label: 'Security & MFA', icon: Lock },
        { id: 'admin-api', label: 'API & Webhooks', icon: Cpu },
        { id: 'admin-integrations', label: 'Integrations', icon: GitFork },
        { id: 'admin-subscription', label: 'Subscription Plan', icon: Cpu },
        { id: 'admin-billing', label: 'Billing & Invoices', icon: CreditCard },
        { id: 'admin-settings', label: 'System Settings', icon: Settings },
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
        { id: 'onboarding', label: 'Onboarding Engine', icon: UserPlus },
        { id: 'offboarding', label: 'Offboarding & Exit', icon: UserMinus },
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
      groupName: 'ATTENDANCE & TIME',
      items: [
        { id: 'attendance', label: 'Attendance Dashboard', icon: LayoutDashboard },
        { id: 'attendance-employees', label: 'Employee Attendance', icon: Users, badge: employeeCount > 0 ? employeeCount : undefined },
        { id: 'regularization', label: 'Regularization Desk', icon: FileText },
        { id: 'overtime', label: 'Overtime Engine', icon: TrendingUp },
        { id: 'shifts', label: 'Shift Roster & Swaps', icon: CalendarRange },
        { id: 'time-tracking', label: 'Time Tracking & Log', icon: Hourglass },
        { id: 'wfh', label: 'WFH Requests', icon: Laptop },
        { id: 'biometric', label: 'Biometric Devices', icon: Cpu },
        { id: 'gps', label: 'GPS Geofence Clocking', icon: MapPin },
        { id: 'late-early', label: 'Late / Early Tracking', icon: Clock },
      ],
    },
    {
      groupName: 'LEAVE',
      items: [
        { id: 'leave-dashboard', label: 'Leave Dashboard', icon: LayoutDashboard },
        { id: 'leave-types', label: 'Leave Types', icon: SlidersHorizontal },
        { id: 'leave-policies', label: 'Leave Policies', icon: BookOpen },
        { id: 'leave-calendar', label: 'Leave Calendar', icon: Calendar },
        { id: 'leave-balance', label: 'Leave Balance', icon: Layers },
        { id: 'leave-requests', label: 'Leave Requests', icon: FileText },
        { id: 'leave-approval', label: 'Approval', icon: CheckCircle },
        { id: 'leave-holidays', label: 'Holiday Calendar', icon: CalendarDays },
        { id: 'leave-compoff', label: 'Compensatory Off', icon: Gift },
        { id: 'leave-encashment', label: 'Leave Encashment', icon: Coins },
        { id: 'leave-adjustments', label: 'Leave Adjustments', icon: History },
        { id: 'leave-accrual', label: 'Leave Accrual', icon: Timer },
        { id: 'leave-exceptions', label: 'Leave Exceptions', icon: ShieldAlert },
        { id: 'leave-reports', label: 'Leave Reports', icon: BarChart3 },
      ],
    },
    {
      groupName: 'PAYROLL',
      items: [
        { id: 'payroll-dashboard', label: 'Payroll Dashboard', icon: LayoutDashboard },
        { id: 'payroll-salary', label: 'Salary Management', icon: Building2 },
        { id: 'payroll-processing', label: 'Payroll Processing', icon: Play },
        { id: 'payroll-earnings', label: 'Earnings', icon: TrendingUp },
        { id: 'payroll-deductions', label: 'Deductions & LOP', icon: Minus },
        { id: 'payroll-statutory', label: 'Statutory Compliance', icon: ShieldCheck },
        { id: 'payroll-documents', label: 'Payslips & Tax Docs', icon: FileText },
        { id: 'payroll-fnf', label: 'Full & Final (F&F)', icon: UserMinus },
        { id: 'payroll-reports', label: 'Payroll Reports', icon: FileSpreadsheet },
        { id: 'payroll-settings', label: 'Payroll Settings', icon: Settings },
      ],
    },
    {
      groupName: 'WORKFORCE PLANNING',
      items: [
        { id: 'workforce-planning', label: 'Headcount & Capacity Planning', icon: LineChart },
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
        { id: 'helpdesk', label: 'HR Helpdesk Tickets', icon: HelpCircle },
        { id: 'other-communication', label: 'Communication Hub', icon: Megaphone },
        { id: 'requests', label: 'Employee Service Requests', icon: Send },
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
        // HR Head: workflow-level ops only — NOT user/role/system/billing management
        { id: 'workflows', label: 'Workflow Engine', icon: Workflow },
        { id: 'approvals', label: 'Unified Approval Hub', icon: CheckSquare, badge: 27 },
        { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
        { id: 'admin-audit', label: 'Audit Logs', icon: History },
        { id: 'admin-workflows', label: 'Workflow Builder', icon: Workflow },
        { id: 'admin-approvals', label: 'Approval Config', icon: CheckCircle },
        { id: 'admin-notifications', label: 'Notification Settings', icon: Bell },
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
      groupName: 'ATTENDANCE & TIME',
      items: [
        { id: 'attendance', label: 'Attendance Dashboard', icon: LayoutDashboard },
        { id: 'attendance-employees', label: 'Employee Attendance', icon: Users },
        { id: 'regularization', label: 'Regularization Desk', icon: FileText },
        { id: 'overtime', label: 'Overtime Engine', icon: TrendingUp },
        { id: 'shifts', label: 'Shift Roster & Swaps', icon: CalendarRange },
        { id: 'time-tracking', label: 'Time Tracking & Log', icon: Hourglass },
        { id: 'wfh', label: 'WFH Requests', icon: Laptop },
        { id: 'late-early', label: 'Late / Early Tracking', icon: Clock },
      ],
    },
    {
      groupName: 'LEAVE',
      items: [
        { id: 'leave-dashboard', label: 'Leave Dashboard', icon: LayoutDashboard },
        { id: 'leave-requests', label: 'Leave Requests', icon: FileText },
        { id: 'leave-approval', label: 'Approval', icon: CheckCircle },
        { id: 'leave-balance', label: 'Leave Balance', icon: Layers },
        { id: 'leave-calendar', label: 'Leave Calendar', icon: Calendar },
      ],
    },
    {
      groupName: 'APPROVALS',
      items: [
        { id: 'approvals', label: 'Unified Approval Hub', icon: CheckSquare, badge: 27 },
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

  // Select nav groups based on the user's primary role
  const navGroups = (() => {
    if (isPlatformAdmin)                          return platformGroups;
    if (primaryRole === 'Company Admin')          return standardGroups;
    if (primaryRole === 'HR Head / Super Admin')  return hrHeadGroups;
    if (primaryRole === 'Manager')                return managerGroups;
    if (primaryRole === 'Team Lead')              return teamLeadGroups;
    if (primaryRole === 'Employee')               return employeeGroups;
    return standardGroups; // fallback (HR Admin, etc.)
  })();


  const filteredNavGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => canViewModule(item.id)),
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
      <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#07563D] text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
              W
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm tracking-tight text-gray-900 leading-tight truncate">
                WorkForce<span className="text-[#07563D]">OS</span>
              </div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
                {isPlatformAdmin
                  ? 'Platform Control Plane'
                  : primaryRole.includes('HR Head')
                  ? 'HR Head Master Console'
                  : 'Enterprise HRMS'}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-[#07563D] text-white flex items-center justify-center font-black text-base mx-auto shadow-sm">
            W
          </div>
        )}

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer hidden md:block shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Group Items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
        {filteredNavGroups.map((group, idx) => {
          const isGroupCollapsed = collapsedGroups[group.groupName] ?? false;

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
                    const isActive = activeNav === item.id;

                    return (
                      <button
                        key={item.id}
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

