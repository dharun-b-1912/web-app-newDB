// src/lib/router/urlRouter.ts
// ============================================================
// Joy PeopleHR — URL-First Clean REST Slug Routing Engine
// Maps internal route keys to human-readable URL slugs (/people, /payroll, /superadmin, etc.)
// Synchronizes browser URL, back/forward popstate, and active route state.
// ============================================================

import {
  findRouteDefinition,
  resolveRouteId as registryResolveRouteId,
  canonicalizeRoute as registryCanonicalizeRoute,
  normalizePath,
} from './routeRegistry';

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
  '/platform/login': 'superadmin-login',
  '/admin/login': 'login',
  '/company-admin/login': 'login',
  '/login': 'login',
  '/auth/accept-invite': 'accept-invite',
  '/auth/activate': 'accept-invite',
  '/accept-invite': 'accept-invite',
  '/activate': 'accept-invite',
  '/auth/reset-password': 'reset-password',
  '/reset-password': 'reset-password',
  '/invitation': 'accept-invite',

  // Core HRMS Slugs — Dashboard
  '/dashboard': 'dashboard',
  '/workforce-overview': 'workforce-overview',
  '/executive-overview': 'executive-overview',
  '/workspace': 'my-workspace',
  '/my-workspace': 'my-workspace',
  '/profile': 'my-profile',
  '/my-profile': 'my-profile',

  // Core HRMS Slugs — People & Core HR
  '/people': 'people',
  '/employees': 'people',
  '/organization': 'organization',
  '/departments': 'departments',
  '/designations': 'designations',
  '/locations': 'locations',
  '/documents': 'documents',
  '/assets': 'assets',
  '/onboarding': 'onboarding',
  '/offboarding': 'offboarding',

  // Company HR Vendor Governance Slugs
  '/vendors': 'vendors',
  '/vendor-hub': 'vendors',
  '/vendors/directory': 'vendor-directory',
  '/vendor-directory': 'vendor-directory',
  '/vendors/purchase-orders': 'vendor-purchase-orders',
  '/vendor-purchase-orders': 'vendor-purchase-orders',
  '/vendor-pos': 'vendor-purchase-orders',
  '/vendors/pos': 'vendor-purchase-orders',
  '/vendors/invoices': 'vendor-invoices',
  '/vendor-invoices': 'vendor-invoices',
  '/vendors/billing': 'vendor-wages',
  '/vendor-wages': 'vendor-wages',
  '/vendor/wages': 'vendor-wages',
  '/vendors/wages': 'vendor-wages',
  '/vendor-billing': 'vendor-wages',
  '/wage-engine': 'vendor-wages',
  '/client-billing': 'vendor-wages',
  '/client-wage-billing': 'vendor-wages',
  '/vendors/attendance': 'vendor-attendance',
  '/vendor-attendance': 'vendor-attendance',
  '/vendors/attendance-recon': 'vendor-attendance-recon',
  '/vendor-attendance-recon': 'vendor-attendance-recon',
  '/vendors/workforce': 'vendor-workforce',
  '/vendor-workforce': 'vendor-workforce',
  '/vendors/compliance': 'vendor-compliance',
  '/vendor-compliance': 'vendor-compliance',
  '/vendors/vault': 'vendor-compliance',
  '/vendors/leaderboard': 'vendor-leaderboard',
  '/vendor-leaderboard': 'vendor-leaderboard',
  '/vendors/reports': 'vendor-reports',
  '/vendor-reports': 'vendor-reports',

  // Dedicated Vendor Portal Slugs
  '/vendor-portal': 'vendor-portal',
  '/vendor/portal': 'vendor-portal',
  '/vendor-dashboard': 'vendor-dashboard',
  '/vendor/dashboard': 'vendor-dashboard',
  '/vendor-portal/dashboard': 'vendor-dashboard',
  '/vendor-portal/purchase-orders': 'vendor-purchase-orders',
  '/vendor-portal/orders': 'vendor-purchase-orders',
  '/vendor-portal/pos': 'vendor-purchase-orders',
  '/vendor-portal/invoices': 'vendor-invoices',
  '/vendor-portal/wages': 'vendor-wages',
  '/vendor-portal/attendance': 'vendor-attendance',
  '/vendor-portal/attendance-recon': 'vendor-attendance-recon',
  '/vendor-portal/recon': 'vendor-attendance-recon',
  '/vendor-portal/workforce': 'vendor-workforce',
  '/vendor-portal/company': 'vendor-company',
  '/vendor-portal/profile': 'vendor-company',
  '/vendor-portal/compliance': 'vendor-compliance',
  '/vendor-portal/vault': 'vendor-compliance',
  '/vendor-portal/documents': 'vendor-compliance',
  '/vendor-portal/leaderboard': 'vendor-leaderboard',
  '/vendor-portal/communication': 'vendor-communication',
  '/vendor-portal/reports': 'vendor-reports',

  // Core HRMS Slugs — Attendance
  '/attendance': 'attendance',
  '/attendance-dashboard': 'attendance',
  '/attendance/dashboard': 'attendance',
  '/attendance/employees': 'attendance-employees',
  '/attendance-employees': 'attendance-employees',
  '/employee-attendance': 'attendance-employees',
  '/attendance/history': 'history',
  '/attendance-history': 'history',
  '/attendance/ledger': 'history',
  '/ledger': 'history',
  '/attendance/late-early': 'late-early',
  '/late-early': 'late-early',
  '/attendance/regularization': 'regularization',
  '/regularization': 'regularization',
  '/attendance/exceptions': 'exceptions',
  '/exceptions': 'exceptions',

  // Core HRMS Slugs — Leave
  '/leave': 'leave',
  '/leave-dashboard': 'leave',
  '/leave/dashboard': 'leave',
  '/leave/types': 'leave-types',
  '/leave-types': 'leave-types',
  '/leave/policies': 'leave-policies',
  '/leave-policies': 'leave-policies',
  '/leave/calendar': 'leave-calendar',
  '/leave-calendar': 'leave-calendar',
  '/leave/balance': 'leave-balance',
  '/leave-balance': 'leave-balance',
  '/leave/requests': 'leave-requests',
  '/leave-requests': 'leave-requests',
  '/leave/approvals': 'leave-approval',
  '/leave-approval': 'leave-approval',
  '/leave/holidays': 'leave-holidays',
  '/leave-holidays': 'leave-holidays',

  // Core HRMS Slugs — Work & Overtime
  '/overtime': 'overtime',
  '/work-overtime': 'overtime',
  '/overtime/requests': 'overtime-requests',
  '/overtime-requests': 'overtime-requests',
  '/wfh': 'wfh',
  '/breaks': 'breaks-workhours',
  '/breaks-workhours': 'breaks-workhours',

  // Core HRMS Slugs — Shifts & Scheduling
  '/shifts': 'shifts',
  '/shift-master': 'shifts',
  '/shifts/master': 'shifts',
  '/shifts/roster': 'roster',
  '/roster': 'roster',
  '/shift-roster': 'roster',
  '/shifts/calendar': 'shift-calendar',
  '/shift-calendar': 'shift-calendar',
  '/policies': 'policies',
  '/attendance-policies': 'policies',
  '/shifts/policies': 'policies',

  // Core HRMS Slugs — Clocking & Devices
  '/biometric': 'biometric',
  '/biometric/': 'biometric',
  '/biometric/devices': 'biometric',
  '/biometric/workspace': 'biometric',
  '/biometric/terminal-ledger': 'biometric',
  '/biometric/ledger': 'biometric',
  '/biometric-devices': 'biometric',
  '/biometric_devices': 'biometric',
  '/biometric/rules': 'attendance-rules',
  '/attendance-rules': 'attendance-rules',
  '/biometric-rules': 'attendance-rules',
  '/rules-engine': 'attendance-rules',
  '/biometric/gps': 'gps',
  '/gps': 'gps',
  '/gps-attendance': 'gps',
  '/biometric/face': 'face-attendance',
  '/face-attendance': 'face-attendance',
  '/face-recognition': 'face-attendance',
  '/face-enrollment': 'face-attendance',
  '/face-devices': 'face-attendance',
  '/face-logs': 'face-attendance',
  '/face-exceptions': 'face-attendance',
  '/biometric/geofences': 'geofences',
  '/geofences': 'geofences',
  '/device-enrollment': 'device-enrollment',
  '/device-sync': 'device-sync',
  '/punch-mapping': 'punch-mapping',
  '/device-logs': 'device-logs',

  // Core HRMS Slugs — Audit & Control
  '/audit/ledger': 'calculation-audit',
  '/calculation-audit': 'calculation-audit',
  '/audit/corrections': 'attendance-corrections',
  '/attendance-corrections': 'attendance-corrections',
  '/audit/approvals': 'approval-history',
  '/approval-history': 'approval-history',
  '/audit/activity': 'attendance-activity-logs',
  '/attendance-activity-logs': 'attendance-activity-logs',
  '/audit/sync-health': 'realtime-health',
  '/realtime-health': 'realtime-health',
  '/admin-realtime-health': 'realtime-health',

  // Core HRMS Slugs — Payroll
  '/payroll': 'payroll-dashboard',
  '/payroll-dashboard': 'payroll-dashboard',
  '/payroll/dashboard': 'payroll-dashboard',
  '/payroll/settings': 'payroll-settings',
  '/payroll-settings': 'payroll-settings',
  '/payroll/statutory': 'payroll-statutory',
  '/payroll-statutory': 'payroll-statutory',
  '/payroll/salary-structures': 'payroll-salary',
  '/payroll/salary': 'payroll-salary',
  '/payroll-salary': 'payroll-salary',
  '/payroll/earnings': 'payroll-earnings',
  '/payroll-earnings': 'payroll-earnings',
  '/payroll/deductions': 'payroll-deductions',
  '/payroll-deductions': 'payroll-deductions',
  '/payroll/claims': 'payroll-claims',
  '/payroll/expenses': 'payroll-claims',
  '/payroll-claims': 'payroll-claims',
  '/payroll-expenses': 'payroll-claims',
  '/payroll/runs': 'payroll-processing',
  '/payroll/processing': 'payroll-processing',
  '/payroll-processing': 'payroll-processing',
  '/payroll-runs': 'payroll-processing',
  '/payroll/bank': 'payroll-disbursement',
  '/payroll/disbursement': 'payroll-disbursement',
  '/payroll-disbursement': 'payroll-disbursement',
  '/payroll/reports': 'payroll-reports',
  '/payroll-reports': 'payroll-reports',
  '/payroll/payslips': 'payroll-documents',
  '/payroll/documents': 'payroll-documents',
  '/payroll-documents': 'payroll-documents',
  '/payroll/fnf': 'payroll-fnf',
  '/payroll-fnf': 'payroll-fnf',

  // Core HRMS Slugs — Performance
  '/performance': 'performance-dashboard',
  '/performance-dashboard': 'performance-dashboard',
  '/performance/goals': 'performance-goals',
  '/performance/okr': 'performance-okr',
  '/performance/kpi': 'performance-kpi',
  '/performance/kra': 'performance-kra',
  '/performance/cycles': 'performance-cycles',
  '/performance/reviews': 'performance-reviews',
  '/performance/ratings': 'performance-ratings',
  '/performance/development': 'performance-development',
  '/performance/promotion': 'performance-promotion',
  '/performance/pip': 'performance-pip',
  '/performance/reports': 'performance-reports',

  // Core HRMS Slugs — LMS & Training
  '/lms': 'lms-dashboard',
  '/lms-dashboard': 'lms-dashboard',
  '/learning': 'lms-dashboard',
  '/lms/courses': 'lms-courses',
  '/lms/programs': 'lms-programs',
  '/lms/calendar': 'lms-calendar',
  '/lms/enrollments': 'lms-enrollment',
  '/lms/trainers': 'lms-trainers',
  '/lms/assessments': 'lms-assessments',
  '/lms/certifications': 'lms-certifications',
  '/lms/mandatory': 'lms-mandatory',
  '/lms/skills': 'lms-skills',
  '/lms/feedback': 'lms-feedback',
  '/lms/reports': 'lms-reports',
  '/lms/settings': 'lms-settings',

  // Core HRMS Slugs — Employee Relations
  '/employee-relations/engagement': 'engagement',
  '/engagement': 'engagement',
  '/employee-relations/grievance': 'grievances',
  '/grievance': 'grievances',
  '/grievances': 'grievances',
  '/employee-relations/discipline': 'discipline',
  '/discipline': 'discipline',
  '/employee-relations/posh': 'posh',
  '/posh': 'posh',
  '/employee-relations/compliance': 'compliance',
  '/compliance': 'compliance',

  // Core HRMS Slugs — Travel, Expense, Helpdesk
  '/travel': 'other-travel',
  '/other-travel': 'other-travel',
  '/communication': 'other-communication',
  '/other-communication': 'other-communication',
  '/helpdesk': 'helpdesk',
  '/knowledge': 'knowledge',

  // Core HRMS Slugs — Analytics
  '/analytics': 'analytics-overview',
  '/analytics-overview': 'analytics-overview',
  '/analytics/hr': 'analytics-hr',
  '/analytics/ceo': 'analytics-ceo',
  '/analytics/finance': 'analytics-finance',
  '/analytics/recruitment': 'analytics-recruitment',
  '/analytics/attendance': 'analytics-attendance',
  '/analytics/leave': 'analytics-leave',
  '/analytics/payroll': 'analytics-payroll',
  '/analytics/performance': 'analytics-performance',
  '/analytics/training': 'analytics-training',
  '/analytics/attrition': 'analytics-attrition',
  '/analytics/workforce': 'analytics-workforce',
  '/analytics/cost': 'analytics-cost',
  '/analytics/reports': 'analytics-reports',
  '/analytics/settings': 'analytics-settings',

  // Core HRMS Slugs — Automation & Admin
  '/admin': 'admin',
  '/administration': 'admin',
  '/rbac': 'rbac',
  '/roles': 'admin-roles',
  '/admin/roles': 'admin-roles',
  '/admin-roles': 'admin-roles',
  '/notifications': 'notifications',
  '/notification-settings': 'admin-notifications',
  '/notifications-settings': 'admin-notifications',
  '/admin/notifications': 'admin-notifications',
  '/admin/notification-settings': 'admin-notifications',
  '/admin/notifications-settings': 'admin-notifications',
  '/admin-notifications': 'admin-notifications',
  '/company-onboarding': 'company-onboarding',
  '/legal': 'trust-legal',
  '/trust-legal': 'trust-legal',

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
  '/platform-dashboard': 'platform-dashboard',
  '/platform/organizations': 'platform-tenants',
  '/platform/tenants': 'platform-tenants',
  '/platform-tenants': 'platform-tenants',
  '/platform/provisioning': 'platform-tenants',
  '/platform/health': 'platform-tenant-health',
  '/platform/tenant-health': 'platform-tenant-health',
  '/platform-tenant-health': 'platform-tenant-health',
  '/platform/revenue': 'saas-revenue',
  '/platform-revenue': 'saas-revenue',
  '/platform/quotations': 'platform-quotations',
  '/platform-quotations': 'platform-quotations',
  '/quotations': 'platform-quotations',
  '/saas-quotations': 'platform-quotations',
  '/platform/subscriptions': 'platform-subscriptions',
  '/platform-subscriptions': 'platform-subscriptions',
  '/platform/invoices': 'platform-invoices',
  '/platform-invoices': 'platform-invoices',
  '/platform/billing': 'platform-invoices',
  '/platform-billing': 'platform-invoices',
  '/platform/plans': 'platform-plans',
  '/platform-plans': 'platform-plans',
  '/platform/pricing': 'platform-plans',
  '/platform-pricing': 'platform-plans',
  '/platform/addons': 'platform-addons',
  '/platform-addons': 'platform-addons',
  '/platform/pricing-calculator': 'platform-pricing-calculator',
  '/platform-pricing-calculator': 'platform-pricing-calculator',
  '/pricing-calculator': 'platform-pricing-calculator',
  '/platform/catalogue': 'platform-catalogue',
  '/platform-catalogue': 'platform-catalogue',
  '/platform/feature-catalogue': 'platform-catalogue',
  '/platform-feature-catalogue': 'platform-catalogue',
  '/platform/product-catalogue': 'platform-catalogue',
  '/platform/clients': 'platform-clients',
  '/platform-clients': 'platform-clients',
  '/platform/payments': 'platform-payments',
  '/platform-payments': 'platform-payments',
  '/platform/renewals': 'platform-renewals',
  '/platform-renewals': 'platform-renewals',
  '/platform/modules': 'platform-modules',
  '/platform-modules': 'platform-modules',
  '/platform/usage': 'platform-usage',
  '/platform-usage': 'platform-usage',
  '/platform/metering': 'platform-usage',
  '/platform/features': 'platform-features',
  '/platform-features': 'platform-features',
  '/platform/flags': 'platform-features',
  '/platform-flags': 'platform-features',
  '/platform/security': 'platform-security',
  '/platform-security': 'platform-security',
  '/platform/sessions': 'platform-sessions',
  '/platform-sessions': 'platform-sessions',
  '/platform/audit': 'platform-audit',
  '/platform-audit': 'platform-audit',
  '/platform/support': 'platform-support',
  '/platform-support': 'platform-support',
  '/platform/jobs': 'platform-jobs',
  '/platform-jobs': 'platform-jobs',
  '/platform/incidents': 'platform-incidents',
  '/platform-incidents': 'platform-incidents',
  '/platform/operations': 'platform-incidents',
  '/platform/webhooks': 'platform-webhooks',
  '/platform-webhooks': 'platform-webhooks',
  '/platform/api': 'platform-api',
  '/platform-api': 'platform-api',
  '/platform/settings': 'platform-settings',
  '/platform-settings': 'platform-settings',
  '/platform/staff': 'platform-staff',
  '/platform-staff': 'platform-staff',
  '/platform/notifications': 'platform-notifications',
  '/platform-notifications': 'platform-notifications',
};

// Canonical URL Path corresponding to each internal route ID
export const ROUTE_TO_PATH: Record<string, string> = {
  'login': '/login',
  'superadmin-login': '/superadmin',
  'dashboard': '/dashboard',
  'workforce-overview': '/workforce-overview',
  'executive-overview': '/executive-overview',
  'people': '/people',
  'organization': '/organization',
  'departments': '/departments',
  'designations': '/designations',
  'locations': '/locations',
  'rbac': '/rbac',
  'admin': '/admin',
  'my-workspace': '/workspace',
  'workspace': '/workspace',
  'my-profile': '/profile',
  'profile': '/profile',

  // Company HR Vendor Governance
  'vendors': '/vendors',
  'vendor-directory': '/vendors/directory',
  'vendor-purchase-orders': '/vendors/purchase-orders',
  'vendor-invoices': '/vendors/invoices',
  'vendor-attendance-recon': '/vendors/attendance-recon',
  'vendor-attendance': '/vendors/attendance',
  'vendor-workforce': '/vendors/workforce',
  'vendor-compliance': '/vendors/compliance',
  'vendor-leaderboard': '/vendors/leaderboard',
  'vendor-reports': '/vendors/reports',
  'vendor-wages': '/vendor-wages',

  // Dedicated Vendor Portal
  'vendor-portal': '/vendor-portal',
  'vendor-dashboard': '/vendor-portal/dashboard',
  'vendor-company': '/vendor-portal/company',
  'vendor-communication': '/vendor-portal/communication',

  // Core Attendance
  'attendance': '/attendance',
  'attendance-dashboard': '/attendance',
  'attendance-employees': '/attendance/employees',
  'employee-attendance': '/attendance/employees',
  'history': '/attendance/history',
  'attendance-history': '/attendance/history',
  'ledger': '/attendance/history',
  'late-early': '/attendance/late-early',
  'regularization': '/attendance/regularization',
  'exceptions': '/attendance/exceptions',

  // Shifts & Scheduling
  'shifts': '/shifts',
  'shift-master': '/shifts',
  'roster': '/shifts/roster',
  'shift-roster': '/shifts/roster',
  'shift-calendar': '/shifts/calendar',
  'policies': '/policies',
  'attendance-policies': '/policies',

  // Clocking & Devices
  'biometric': '/biometric',
  'biometric-devices': '/biometric',
  'attendance-rules': '/biometric/rules',
  'biometric-rules': '/biometric/rules',
  'rules-engine': '/biometric/rules',
  'device-enrollment': '/device-enrollment',
  'device-sync': '/device-sync',
  'punch-mapping': '/punch-mapping',
  'device-logs': '/device-logs',
  'gps': '/biometric/gps',
  'gps-attendance': '/biometric/gps',
  'face-attendance': '/biometric/face',
  'face-recognition': '/biometric/face',
  'geofences': '/biometric/geofences',

  // Audit & Control
  'calculation-audit': '/audit/ledger',
  'attendance-corrections': '/audit/corrections',
  'approval-history': '/audit/approvals',
  'attendance-activity-logs': '/audit/activity',
  'realtime-health': '/audit/sync-health',

  // Work & Overtime
  'overtime': '/overtime',
  'work-overtime': '/overtime',
  'overtime-requests': '/overtime/requests',
  'wfh': '/wfh',
  'breaks-workhours': '/breaks',
  'breaks': '/breaks',

  // Leave
  'leave': '/leave',
  'leave-dashboard': '/leave',
  'leave-types': '/leave/types',
  'leave-policies': '/leave/policies',
  'leave-calendar': '/leave/calendar',
  'leave-balance': '/leave/balance',
  'leave-requests': '/leave/requests',
  'leave-approval': '/leave/approvals',
  'leave-holidays': '/leave/holidays',

  // Payroll
  'payroll': '/payroll',
  'payroll-dashboard': '/payroll',
  'client-billing': '/client-billing',
  'payroll-settings': '/payroll/settings',
  'payroll-statutory': '/payroll/statutory',
  'payroll-salary': '/payroll/salary-structures',
  'payroll-earnings': '/payroll/earnings',
  'payroll-deductions': '/payroll/deductions',
  'payroll-claims': '/payroll/claims',
  'payroll-expenses': '/payroll/claims',
  'payroll-processing': '/payroll/runs',
  'payroll-disbursement': '/payroll/bank',
  'payroll-reports': '/payroll/reports',
  'payroll-documents': '/payroll/payslips',
  'payroll-fnf': '/payroll/fnf',

  // Recruitment & ATS
  'recruitment': '/recruitment',
  'recruitment-dashboard': '/recruitment',
  'recruitment-requisitions': '/recruitment/requisitions',
  'recruitment-jobs': '/recruitment/jobs',
  'recruitment-applicants': '/recruitment/applicants',
  'recruitment-interviews': '/recruitment/interviews',
  'recruitment-offers': '/recruitment/offers',
  'recruitment-referrals': '/recruitment/referrals',
  'recruitment-talent-pool': '/recruitment/talent-pool',
  'recruitment-analytics': '/recruitment/analytics',
  'recruitment-automation': '/recruitment/automation',
  'career-dev': '/career-dev',

  // Performance
  'performance': '/performance',
  'performance-dashboard': '/performance',
  'performance-goals': '/performance/goals',
  'performance-okr': '/performance/okr',
  'performance-kpi': '/performance/kpi',
  'performance-kra': '/performance/kra',
  'performance-cycles': '/performance/cycles',
  'performance-reviews': '/performance/reviews',
  'performance-ratings': '/performance/ratings',
  'performance-development': '/performance/development',
  'performance-promotion': '/performance/promotion',
  'performance-pip': '/performance/pip',
  'performance-reports': '/performance/reports',

  // LMS & Training
  'lms': '/lms',
  'lms-dashboard': '/lms',
  'lms-courses': '/lms/courses',
  'lms-programs': '/lms/programs',
  'lms-calendar': '/lms/calendar',
  'lms-enrollment': '/lms/enrollments',
  'lms-trainers': '/lms/trainers',
  'lms-assessments': '/lms/assessments',
  'lms-certifications': '/lms/certifications',
  'lms-mandatory': '/lms/mandatory',
  'lms-skills': '/lms/skills',
  'lms-feedback': '/lms/feedback',
  'lms-reports': '/lms/reports',
  'lms-settings': '/lms/settings',

  // Employee Relations
  'engagement': '/employee-relations/engagement',
  'grievances': '/employee-relations/grievance',
  'discipline': '/employee-relations/discipline',
  'posh': '/employee-relations/posh',
  'compliance': '/employee-relations/compliance',

  // Travel, Helpdesk, Communication
  'other-travel': '/travel',
  'other-communication': '/communication',
  'helpdesk': '/helpdesk',
  'knowledge': '/knowledge',

  // Analytics
  'analytics': '/analytics',
  'analytics-overview': '/analytics',
  'analytics-hr': '/analytics/hr',
  'analytics-ceo': '/analytics/ceo',
  'analytics-finance': '/analytics/finance',
  'analytics-recruitment': '/analytics/recruitment',
  'analytics-attendance': '/analytics/attendance',
  'analytics-leave': '/analytics/leave',
  'analytics-payroll': '/analytics/payroll',
  'analytics-performance': '/analytics/performance',
  'analytics-training': '/analytics/training',
  'analytics-attrition': '/analytics/attrition',
  'analytics-workforce': '/analytics/workforce',
  'analytics-cost': '/analytics/cost',
  'analytics-reports': '/analytics/reports',
  'analytics-settings': '/analytics/settings',

  // Automation & Admin
  'admin-roles': '/admin/roles',
  'notifications': '/notifications',
  'admin-notifications': '/admin/notifications',
  'notification-settings': '/admin/notifications',
  'notifications-settings': '/admin/notifications',
  'company-onboarding': '/company-onboarding',
  'trust-legal': '/legal',
  'accept-invite': '/auth/accept-invite',
  'reset-password': '/auth/reset-password',

  // ESS & TL
  'tl-dashboard': '/tl/dashboard',
  'ess-dashboard': '/ess/dashboard',
  'ess-profile': '/ess/profile',
  'ess-attendance': '/ess/attendance',
  'ess-leave': '/ess/leave',
  'ess-payroll': '/ess/payroll',
  'ess-documents': '/ess/documents',

  // Platform Control Plane
  'platform-dashboard': '/platform',
  'platform': '/platform',
  'platform-tenants': '/platform/tenants',
  'platform-clients': '/platform/clients',
  'platform-tenant-health': '/platform/health',
  'saas-revenue': '/platform/revenue',
  'platform-quotations': '/platform/quotations',
  'quotations': '/platform/quotations',
  'saas-quotations': '/platform/quotations',
  'platform-subscriptions': '/platform/subscriptions',
  'platform-invoices': '/platform/invoices',
  'saas-invoices': '/platform/invoices',
  'platform-payments': '/platform/payments',
  'platform-renewals': '/platform/renewals',
  'platform-plans': '/platform/plans',
  'platform-addons': '/platform-addons',
  'platform-pricing-calculator': '/platform-pricing-calculator',
  'pricing-calculator': '/platform-pricing-calculator',
  'platform-catalogue': '/platform/feature-catalogue',
  'platform-feature-catalogue': '/platform/feature-catalogue',
  'product-catalogue': '/platform/feature-catalogue',
  'platform-modules': '/platform/modules',
  'platform-billing': '/platform/invoices',
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
};

export function parseRouteFromUrl(): RouteState {
  if (typeof window === 'undefined') {
    return { route: '', params: {}, pathname: '/', search: '' };
  }

  const rawPath = window.location.pathname || '/';
  const pathname = normalizePath(rawPath);
  const search = window.location.search;
  const searchParams = new URLSearchParams(search);
  const params: Record<string, string> = {};

  searchParams.forEach((val, key) => {
    if (key !== 'tab' && key !== 'route') {
      params[key] = val;
    }
  });

  // 1. Direct path-based route match against aliases
  if (pathname !== '/' && pathname !== '') {
    if (ROUTE_ALIASES[pathname]) {
      return {
        route: ROUTE_ALIASES[pathname],
        params,
        pathname,
        search,
      };
    }

    // Check registry for canonical match
    const def = findRouteDefinition(pathname);
    if (def) {
      return {
        route: def.id,
        params,
        pathname,
        search,
      };
    }

    // Special prefix handling
    if (pathname.startsWith('/biometric')) {
      return {
        route: 'biometric',
        params,
        pathname,
        search,
      };
    }

    if (pathname.startsWith('/payroll')) {
      return {
        route: 'payroll-dashboard',
        params,
        pathname,
        search,
      };
    }
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

  // 3. Fallback: check if pathname directly matches a route key
  const cleanPath = pathname.replace(/^\//, '');
  if (cleanPath) {
    const matchedId = registryResolveRouteId(cleanPath);
    return {
      route: matchedId || cleanPath,
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

  const targetPath = ROUTE_TO_PATH[route] || registryCanonicalizeRoute(route);
  const currentPath = normalizePath(window.location.pathname);

  // Build query string only for additional functional parameters
  const urlParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (key !== 'tab' && key !== 'route' && val !== undefined && val !== null && val !== '') {
        urlParams.set(key, val);
      }
    });
  } else if (params === undefined && currentPath === targetPath) {
    // Preserve existing query params if no new params are specified on same route
    const existingSearch = new URLSearchParams(window.location.search);
    existingSearch.forEach((val, key) => {
      if (key !== 'tab' && key !== 'route') {
        urlParams.set(key, val);
      }
    });
  }

  const newSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
  const newUrl = `${targetPath}${newSearch}`;
  const currentFullUrl = `${currentPath}${window.location.search}`;

  if (newUrl === currentFullUrl) {
    return;
  }

  const statePayload = { route, params: params || {} };
  if (replace) {
    window.history.replaceState(statePayload, '', newUrl);
  } else {
    window.history.pushState(statePayload, '', newUrl);
  }
}
