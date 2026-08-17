// src/lib/router/urlRouter.ts
// ============================================================
// WorkForceOS — URL-First Routing Engine & History Synchronizer
// ============================================================

export interface RouteState {
  route: string;
  params: Record<string, string>;
  pathname: string;
  search: string;
}

const ROUTE_ALIASES: Record<string, string> = {
  '': 'platform-dashboard',
  '/': 'platform-dashboard',
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
  '/platform/account': 'platform-account',
  '/platform/account/profile': 'platform-account',
  '/platform/account/security': 'platform-account',
  '/platform/account/sessions': 'platform-account',
  '/platform/account/access': 'platform-account',
  '/platform/account/preferences': 'platform-account',
  '/platform/profile': 'platform-account',
};

export function parseRouteFromUrl(): RouteState {
  if (typeof window === 'undefined') {
    return { route: 'platform-dashboard', params: {}, pathname: '/', search: '' };
  }

  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const search = window.location.search;
  const searchParams = new URLSearchParams(search);
  const params: Record<string, string> = {};

  searchParams.forEach((val, key) => {
    params[key] = val;
  });

  // Check explicit query param ?tab= or ?route=
  const explicitRoute = searchParams.get('tab') || searchParams.get('route');
  if (explicitRoute) {
    return {
      route: explicitRoute,
      params,
      pathname,
      search,
    };
  }

  // Check path-based route match
  if (ROUTE_ALIASES[pathname]) {
    return {
      route: ROUTE_ALIASES[pathname],
      params,
      pathname,
      search,
    };
  }

  // Fallback: check if pathname directly matches a known route key
  const cleanPath = pathname.replace(/^\//, '');
  if (cleanPath.startsWith('platform') || cleanPath.startsWith('saas-')) {
    return {
      route: cleanPath,
      params,
      pathname,
      search,
    };
  }

  return {
    route: cleanPath || 'platform-dashboard',
    params,
    pathname,
    search,
  };
}

export function syncUrlWithRoute(route: string, params?: Record<string, string>, replace: boolean = false) {
  if (typeof window === 'undefined') return;

  const current = parseRouteFromUrl();
  if (current.route === route && JSON.stringify(current.params) === JSON.stringify(params || {})) {
    return;
  }

  const urlParams = new URLSearchParams();
  urlParams.set('tab', route);

  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        urlParams.set(key, val);
      }
    });
  }

  const newSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
  const newUrl = `${window.location.pathname}${newSearch}`;

  if (replace) {
    window.history.replaceState({ route, params }, '', newUrl);
  } else {
    window.history.pushState({ route, params }, '', newUrl);
  }
}
