// src/utils/environment.ts
// ============================================================
// Joy PeopleHR — Adaptive Runtime Environment & Host Resolver
// ============================================================

export interface AppEnvironmentInfo {
  isLocalDev: boolean;
  isStaging: boolean;
  isProduction: boolean;
  envBadgeLabel: 'LOCAL DEV' | 'STAGING' | 'PRODUCTION';
  serverRegionLabel: string;
  serverTooltip: string;
  envBadgeClass: string;
  dotColorClass: string;
  hostname: string;
  port: string;
}

/**
 * Accurately detects runtime environment based on active hostname, Vite dev flags,
 * and current server port to prevent misleading production badges on localhost.
 */
export function getAppEnvironment(): AppEnvironmentInfo {
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname.toLowerCase() : 'localhost';
  const port = isBrowser && window.location.port ? window.location.port : '';

  // Local development indicators
  const isLocalDev = Boolean(
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.test')
  );

  // Staging / preview indicators
  const isStaging = !isLocalDev && (
    hostname.includes('staging') ||
    hostname.includes('preview') ||
    hostname.includes('dev.') ||
    hostname.includes('test.') ||
    hostname.includes('vercel.app')
  );

  const isProduction = !isLocalDev && !isStaging;

  if (isLocalDev) {
    const portLabel = port ? `:${port}` : ':3000';
    return {
      isLocalDev: true,
      isStaging: false,
      isProduction: false,
      envBadgeLabel: 'LOCAL DEV',
      serverRegionLabel: `Localhost ${portLabel} · ap-south-1 DB`,
      serverTooltip: `Local Dev Server (Node.js & Vite HMR on ${hostname}${portLabel}) • Connected to Supabase Cloud DB (ap-south-1 Mumbai)`,
      envBadgeClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
      dotColorClass: 'bg-amber-500',
      hostname,
      port,
    };
  }

  if (isStaging) {
    return {
      isLocalDev: false,
      isStaging: true,
      isProduction: false,
      envBadgeLabel: 'STAGING',
      serverRegionLabel: 'Staging Server · ap-south-1',
      serverTooltip: `Staging Deployment (${hostname}) • High Availability Validation Cluster`,
      envBadgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100',
      dotColorClass: 'bg-indigo-500',
      hostname,
      port,
    };
  }

  return {
    isLocalDev: false,
    isStaging: false,
    isProduction: true,
    envBadgeLabel: 'PRODUCTION',
    serverRegionLabel: 'India (ap-south-1)',
    serverTooltip: `AWS Mumbai Edge (ap-south-1) • Production Host (${hostname})`,
    envBadgeClass: 'bg-emerald-50 text-[#07563D] border-emerald-300 hover:bg-emerald-100',
    dotColorClass: 'bg-emerald-500',
    hostname,
    port,
  };
}
