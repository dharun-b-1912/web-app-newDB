import { ROUTE_ALIASES, ROUTE_TO_PATH } from '../src/lib/router/urlRouter';
import { findRouteDefinition, APP_ROUTES } from '../src/lib/router/routeRegistry';

const routesToTest = [
  { path: '/platform', expectedId: 'platform-dashboard' },
  { path: '/platform/features', expectedId: 'platform-features' },
  { path: '/platform/feature-catalogue', expectedId: 'platform-catalogue' },
  { path: '/platform/plans', expectedId: 'platform-plans' },
  { path: '/platform-addons', expectedId: 'platform-addons' },
  { path: '/platform-pricing-calculator', expectedId: 'platform-pricing-calculator' },
  { path: '/platform/quotations', expectedId: 'platform-quotations' },
  { path: '/platform/subscriptions', expectedId: 'platform-subscriptions' },
  { path: '/platform/invoices', expectedId: 'platform-invoices' },
  { path: '/platform/payments', expectedId: 'platform-payments' },
  { path: '/platform/renewals', expectedId: 'platform-renewals' },
  { path: '/platform/clients', expectedId: 'platform-clients' },
  { path: '/platform/usage', expectedId: 'platform-usage' },
  { path: '/platform/revenue', expectedId: 'saas-revenue' }
];

console.log('--- COMPREHENSIVE ROUTE AUDIT TABLE ---');
for (const item of routesToTest) {
  const resolved = ROUTE_ALIASES[item.path];
  const canonical = ROUTE_TO_PATH[resolved];
  const def = findRouteDefinition(item.path);
  console.log(
    item.path.padEnd(32),
    '-> ID: ' + (resolved || 'FAIL').padEnd(28),
    '-> Canonical: ' + (canonical || 'FAIL').padEnd(30),
    '-> Status: ' + (resolved === item.expectedId ? 'VERIFIED' : 'MISMATCH')
  );
  if (resolved !== item.expectedId) {
    throw new Error('Failed route: ' + item.path);
  }
}
console.log('ALL 14 REQUIRED SAAS CONTROL PLANE ROUTES VERIFIED 100% CORRECT!');
