// src/lib/router/urlRouter.ts
// ============================================================
// Joy PeopleHR — URL-First Clean REST Slug Routing Engine
// Maps internal route keys to human-readable URL slugs (/people, /payroll, /superadmin, etc.)
// ============================================================

export interface RouteState {
  route: string;
  params: Record<string, string>;
  pathname: string;
  search: string;
}

export const ROUTE_ALIASES: Record<string, string> = {
  // Super Admin & Platform Access
  '/superadmin': 'superadmin-login',
  '/super-admin': 'superadmin-login',
  '/platform-login': 'superadmin-login',
  '/admin/login': 'superadmin-login',
  '/login': 'dashboard',
  '/auth/accept-invite': 'dashboard',
  '/auth/activate': 'dashboard',
  '/accept-invite': 'dashboard',
  '/activate': 'dashboard',
  '/invitation': 'dashboard',

  // Core HRMS Slugs
  '/dashboard': 'dashboard',
  '/workforce-overview': 'workforce-overview',
  '/executive-overview': 'executive-overview',
  '/people': 'people',
  '/employees': 'people',
  '/organization': 'organization',
  '/departments': 'departments',
  '/designations': 'designations',
  '/locations': 'locations',
  '/vendors': 'vendors',
  '/organization/vendors': 'vendors',
  '/rbac': 'rbac',
  '/admin': 'admin',
  '/administration': 'admin',
  '/roles': 'admin',
  '/workspace': 'my-workspace',
  '/my-workspace': 'my-workspace',
  '/profile': 'my-profile',
  '/my-profile': 'my-profile',
  '/attendance': 'attendance',
  '/leave': 'leave',
  '/payroll': 'payroll',
  '/performance': 'performance',
  '/lms': 'lms',
  '/learning': 'lms',
  '/compliance': 'compliance',
  '/recruitment': 'recruitment',
  '/onboarding': 'onboarding',
  '/offboarding': 'offboarding',
  '/documents': 'documents',
  '/assets': 'assets',
  '/analytics': 'analytics',
  '/automation': 'automation',

  // Team Lead & ESS Slugs
  '/tl': 'tl-dashboard',
  '/tl/dashboard': 'tl-dashboard',
  '/ess': 'ess-dashboard',
  '/ess/dashboard': 'ess-dashboard',
  '/ess/profile': 'ess-profile',
  '/ess/attendance': 'ess-attendance',
  '/ess/leave': 'ess-leave',
  '/ess/payroll': 'ess-payroll',
  '/ess/documents': 'ess-documents',

  // Platform Control Plane Slugs
  '/platform': 'platform-dashboard',
  '/platform/dashboard': 'platform-dashboard',
  '/platform/organizations': 'platform-tenants',
  '/platform/tenants': 'platform-tenants',
  '/platform/provisioning': 'platform-tenants',
  '/platform/health': 'platform-tenant-health',
  '/platform/tenant-health': 'platform-tenant-health',
  '/platform/revenue': 'saas-revenue',
  '/platform/subscriptions': 'platform-subscriptions',
  '/platform/plans': 'platform-plans',
  '/platform/billing': 'platform-billing',
  '/platform/invoices': 'platform-billing',
  '/platform/usage': 'platform-usage',
  '/platform/metering': 'platform-usage',
  '/platform/features': 'platform-features',
  '/platform/flags': 'platform-features',
  '/platform/security': 'platform-security',
  '/platform/sessions': 'platform-sessions',
  '/platform/audit': 'platform-audit',
  '/platform/support': 'platform-support',
  '/platform/jobs': 'platform-jobs',
  '/platform/incidents': 'platform-incidents',
  '/platform/operations': 'platform-incidents',
  '/platform/webhooks': 'platform-webhooks',
  '/platform/api': 'platform-api',
  '/platform/settings': 'platform-settings',
  '/platform/staff': 'platform-staff',
  '/platform/staff/directory': 'platform-staff',
  '/platform/staff/roles': 'platform-staff',
  '/platform/staff/permissions': 'platform-staff',
  '/platform/staff/activity': 'platform-staff',
  '/platform/iam': 'platform-staff',
  '/platform/notifications': 'platform-notifications',
  '/platform/dlq': 'platform-notifications',
  '/platform/events': 'platform-notifications',
  '/platform/account': 'platform-account',
  '/platform/account/overview': 'platform-account',
  '/platform/account/profile': 'platform-account',
  '/platform/account/security': 'platform-account',
  '/platform/account/sessions': 'platform-account',
  '/platform/account/access': 'platform-account',
  '/platform/account/preferences': 'platform-account',
  '/platform/account/activity': 'platform-account',
  '/platform/profile': 'platform-account',

  // Vendor Operations & Contractor Intelligence Slugs
  '/vendor': 'vendor-settlement-workspace',
  '/vendor/login': 'vendor-login',
  '/vendor-login': 'vendor-login',
  '/vendor/settlement': 'vendor-settlement-workspace',
  '/vendor/settlement-workspace': 'vendor-settlement-workspace',
  '/vendor/dashboard': 'vendor-dashboard',
  '/vendor/licenses': 'vendor-licenses',
  '/vendor/calendar': 'vendor-compliance-calendar',
  '/vendor/compliance-calendar': 'vendor-compliance-calendar',
  '/vendor/returns': 'vendor-statutory-returns',
  '/vendor/form-v': 'vendor-statutory-returns',
  '/vendor/statutory-returns': 'vendor-statutory-returns',
  '/vendor/workforce': 'vendor-employees',
  '/vendor/employees': 'vendor-employees',
  '/vendor/assignments': 'vendor-assignments',
  '/vendor/attendance': 'vendor-attendance',
  '/vendor/wages': 'vendor-wages',
  '/vendor/wage-breakdown': 'vendor-wages',
  '/vendor/payroll': 'vendor-payroll',
  '/vendor/payroll-verification': 'vendor-payroll',
  '/vendor/payable': 'vendor-payable',
  '/vendor/po': 'vendor-po',
  '/vendor/purchase-orders': 'vendor-po',
  '/vendor/invoices': 'vendor-invoices',
  '/vendor/compliance': 'vendor-compliance',
  '/vendor/payslips': 'vendor-payslips',
  '/vendor/payments': 'vendor-payments',
  '/vendor/audit': 'vendor-audit-reports',
  '/vendor/audit-reports': 'vendor-audit-reports',
};

// Canonical URL Path corresponding to each internal route ID
export const ROUTE_TO_PATH: Record<string, string> = {
  'superadmin-login': '/superadmin',
  'dashboard': '/dashboard',
  'workforce-overview': '/workforce-overview',
  'executive-overview': '/executive-overview',
  'people': '/people',
  'organization': '/organization',
  'departments': '/departments',
  'designations': '/designations',
  'locations': '/locations',
  'vendors': '/vendors',
  'organization-vendors': '/vendors',
  'rbac': '/rbac',
  'admin': '/admin',
  'my-workspace': '/workspace',
  'workspace': '/workspace',
  'my-profile': '/profile',
  'profile': '/profile',
  'attendance': '/attendance',
  'leave': '/leave',
  'payroll': '/payroll',
  'performance': '/performance',
  'lms': '/lms',
  'recruitment': '/recruitment',
  'compliance': '/compliance',
  'documents': '/documents',
  'onboarding': '/onboarding',
  'offboarding': '/offboarding',
  'assets': '/assets',
  'analytics': '/analytics',
  'automation': '/automation',
  'tl-dashboard': '/tl/dashboard',
  'ess-dashboard': '/ess/dashboard',
  'ess-profile': '/ess/profile',
  'ess-attendance': '/ess/attendance',
  'ess-leave': '/ess/leave',
  'ess-payroll': '/ess/payroll',
  'ess-documents': '/ess/documents',
  'platform-dashboard': '/platform/dashboard',
  'platform-tenants': '/platform/tenants',
  'platform-tenant-health': '/platform/health',
  'saas-revenue': '/platform/revenue',
  'platform-subscriptions': '/platform/subscriptions',
  'platform-plans': '/platform/plans',
  'platform-billing': '/platform/billing',
  'platform-usage': '/platform/usage',
  'platform-features': '/platform/features',
  'platform-security': '/platform/security',
  'platform-sessions': '/platform/sessions',
  'platform-audit': '/platform/audit',
  'platform-support': '/platform/support',
  'platform-jobs': '/platform/jobs',
  'platform-incidents': '/platform/incidents',
  'platform-webhooks': '/platform/webhooks',
  'platform-api': '/platform/api',
  'platform-settings': '/platform/settings',
  'platform-staff': '/platform/staff',
  'platform-notifications': '/platform/notifications',
  'platform-account': '/platform/account',

  // Vendor Operations Canonical Paths
  'vendor-login': '/vendor/login',
  'vendor-settlement-workspace': '/vendor/settlement',
  'vendor-dashboard': '/vendor/dashboard',
  'vendor-licenses': '/vendor/licenses',
  'vendor-compliance-calendar': '/vendor/calendar',
  'vendor-statutory-returns': '/vendor/returns',
  'vendor-employees': '/vendor/workforce',
  'vendor-assignments': '/vendor/assignments',
  'vendor-attendance': '/vendor/attendance',
  'vendor-wages': '/vendor/wages',
  'vendor-payroll': '/vendor/payroll',
  'vendor-payable': '/vendor/payable',
  'vendor-po': '/vendor/po',
  'vendor-invoices': '/vendor/invoices',
  'vendor-compliance': '/vendor/compliance',
  'vendor-payslips': '/vendor/payslips',
  'vendor-payments': '/vendor/payments',
  'vendor-audit-reports': '/vendor/audit',
};

export function parseRouteFromUrl(): RouteState {
  if (typeof window === 'undefined') {
    return { route: '', params: {}, pathname: '/', search: '' };
  }

  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const search = window.location.search;
  const searchParams = new URLSearchParams(search);
  const params: Record<string, string> = {};

  searchParams.forEach((val, key) => {
    if (key !== 'tab' && key !== 'route') {
      params[key] = val;
    }
  });

  // 1. Direct path-based route match (e.g., /superadmin, /people, /payroll, /platform/dashboard)
  if (pathname !== '/' && pathname !== '' && ROUTE_ALIASES[pathname]) {
    return {
      route: ROUTE_ALIASES[pathname],
      params,
      pathname,
      search,
    };
  }

  // 2. Check explicit query param ?tab= or ?route= (for backward compatibility)
  const explicitRoute = searchParams.get('tab') || searchParams.get('route');
  if (explicitRoute) {
    return {
      route: explicitRoute,
      params,
      pathname,
      search,
    };
  }

  // 3. Fallback: check if pathname directly matches a route key (e.g. /platform-dashboard)
  const cleanPath = pathname.replace(/^\//, '');
  if (cleanPath) {
    return {
      route: cleanPath,
      params,
      pathname,
      search,
    };
  }

  return {
    route: '',
    params,
    pathname,
    search,
  };
}

export function syncUrlWithRoute(route: string, params?: Record<string, string>, replace: boolean = false) {
  if (typeof window === 'undefined' || !route) return;

  const targetPath = ROUTE_TO_PATH[route] || `/${route}`;
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

  // Build query string only for additional functional parameters (filters, pagination, modal IDs)
  const urlParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (key !== 'tab' && key !== 'route' && val !== undefined && val !== null && val !== '') {
        urlParams.set(key, val);
      }
    });
  }

  const newSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
  const newUrl = `${targetPath}${newSearch}`;
  const currentFullUrl = `${window.location.pathname}${window.location.search}`;

  if (newUrl === currentFullUrl) {
    return;
  }

  if (replace) {
    window.history.replaceState({ route, params }, '', newUrl);
  } else {
    window.history.pushState({ route, params }, '', newUrl);
  }
}
