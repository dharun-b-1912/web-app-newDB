import { User, Employee } from '../../types';
import { DataScope, PrimaryRole, ModuleId, PermissionAction, RoleAccessProfile } from './types';
import { hrAuthorizationService } from '../../services/hrAuthorizationService';

export const ALL_MODULE_IDS: ModuleId[] = [
  'dashboard',
  'workforce-overview',
  'executive-overview',
  'my-workspace',
  'workspace',
  'my-profile',
  'profile',
  'people',
  'employees',
  'active-employees',
  'probation-employees',
  'employee-lifecycle',
  'organization',
  'departments',
  'designations',
  'locations',
  'vendors',
  'organization-vendors',
  'documents',
  'assets',
  'onboarding',
  'offboarding',
  // Attendance & Time - Core
  'attendance',
  'attendance-dashboard',
  'attendance-employees',
  'employee-attendance',
  'history',
  'attendance-history',
  'ledger',
  'regularization',
  'exceptions',
  'late-early',
  // Shift & Scheduling
  'shifts',
  'roster',
  'shift-calendar',
  'policies',
  // Clocking & Devices (Biometric Channel)
  'biometric',
  'biometric-devices',
  'device-enrollment',
  'device-sync',
  'punch-mapping',
  'device-logs',
  // Face Recognition Channel
  'face-attendance',
  'face-enrollment',
  'face-devices',
  'face-logs',
  'face-exceptions',
  // GPS & Mobile Channel
  'gps',
  'gps-attendance',
  'geofences',
  'staff-mapping',
  'mobile-clocking',
  'location-logs',
  'location-exceptions',
  // Work & Overtime
  'overtime',
  'overtime-requests',
  'wfh',
  'breaks-workhours',
  // Payroll Inputs
  'payroll-inputs',
  'payable-days',
  'lop-desk',
  'ot-pay-inputs',
  'payroll-freeze',
  // Audit & Control
  'calculation-audit',
  'attendance-corrections',
  'approval-history',
  'attendance-activity-logs',
  'calendar',
  'holidays',
  'manual',
  'time-tracking',
  'workforce-planning',
  // Leave
  'leave',
  'leave-dashboard',
  'leave-types',
  'leave-policies',
  'leave-calendar',
  'leave-balance',
  'leave-requests',
  'leave-approval',
  'leave-holidays',
  'leave-compoff',
  'leave-encashment',
  'leave-adjustments',
  'leave-accrual',
  'leave-exceptions',
  'leave-reports',
  // Payroll Master
  'payroll',
  'payroll-dashboard',
  'payroll-salary',
  'payroll-processing',
  'payroll-earnings',
  'payroll-deductions',
  'payroll-statutory',
  'payroll-documents',
  'payroll-fnf',
  'payroll-reports',
  'payroll-settings',
  // Recruitment
  'recruitment',
  'career-dev',
  // Performance
  'performance',
  'performance-dashboard',
  'performance-goals',
  'performance-okr',
  'performance-kpi',
  'performance-kra',
  'performance-cycles',
  'performance-reviews',
  'performance-ratings',
  'performance-development',
  'performance-promotion',
  'performance-pip',
  'performance-reports',
  // Learning & Development
  'lms',
  'lms-dashboard',
  'lms-courses',
  'lms-programs',
  'lms-calendar',
  'lms-enrollment',
  'lms-trainers',
  'lms-assessments',
  'lms-certifications',
  'lms-mandatory',
  'lms-skills',
  'lms-feedback',
  'lms-reports',
  'lms-settings',
  'compensation',
  'engagement',
  'grievances',
  'discipline',
  'posh',
  'compliance',
  'other-travel',
  'other-communication',
  'helpdesk',
  'communication',
  'requests',
  'analytics',
  'analytics-overview',
  'analytics-hr',
  'analytics-ceo',
  'analytics-finance',
  'analytics-recruitment',
  'analytics-attendance',
  'analytics-leave',
  'analytics-payroll',
  'analytics-performance',
  'analytics-training',
  'analytics-attrition',
  'analytics-workforce',
  'analytics-cost',
  'analytics-reports',
  'analytics-settings',
  'workforce-analytics',
  'recruitment-analytics',
  'attendance-analytics',
  'payroll-analytics',
  'performance-analytics',
  'reports',
  'workflows',
  'approvals',
  'notifications',
  'scheduled-jobs',
  'users',
  'rbac',
  'permissions',
  'templates',
  'integrations',
  'security',
  'audit-logs',
  'settings',
  // Admin sub-modules
  'admin-dashboard',
  'admin-users',
  'admin-roles',
  'admin-permissions',
  'admin-workflows',
  'admin-approvals',
  'admin-notifications',
  'admin-audit',
  'admin-security',
  'admin-api',
  'admin-integrations',
  'admin-subscription',
  'admin-billing',
  'admin-settings',
  'realtime-health',
  'admin-realtime-health',
  // ESS modules
  'ess-dashboard',
  'ess-attendance',
  'ess-leave',
  'ess-payroll',
  'ess-requests',
  'ess-performance',
  'ess-learning',
  'ess-documents',
  'ess-communication',
  'ess-profile',
  // TL modules
  'tl-dashboard',
  'tl-my-team',
  'tl-attendance',
  'tl-leave',
  'tl-approvals',
  'tl-tasks',
  'tl-performance',
  'tl-training',
  'tl-communication',
  'tl-reports',
  // Platform Admin / SaaS Owner modules
  'platform',
  'platform-dashboard',
  'platform-tenants',
  'platform-organizations',
  'platform-provisioning',
  'platform-tenant-health',
  'platform-users',
  'platform-staff',
  'platform-roles',
  'platform-subscriptions',
  'platform-plans',
  'platform-billing',
  'platform-usage',
  'platform-features',
  'platform-flags',
  'platform-marketplace',
  'platform-api',
  'platform-keys',
  'platform-webhooks',
  'platform-security',
  'platform-sessions',
  'platform-operations',
  'platform-jobs',
  'platform-incidents',
  'platform-support',
  'platform-audit',
  'platform-exports',
  'platform-announcements',
  'platform-settings',
  'saas-revenue',
  'saas-customers',
  'saas-subscriptions',
  'saas-churn',
  'saas-trials',
  'saas-renewals',
  'saas-coupons',
  'saas-partners',
];

// All HRMS module IDs — excludes platform-* and saas-* (SaaS owner only).
const HRMS_MODULE_IDS: ModuleId[] = ALL_MODULE_IDS.filter(
  id => !id.startsWith('platform') && !id.startsWith('saas-')
);

// HR Head module IDs — HRMS without system-level admin configuration or company vendor management.
// HR Head manages people operations but NOT user accounts, RBAC, vendor commercial master, or system settings.
const HR_HEAD_MODULE_IDS: ModuleId[] = HRMS_MODULE_IDS.filter(
  id => !['users', 'rbac', 'permissions', 'templates',
           'integrations', 'security', 'audit-logs', 'settings', 'scheduled-jobs',
           'vendors', 'organization-vendors'].includes(id)
);

// Manager module IDs — department-scoped operational modules only.
const MANAGER_MODULE_IDS: ModuleId[] = [
  'dashboard', 'my-workspace',
  // Attendance (department)
  'attendance', 'attendance-dashboard', 'attendance-employees', 'employee-attendance', 'employees', 'history', 'attendance-history', 'ledger', 'regularization', 'exceptions', 'late-early',
  'shifts', 'roster', 'shift-calendar', 'policies',
  'biometric', 'biometric-devices', 'device-enrollment', 'device-sync', 'punch-mapping', 'device-logs',
  'face-attendance', 'face-enrollment', 'face-devices', 'face-logs', 'face-exceptions',
  'gps', 'gps-attendance', 'geofences', 'staff-mapping', 'mobile-clocking', 'location-logs', 'location-exceptions',
  'overtime', 'overtime-requests', 'wfh', 'breaks-workhours',
  'payroll-inputs', 'payable-days', 'lop-desk', 'ot-pay-inputs', 'payroll-freeze',
  'calculation-audit', 'attendance-corrections', 'approval-history', 'attendance-activity-logs',
  'time-tracking',
  // Leave (department)
  'leave', 'leave-dashboard', 'leave-requests', 'leave-approval', 'leave-balance', 'leave-calendar',
  // Approvals
  'approvals', 'notifications',
  // Performance (department)
  'performance', 'performance-dashboard', 'performance-goals', 'performance-reviews',
  'performance-ratings', 'performance-development',
  // Learning (department)
  'lms', 'lms-dashboard', 'lms-enrollment',
  // Communication
  'helpdesk', 'other-communication', 'requests',
  // Analytics (department-scoped)
  'analytics', 'analytics-overview', 'analytics-attendance', 'analytics-leave', 'analytics-performance',
  // ESS (own personal data)
  'ess-dashboard', 'ess-attendance', 'ess-leave', 'ess-payroll',
  'ess-requests', 'ess-performance', 'ess-learning', 'ess-documents',
  'ess-communication', 'ess-profile',
] as ModuleId[];

// Team Lead module IDs — team section + personal ESS only.
const TEAM_LEAD_MODULE_IDS: ModuleId[] = [
  'my-workspace',
  // TL-specific team modules
  'tl-dashboard', 'tl-my-team', 'tl-attendance', 'tl-leave',
  'tl-approvals', 'tl-tasks', 'tl-performance', 'tl-training',
  'tl-communication', 'tl-reports',
  // ESS (own personal data)
  'ess-dashboard', 'ess-attendance', 'ess-leave', 'ess-payroll',
  'ess-requests', 'ess-performance', 'ess-learning', 'ess-documents',
  'ess-communication', 'ess-profile',
] as ModuleId[];

// Employee module IDs — self-service (ESS) only.
const EMPLOYEE_MODULE_IDS: ModuleId[] = [
  'my-workspace',
  'ess-dashboard', 'ess-attendance', 'ess-leave', 'ess-payroll',
  'ess-requests', 'ess-performance', 'ess-learning', 'ess-documents',
  'ess-communication', 'ess-profile',
] as ModuleId[];

// Role profiles mapping modules and scopes according to HRMS specifications
export const ROLE_PROFILES: Record<string, RoleAccessProfile> = {
  // ─── PLATFORM / SaaS OWNER ───────────────────────────────────────────────
  'Super Admin': {
    roleName: 'Super Admin',
    hierarchyLevel: 0, // SaaS owner — unrestricted platform + tenant access
    allowedModules: ALL_MODULE_IDS,
    defaultScope: 'COMPANY',
    moduleScopes: {},
  },
  // ─── TENANT / COMPANY ADMINS ─────────────────────────────────────────────
  'Company Admin': {
    roleName: 'Company Admin',
    hierarchyLevel: 1, // Tenant admin — full HRMS, NO platform / SaaS access
    allowedModules: HRMS_MODULE_IDS,
    defaultScope: 'COMPANY',
    moduleScopes: {},
  },
  'HR Head': {
    roleName: 'HR Head',
    hierarchyLevel: 2, // HR operations — full HRMS within authorized legal entity
    allowedModules: HR_HEAD_MODULE_IDS,
    defaultScope: 'COMPANY',
    moduleScopes: {},
  },
  'HR Admin': {
    roleName: 'HR Admin',
    hierarchyLevel: 2,
    allowedModules: [
      'dashboard',
      'my-workspace',
      'people',
      'employees',
      'active-employees',
      'probation-employees',
      'organization',
      'departments',
      'designations',
      'locations',
      'recruitment',
      'onboarding',
      'offboarding',
      'attendance',
      'attendance-dashboard',
      'attendance-employees',
      'employee-attendance',
      'shifts',
      'roster',
      'policies',
      'exceptions',
      'calculation-audit',
      'regularization',
      'overtime',
      'biometric',
      'gps',
      'late-early',
      'leave',
      'documents',
      'assets',
      'helpdesk',
      'requests',
    ],
    defaultScope: 'HR',
    moduleScopes: {},
  },
  'Manager': {
    roleName: 'Manager',
    hierarchyLevel: 3, // Department scope — operations but no payroll/admin
    allowedModules: MANAGER_MODULE_IDS,
    defaultScope: 'MANAGER',
    moduleScopes: {
      people: 'MANAGER',
      attendance: 'MANAGER',
      leave: 'MANAGER',
      performance: 'MANAGER',
    },
  },
  'Team Lead': {
    roleName: 'Team Lead',
    hierarchyLevel: 4, // Team scope — TL section + own ESS
    allowedModules: TEAM_LEAD_MODULE_IDS,
    defaultScope: 'TEAM',
    moduleScopes: {
      people: 'TEAM',
      attendance: 'TEAM',
      leave: 'TEAM',
    },
  },
  'Employee': {
    roleName: 'Employee',
    hierarchyLevel: 5, // Self scope — ESS only
    allowedModules: EMPLOYEE_MODULE_IDS,
    defaultScope: 'SELF',
    moduleScopes: {
      payroll: 'SELF',
      attendance: 'SELF',
      leave: 'SELF',
      documents: 'SELF',
    },
  },
};

/**
 * Returns the primary role name for a user.
 */
export function getPrimaryRole(user: User | null): PrimaryRole {
  if (!user || !user.roles || user.roles.length === 0) return 'Employee';

  const roleNames = user.roles.map(r => r.name);
  if (roleNames.some(n => n === 'Super Admin')) return 'Super Admin';
  if (roleNames.some(n => n === 'Company Admin')) return 'Company Admin';
  if (roleNames.some(n => n === 'HR Head' || n === 'HR_HEAD_SUPER_ADMIN' || n.includes('HR Head')))
    return 'HR Head';
  if (roleNames.some(n => n === 'HR Admin')) return 'HR Admin';
  if (roleNames.some(n => n === 'Manager')) return 'Manager';
  if (roleNames.some(n => n === 'Team Lead')) return 'Team Lead';

  return 'Employee';
}

/**
 * Gets the role profile for a user.
 */
export function getRoleProfile(user: User | null): RoleAccessProfile {
  const primaryRole = getPrimaryRole(user);
  return ROLE_PROFILES[primaryRole] || ROLE_PROFILES['Employee'];
}

/**
 * Checks if user can view a given module.
 *
 * Access rules:
 *  level 0 — Super Admin       : unrestricted (all platform-* saas-* HRMS)
 *  level 1 — Company Admin     : full HRMS + admin-* config; NO platform/saas
 *  level 2 — HR Head           : full HRMS operations; limited admin-* (audit/workflow only)
 *  level 3 — Manager           : department-scoped HRMS ops; no payroll/admin/platform
 *  level 4 — Team Lead         : tl-* team routes + ess-* (own data); no dept-wide HRMS
 *  level 5 — Employee          : ess-* self-service only; no team/dept/admin/platform
 */
export function canViewModule(user: User | null, module: ModuleId | string): boolean {
  if (!user) return false;
  const profile = getRoleProfile(user);
  const roleName = getPrimaryRole(user);

  // ── Platform / SaaS control-plane: Super Admin (level 0) ONLY ──────────────
  if (module.startsWith('platform') || module.startsWith('saas-')) {
    return profile.hierarchyLevel === 0;
  }

  // Super Admin: unrestricted access to everything.
  if (profile.hierarchyLevel === 0) return true;

  // ── admin-* routes: Company Admin full access; HR Head limited ──────────────
  if (module.startsWith('admin-')) {
    if (profile.hierarchyLevel === 1) return true; // Company Admin — full admin
    if (profile.hierarchyLevel === 2) {
      // HR Head: role management + notification settings + audit
      const HR_ADMIN_ALLOWED = ['admin-roles', 'admin-notifications', 'admin-audit', 'admin-workflows', 'admin-approvals'];
      return HR_ADMIN_ALLOWED.includes(module);
    }
    return false; // Manager, Team Lead, Employee: no admin routes
  }

  // ── Universal self-service routes: all authenticated users (personal profile & workspace) ─
  const UNIVERSAL_SELF_SERVICE = ['my-profile', 'profile', 'workspace', 'my-workspace', 'helpdesk', 'notifications'];
  if (module.startsWith('ess-') || UNIVERSAL_SELF_SERVICE.includes(module)) return true;

  // ── Dynamic Employee HR Module Authorization Override by Work Email ──────────
  if (user.email && hrAuthorizationService.canEmployeeAccessModule(user.email, module)) {
    return true;
  }

  // ── tl-* routes: Team Lead (own section) + HR Head & Company Admin (oversight) ─
  if (module.startsWith('tl-')) {
    return roleName === 'Team Lead' || profile.hierarchyLevel <= 2;
  }

  // ── All other roles/modules: check explicit allowedModules list ──────────────
  if (profile.allowedModules.includes(module as ModuleId)) return true;

  // Sub-module prefix matching (e.g. payroll-processing inherits from payroll)
  if (module.startsWith('payroll') && profile.allowedModules.includes('payroll')) return true;
  if (module.startsWith('leave') && profile.allowedModules.includes('leave')) return true;
  if (module.startsWith('performance') && profile.allowedModules.includes('performance')) return true;
  if (module.startsWith('lms') && profile.allowedModules.includes('lms')) return true;
  if (module.startsWith('recruitment') && profile.allowedModules.includes('recruitment')) return true;
  if (module.startsWith('analytics') && (profile.allowedModules.includes('analytics') || profile.allowedModules.includes('reports'))) return true;
  if (module.startsWith('other-') && (profile.allowedModules.includes('compliance') || profile.allowedModules.includes('helpdesk'))) return true;

  return false;
}

/**
 * Gets data access scope for user on a specific module.
 */
export function getDataScope(user: User | null, module: ModuleId | string): DataScope {
  if (!user) return 'SELF';
  const profile = getRoleProfile(user);
  return profile.moduleScopes[module] || profile.defaultScope;
}

/**
 * Checks action permissions (view, create, edit, delete, approve, export, manage, configure).
 *
 * Each role has explicit action-level gates in addition to module visibility.
 */
export function hasPermission(
  user: User | null,
  module: ModuleId | string,
  action: PermissionAction = 'view'
): boolean {
  if (!user) return false;
  const roleName = getPrimaryRole(user);

  // ── Universal self-service routes (Profile, Workspace) ──────────────────────
  if (module === 'my-profile' || module === 'profile' || module === 'workspace' || module === 'my-workspace') {
    return true;
  }

  // ── Super Admin: unrestricted ─────────────────────────────────────────────
  if (roleName === 'Super Admin') return true;

  // ── Company Admin: full HRMS, blocked from platform/saas by canViewModule ──
  if (roleName === 'Company Admin') return canViewModule(user, module);

  // ── HR Head: HRMS operations, no delete/configure on system admin modules ──
  if (roleName === 'HR Head') {
    if (!canViewModule(user, module)) return false;
    if (action === 'configure' && module.startsWith('admin-')) return false;
    return true;
  }

  // ── Manager: department scope, no delete/manage/configure ────────────────
  if (roleName === 'Manager') {
    if (!canViewModule(user, module)) return false;
    if (action === 'delete' || action === 'manage' || action === 'configure') return false;
    if (action === 'approve') {
      const MANAGER_APPROVABLE = ['leave', 'leave-approval', 'attendance', 'regularization',
        'overtime', 'wfh', 'approvals', 'requests', 'ess-leave', 'ess-attendance'];
      return MANAGER_APPROVABLE.includes(module);
    }
    if (action === 'export') {
      const MANAGER_EXPORTABLE = ['attendance', 'leave', 'performance',
        'analytics-attendance', 'analytics-leave', 'analytics-performance'];
      return MANAGER_EXPORTABLE.includes(module);
    }
    return true;
  }

  // ── Team Lead: team scope, no delete/export/manage/configure ─────────────
  if (roleName === 'Team Lead') {
    if (!canViewModule(user, module)) return false;
    if (action === 'delete' || action === 'export' || action === 'manage' || action === 'configure') return false;
    if (action === 'approve') {
      const TL_APPROVABLE = ['tl-leave', 'tl-attendance', 'tl-approvals',
        'leave', 'attendance', 'approvals', 'ess-leave', 'ess-attendance'];
      return TL_APPROVABLE.includes(module);
    }
    return true;
  }

  // ── Employee: ESS self-service only ──────────────────────────────────────
  if (roleName === 'Employee') {
    if (!canViewModule(user, module)) return false;
    const ESS_MODULES = ['my-workspace', 'ess-dashboard', 'ess-attendance', 'ess-leave',
      'ess-payroll', 'ess-requests', 'ess-performance', 'ess-learning',
      'ess-documents', 'ess-communication', 'ess-profile'];
    if (action === 'view') return ESS_MODULES.includes(module);
    if (action === 'create') {
      return ['ess-requests', 'ess-leave', 'ess-attendance', 'ess-communication',
        'helpdesk', 'requests'].includes(module);
    }
    return false;
  }

  return canViewModule(user, module);
}

/**
 * Checks if user can access a target employee record based on data scope.
 */
export function canAccessEmployee(user: User | null, targetEmployee: Employee): boolean {
  if (!user) return false;
  const roleName = getPrimaryRole(user);

  if (
    roleName === 'Super Admin' ||
    roleName === 'Company Admin' ||
    roleName === 'HR Head'
  ) {
    return true;
  }

  // If user is linked to target employee record directly
  if (user.employee_id && user.employee_id === targetEmployee.id) {
    return true;
  }

  if (roleName === 'Manager') {
    return (
      targetEmployee.employment?.reporting_manager_id === user.employee_id ||
      targetEmployee.user_id === user.id
    );
  }

  if (roleName === 'Team Lead') {
    return targetEmployee.employment?.reporting_manager_id === user.employee_id;
  }

  return false;
}

/**
 * Filters list of employees based on user's active scope.
 */
export function filterAccessibleEmployees(user: User | null, employees: Employee[]): Employee[] {
  if (!user) return employees;
  const roleName = getPrimaryRole(user);

  // Super Admin, Company Admin, HR Head, HR Admin always see full workforce directory
  if (
    roleName === 'Super Admin' ||
    roleName === 'Company Admin' ||
    roleName === 'HR Head' ||
    roleName === 'HR Admin' ||
    (user.roles && user.roles.some(r => {
      const n = (r.name || '').toLowerCase();
      return n.includes('admin') || n.includes('hr') || n.includes('head');
    }))
  ) {
    return employees;
  }

  const scope = getDataScope(user, 'people');
  if (scope === 'COMPANY' || scope === 'HR') {
    return employees;
  }

  if (scope === 'MANAGER' || scope === 'TEAM') {
    const accessible = employees.filter(e => canAccessEmployee(user, e));
    return accessible.length > 0 ? accessible : employees;
  }

  // SELF
  const selfList = employees.filter(e => e.user_id === user.id || e.id === user.employee_id);
  return selfList.length > 0 ? selfList : employees;
}
