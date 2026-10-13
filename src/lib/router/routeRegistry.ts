// src/lib/router/routeRegistry.ts
// ============================================================
// Joy PeopleHR — Centralized Authoritative Route Registry & Matcher Engine
// Single Source of Truth for Route Slugs, Canonical URLs, Aliases, and Active State
// ============================================================

export interface RouteDefinition {
  id: string;
  label: string;
  canonicalPath: string;
  section: string;
  aliases?: string[];
  exact?: boolean;
  permission?: string;
  parentRoute?: string;
}

export const APP_ROUTES = {
  dashboard: {
    root: '/dashboard',
    workforceOverview: '/workforce-overview',
    executiveOverview: '/executive-overview',
    workspace: '/workspace',
  },
  people: {
    employees: '/people',
    organization: '/organization',
    departments: '/departments',
    designations: '/designations',
    locations: '/locations',
    documents: '/documents',
    assets: '/assets',
    onboarding: '/onboarding',
    offboarding: '/offboarding',
  },
  vendors: {
    hub: '/vendors',
    directory: '/vendors/directory',
    pos: '/vendors/purchase-orders',
    invoices: '/vendors/invoices',
    attendance: '/vendors/attendance',
    attendanceRecon: '/vendors/attendance-recon',
    workforce: '/vendors/workforce',
    compliance: '/vendors/compliance',
    leaderboard: '/vendors/leaderboard',
    reports: '/vendors/reports',
  },
  vendorPortal: {
    root: '/vendor-portal',
    dashboard: '/vendor-portal/dashboard',
    pos: '/vendor-portal/purchase-orders',
    invoices: '/vendor-portal/invoices',
    attendance: '/vendor-portal/attendance',
    attendanceRecon: '/vendor-portal/attendance-recon',
    workforce: '/vendor-portal/workforce',
    company: '/vendor-portal/company',
    compliance: '/vendor-portal/compliance',
    leaderboard: '/vendor-portal/leaderboard',
    communication: '/vendor-portal/communication',
    reports: '/vendor-portal/reports',
  },
  recruitment: {
    root: '/recruitment',
    requisitions: '/recruitment/requisitions',
    jobs: '/recruitment/jobs',
    applicants: '/recruitment/applicants',
    interviews: '/recruitment/interviews',
    offers: '/recruitment/offers',
    referrals: '/recruitment/referrals',
    talentPool: '/recruitment/talent-pool',
    analytics: '/recruitment/analytics',
    automation: '/recruitment/automation',
    careerDev: '/career-dev',
  },
  attendance: {
    dashboard: '/attendance',
    employees: '/attendance/employees',
    history: '/attendance/history',
    lateEarly: '/attendance/late-early',
    regularization: '/attendance/regularization',
    exceptions: '/attendance/exceptions',
  },
  leave: {
    root: '/leave',
    types: '/leave/types',
    policies: '/leave/policies',
    calendar: '/leave/calendar',
    balance: '/leave/balance',
    requests: '/leave/requests',
    approvals: '/leave/approvals',
    holidays: '/leave/holidays',
  },
  work: {
    overtime: '/overtime',
    overtimeRequests: '/overtime/requests',
    wfh: '/wfh',
    breaks: '/breaks',
  },
  shifts: {
    master: '/shifts',
    roster: '/shifts/roster',
    calendar: '/shifts/calendar',
    policies: '/policies',
  },
  devices: {
    biometric: '/biometric',
    rules: '/biometric/rules',
    gps: '/biometric/gps',
    face: '/biometric/face',
    geofences: '/biometric/geofences',
  },
  audit: {
    ledger: '/audit/ledger',
    corrections: '/audit/corrections',
    approvals: '/audit/approvals',
    activityLogs: '/audit/activity',
    syncHealth: '/audit/sync-health',
  },
  payroll: {
    dashboard: '/payroll',
    billing: '/payroll/billing',
    settings: '/payroll/settings',
    statutory: '/payroll/statutory',
    salaryStructures: '/payroll/salary-structures',
    earnings: '/payroll/earnings',
    deductions: '/payroll/deductions',
    expenses: '/payroll/claims',
    runs: '/payroll/runs',
    bank: '/payroll/bank',
    reports: '/payroll/reports',
    payslips: '/payroll/payslips',
    fnf: '/payroll/fnf',
  },
  performance: {
    root: '/performance',
    goals: '/performance/goals',
    okr: '/performance/okr',
    kpi: '/performance/kpi',
    kra: '/performance/kra',
    cycles: '/performance/cycles',
    reviews: '/performance/reviews',
    ratings: '/performance/ratings',
    development: '/performance/development',
    promotion: '/performance/promotion',
    pip: '/performance/pip',
    reports: '/performance/reports',
  },
  lms: {
    root: '/lms',
    courses: '/lms/courses',
    programs: '/lms/programs',
    calendar: '/lms/calendar',
    enrollments: '/lms/enrollments',
    trainers: '/lms/trainers',
    assessments: '/lms/assessments',
    certifications: '/lms/certifications',
    mandatory: '/lms/mandatory',
    skills: '/lms/skills',
    feedback: '/lms/feedback',
    reports: '/lms/reports',
    settings: '/lms/settings',
  },
  employeeRelations: {
    engagement: '/employee-relations/engagement',
    grievance: '/employee-relations/grievance',
    discipline: '/employee-relations/discipline',
    posh: '/employee-relations/posh',
    compliance: '/employee-relations/compliance',
  },
  travel: {
    root: '/travel',
  },
  communication: {
    root: '/communication',
    helpdesk: '/helpdesk',
    knowledge: '/knowledge',
  },
  analytics: {
    overview: '/analytics',
    hr: '/analytics/hr',
    ceo: '/analytics/ceo',
    finance: '/analytics/finance',
    recruitment: '/analytics/recruitment',
    attendance: '/analytics/attendance',
    leave: '/analytics/leave',
    payroll: '/analytics/payroll',
    performance: '/analytics/performance',
    training: '/analytics/training',
    attrition: '/analytics/attrition',
    workforce: '/analytics/workforce',
    cost: '/analytics/cost',
    reports: '/analytics/reports',
    settings: '/analytics/settings',
  },
  admin: {
    root: '/admin',
    roles: '/admin/roles',
    users: '/admin/users',
    security: '/admin/security',
    integrations: '/admin/integrations',
    audit: '/admin/audit',
    settings: '/admin/settings',
    notifications: '/admin/notifications',
  },
  platform: {
    dashboard: '/platform/dashboard',
    tenants: '/platform/tenants',
    incidents: '/platform/incidents',
    staff: '/platform/staff',
    revenue: '/platform/revenue',
    quotations: '/platform/quotations',
    subscriptions: '/platform/subscriptions',
    invoices: '/platform/invoices',
    billing: '/platform/invoices',
    plans: '/platform/plans',
    addons: '/platform/addons',
    pricingCalculator: '/platform/pricing-calculator',
    catalogue: '/platform/catalogue',
    usage: '/platform/usage',
    health: '/platform/health',
    launchScope: '/platform/launch-scope',
    modules: '/platform/modules',
    roadmap: '/platform/roadmap',
    features: '/platform/features',
    security: '/platform/security',
    sessions: '/platform/sessions',
    audit: '/platform/audit',
    support: '/platform/support',
    jobs: '/platform/jobs',
    webhooks: '/platform/webhooks',
    notifications: '/platform/notifications',
    settings: '/platform/settings',
    api: '/platform/api',
  },
};

export const ROUTE_MANIFEST: RouteDefinition[] = [
  // ── DASHBOARD ──
  { id: 'dashboard', label: 'HR Dashboard', canonicalPath: '/dashboard', section: 'DASHBOARD', aliases: ['/'], exact: true },
  { id: 'workforce-overview', label: 'Workforce Overview', canonicalPath: '/workforce-overview', section: 'DASHBOARD' },
  { id: 'executive-overview', label: 'Executive HR Overview', canonicalPath: '/executive-overview', section: 'DASHBOARD' },
  { id: 'my-workspace', label: 'My Workspace', canonicalPath: '/workspace', section: 'DASHBOARD', aliases: ['/my-workspace'] },

  // ── PEOPLE & CORE HR ──
  { id: 'people', label: 'Employee Management', canonicalPath: '/people', section: 'PEOPLE & CORE HR', aliases: ['/employees'] },
  { id: 'organization', label: 'Organization Architecture', canonicalPath: '/organization', section: 'PEOPLE & CORE HR' },
  { id: 'departments', label: 'Departments', canonicalPath: '/departments', section: 'PEOPLE & CORE HR' },
  { id: 'designations', label: 'Designations', canonicalPath: '/designations', section: 'PEOPLE & CORE HR' },
  { id: 'locations', label: 'Locations', canonicalPath: '/locations', section: 'PEOPLE & CORE HR' },
  { id: 'documents', label: 'Documents & E-Sign', canonicalPath: '/documents', section: 'PEOPLE & CORE HR' },
  { id: 'assets', label: 'Asset Management', canonicalPath: '/assets', section: 'PEOPLE & CORE HR' },
  { id: 'onboarding', label: 'Onboarding Engine', canonicalPath: '/onboarding', section: 'PEOPLE & CORE HR' },
  { id: 'offboarding', label: 'Offboarding & Exit', canonicalPath: '/offboarding', section: 'PEOPLE & CORE HR' },

  // ── COMPANY HR: VENDOR & WORKFORCE GOVERNANCE ──
  { id: 'vendors', label: 'Vendors & Workforce Hub', canonicalPath: '/vendors', section: 'VENDOR & CONTRACTORS', aliases: ['/vendor-hub', '/organization/vendors', '/organization-vendors'] },
  { id: 'vendor-directory', label: 'Vendor Master Directory', canonicalPath: '/vendors/directory', section: 'VENDOR & CONTRACTORS', aliases: ['/vendor-directory'] },
  { id: 'vendor-purchase-orders', label: 'Purchase Orders & Contracts', canonicalPath: '/vendors/purchase-orders', section: 'VENDOR & CONTRACTORS', aliases: ['/vendor-pos', '/vendor-purchase-orders', '/vendors/pos'] },
  { id: 'vendor-invoices', label: 'Invoices & 3-Way Match', canonicalPath: '/vendors/invoices', section: 'VENDOR & CONTRACTORS', aliases: ['/vendor-invoices', '/vendors/billing'] },
  { id: 'vendor-attendance-recon', label: 'Attendance & OT Reconciliation', canonicalPath: '/vendors/attendance-recon', section: 'VENDOR & CONTRACTORS', aliases: ['/vendor-attendance-recon'] },
  { id: 'vendor-attendance', label: 'Contractor Attendance', canonicalPath: '/vendors/attendance', section: 'VENDOR & CONTRACTORS', aliases: ['/vendor-attendance'] },
  { id: 'vendor-workforce', label: 'Workforce Allocations', canonicalPath: '/vendors/workforce', section: 'VENDOR & CONTRACTORS', aliases: ['/vendor-workforce'] },
  { id: 'vendor-compliance', label: 'Vendor Document Vault', canonicalPath: '/vendors/compliance', section: 'VENDOR & CONTRACTORS', aliases: ['/vendor-compliance', '/vendors/vault'] },
  { id: 'vendor-leaderboard', label: 'Workforce Performance', canonicalPath: '/vendors/leaderboard', section: 'VENDOR & CONTRACTORS', aliases: ['/vendor-leaderboard'] },
  { id: 'vendor-reports', label: 'Vendor Reports & Audit', canonicalPath: '/vendors/reports', section: 'VENDOR & CONTRACTORS', aliases: ['/vendor-reports', '/vendor-audit'] },

  // ── DEDICATED VENDOR PORTAL ──
  { id: 'vendor-portal', label: 'Dedicated Vendor Portal', canonicalPath: '/vendor-portal', section: 'DEDICATED VENDOR PORTAL', aliases: ['/vendor/portal', '/vendor-dashboard', '/vendor/dashboard'] },
  { id: 'vendor-portal-dashboard', label: 'Vendor Portal Dashboard', canonicalPath: '/vendor-portal/dashboard', section: 'DEDICATED VENDOR PORTAL', aliases: ['/vendor-dashboard'] },
  { id: 'vendor-portal-pos', label: 'Received Purchase Orders', canonicalPath: '/vendor-portal/purchase-orders', section: 'DEDICATED VENDOR PORTAL', aliases: ['/vendor-portal/orders', '/vendor-portal/pos'] },
  { id: 'vendor-portal-invoices', label: 'Submitted Invoices & Billings', canonicalPath: '/vendor-portal/invoices', section: 'DEDICATED VENDOR PORTAL', aliases: ['/vendor-portal/billing'] },
  { id: 'vendor-portal-attendance-recon', label: 'Attendance & OT Reconciliation', canonicalPath: '/vendor-portal/attendance-recon', section: 'DEDICATED VENDOR PORTAL', aliases: ['/vendor-portal/recon'] },
  { id: 'vendor-portal-attendance', label: 'Daily Biometrics & Shifts', canonicalPath: '/vendor-portal/attendance', section: 'DEDICATED VENDOR PORTAL', aliases: [] },
  { id: 'vendor-portal-workforce', label: 'Workforce Nominations', canonicalPath: '/vendor-portal/workforce', section: 'DEDICATED VENDOR PORTAL', aliases: ['/vendor-portal/employees'] },
  { id: 'vendor-portal-company', label: 'Vendor Company Profile', canonicalPath: '/vendor-portal/company', section: 'DEDICATED VENDOR PORTAL', aliases: ['/vendor-portal/profile'] },
  { id: 'vendor-portal-compliance', label: 'Document Vault & KYC', canonicalPath: '/vendor-portal/compliance', section: 'DEDICATED VENDOR PORTAL', aliases: ['/vendor-portal/documents', '/vendor-portal/vault'] },
  { id: 'vendor-portal-leaderboard', label: 'Vendor Performance Analytics', canonicalPath: '/vendor-portal/leaderboard', section: 'DEDICATED VENDOR PORTAL', aliases: [] },
  { id: 'vendor-portal-communication', label: 'Vendor Support Desk', canonicalPath: '/vendor-portal/communication', section: 'DEDICATED VENDOR PORTAL', aliases: [] },
  { id: 'vendor-portal-reports', label: 'Vendor Audit & Reports', canonicalPath: '/vendor-portal/reports', section: 'DEDICATED VENDOR PORTAL', aliases: [] },

  // ── RECRUITMENT & ATS ──
  { id: 'recruitment', label: 'Recruitment Dashboard', canonicalPath: '/recruitment', section: 'RECRUITMENT & ATS', aliases: ['/recruitment-dashboard'] },
  { id: 'recruitment-requisitions', label: 'Requisitions', canonicalPath: '/recruitment/requisitions', section: 'RECRUITMENT & ATS' },
  { id: 'recruitment-jobs', label: 'Job Openings', canonicalPath: '/recruitment/jobs', section: 'RECRUITMENT & ATS' },
  { id: 'recruitment-applicants', label: 'Applicants', canonicalPath: '/recruitment/applicants', section: 'RECRUITMENT & ATS' },
  { id: 'recruitment-interviews', label: 'Interviews', canonicalPath: '/recruitment/interviews', section: 'RECRUITMENT & ATS' },
  { id: 'recruitment-offers', label: 'Offers', canonicalPath: '/recruitment/offers', section: 'RECRUITMENT & ATS' },
  { id: 'recruitment-referrals', label: 'Referrals', canonicalPath: '/recruitment/referrals', section: 'RECRUITMENT & ATS' },
  { id: 'recruitment-talent-pool', label: 'Talent Pool', canonicalPath: '/recruitment/talent-pool', section: 'RECRUITMENT & ATS' },
  { id: 'recruitment-analytics', label: 'Recruitment Analytics', canonicalPath: '/recruitment/analytics', section: 'RECRUITMENT & ATS' },
  { id: 'recruitment-automation', label: 'Recruitment Automation', canonicalPath: '/recruitment/automation', section: 'RECRUITMENT & ATS' },
  { id: 'career-dev', label: 'Career Development', canonicalPath: '/career-dev', section: 'RECRUITMENT & ATS' },

  // ── CORE ATTENDANCE ──
  { id: 'attendance', label: 'Attendance Dashboard', canonicalPath: '/attendance', section: 'CORE ATTENDANCE', aliases: ['/attendance-dashboard'], exact: true },
  { id: 'attendance-employees', label: 'Employee Attendance', canonicalPath: '/attendance/employees', section: 'CORE ATTENDANCE', aliases: ['/attendance-employees', '/employee-attendance'] },
  { id: 'history', label: 'Attendance History & Ledger', canonicalPath: '/attendance/history', section: 'CORE ATTENDANCE', aliases: ['/attendance-history', '/ledger'] },
  { id: 'late-early', label: 'Late / Early Tracking', canonicalPath: '/attendance/late-early', section: 'CORE ATTENDANCE', aliases: ['/late-early'] },
  { id: 'regularization', label: 'Regularization Desk', canonicalPath: '/attendance/regularization', section: 'CORE ATTENDANCE', aliases: ['/regularization'] },
  { id: 'exceptions', label: 'Exceptions Queue', canonicalPath: '/attendance/exceptions', section: 'CORE ATTENDANCE', aliases: ['/exceptions'] },

  // ── LEAVE ──
  { id: 'leave', label: 'Leave Management', canonicalPath: '/leave', section: 'LEAVE', aliases: ['/leave-dashboard'] },

  // ── WORK & OVERTIME ──
  { id: 'overtime', label: 'Overtime Engine', canonicalPath: '/overtime', section: 'WORK & OVERTIME', aliases: ['/work-overtime'] },
  { id: 'overtime-requests', label: 'Overtime Requests', canonicalPath: '/overtime/requests', section: 'WORK & OVERTIME', aliases: ['/overtime-requests'] },
  { id: 'wfh', label: 'WFH Requests', canonicalPath: '/wfh', section: 'WORK & OVERTIME' },
  { id: 'breaks-workhours', label: 'Breaks & Work Hours', canonicalPath: '/breaks', section: 'WORK & OVERTIME', aliases: ['/breaks-workhours'] },

  // ── SHIFT & SCHEDULING ──
  { id: 'shifts', label: 'Shift Master', canonicalPath: '/shifts', section: 'SHIFT & SCHEDULING', aliases: ['/shift-master', '/shifts/master'], exact: true },
  { id: 'roster', label: 'Shift Roster & Matrix', canonicalPath: '/shifts/roster', section: 'SHIFT & SCHEDULING', aliases: ['/roster', '/shift-roster'] },
  { id: 'shift-calendar', label: 'Shift Calendar', canonicalPath: '/shifts/calendar', section: 'SHIFT & SCHEDULING', aliases: ['/shift-calendar'] },
  { id: 'policies', label: 'Attendance Policies', canonicalPath: '/policies', section: 'SHIFT & SCHEDULING', aliases: ['/attendance-policies', '/shifts/policies'] },

  // ── CLOCKING & DEVICES ──
  { id: 'biometric', label: 'Biometric Devices', canonicalPath: '/biometric', section: 'CLOCKING & DEVICES', aliases: ['/biometric/devices', '/biometric-devices'], exact: true },
  { id: 'attendance-rules', label: 'Biometric Rules & Automation', canonicalPath: '/biometric/rules', section: 'CLOCKING & DEVICES', aliases: ['/attendance-rules', '/biometric-rules', '/rules-engine'] },
  { id: 'gps', label: 'GPS & Mobile Channel', canonicalPath: '/biometric/gps', section: 'CLOCKING & DEVICES', aliases: ['/gps', '/gps-attendance'] },
  { id: 'face-attendance', label: 'Face Recognition', canonicalPath: '/biometric/face', section: 'CLOCKING & DEVICES', aliases: ['/face-attendance', '/face-recognition'] },
  { id: 'geofences', label: 'Geofence Boundaries', canonicalPath: '/biometric/geofences', section: 'CLOCKING & DEVICES', aliases: ['/geofences'] },

  // ── AUDIT & CONTROL ──
  { id: 'calculation-audit', label: 'Ledger & Audits', canonicalPath: '/audit/ledger', section: 'AUDIT & CONTROL', aliases: ['/calculation-audit'] },
  { id: 'attendance-corrections', label: 'Attendance Corrections', canonicalPath: '/audit/corrections', section: 'AUDIT & CONTROL', aliases: ['/attendance-corrections'] },
  { id: 'approval-history', label: 'Approval History', canonicalPath: '/audit/approvals', section: 'AUDIT & CONTROL', aliases: ['/approval-history'] },
  { id: 'attendance-activity-logs', label: 'System Activity Logs', canonicalPath: '/audit/activity', section: 'AUDIT & CONTROL', aliases: ['/attendance-activity-logs'] },
  { id: 'realtime-health', label: 'Realtime Sync Health', canonicalPath: '/audit/sync-health', section: 'AUDIT & CONTROL', aliases: ['/realtime-health', '/admin-realtime-health'] },

  // ── PAYROLL ──
  { id: 'payroll-dashboard', label: 'Payroll Dashboard', canonicalPath: '/payroll', section: 'PAYROLL', aliases: ['/payroll-dashboard'], exact: true },
  { id: 'client-billing', label: 'Client Wage Billing & Invoicing', canonicalPath: '/client-billing', section: 'VENDOR & CLIENT BILLING', aliases: ['/payroll/billing', '/payroll-billing', '/billing', '/invoicing', '/client-invoicing', '/billing-runs'] },
  { id: 'payroll-settings', label: 'Payroll Settings', canonicalPath: '/payroll/settings', section: 'PAYROLL', aliases: ['/payroll-settings'] },
  { id: 'payroll-statutory', label: 'Statutory & Tax Rules', canonicalPath: '/payroll/statutory', section: 'PAYROLL', aliases: ['/payroll-statutory'] },
  { id: 'payroll-salary', label: 'Salary Structures & Staff', canonicalPath: '/payroll/salary-structures', section: 'PAYROLL', aliases: ['/payroll-salary', '/payroll/salary'] },
  { id: 'payroll-earnings', label: 'Earnings & Overtime', canonicalPath: '/payroll/earnings', section: 'PAYROLL', aliases: ['/payroll-earnings'] },
  { id: 'payroll-deductions', label: 'Deductions, Loans & LOP', canonicalPath: '/payroll/deductions', section: 'PAYROLL', aliases: ['/payroll-deductions'] },
  { id: 'payroll-claims', label: 'Expense Claims & Approvals', canonicalPath: '/payroll/claims', section: 'PAYROLL', aliases: ['/payroll-claims', '/payroll/expenses'] },
  { id: 'payroll-processing', label: 'Payroll Processing & Runs', canonicalPath: '/payroll/runs', section: 'PAYROLL', aliases: ['/payroll-processing', '/payroll/processing'] },
  { id: 'payroll-disbursement', label: 'Bank Disbursement', canonicalPath: '/payroll/bank', section: 'PAYROLL', aliases: ['/payroll-disbursement', '/payroll/disbursement'] },
  { id: 'payroll-reports', label: 'Payroll Reports & ECR', canonicalPath: '/payroll/reports', section: 'PAYROLL', aliases: ['/payroll-reports'] },
  { id: 'payroll-documents', label: 'Digital Payslips & Docs', canonicalPath: '/payroll/payslips', section: 'PAYROLL', aliases: ['/payroll-documents', '/payroll/documents'] },
  { id: 'payroll-fnf', label: 'Full & Final (F&F)', canonicalPath: '/payroll/fnf', section: 'PAYROLL', aliases: ['/payroll-fnf'] },

  // ── VENDOR & PROCUREMENT GOVERNANCE ──
  { id: 'vendor-portal', label: 'Vendor Governance Overview', canonicalPath: '/vendor-portal', section: 'VENDOR & PROCUREMENT GOVERNANCE', aliases: ['/vendor', '/vendor/portal', '/vendor-dashboard', '/vendor/dashboard'] },
  { id: 'vendor-directory', label: 'Vendor Master Directory', canonicalPath: '/vendor-directory', section: 'VENDOR & PROCUREMENT GOVERNANCE', aliases: ['/vendor/directory', '/vendors'] },
  { id: 'vendor-purchase-orders', label: 'Purchase Orders & Contracts', canonicalPath: '/vendor-purchase-orders', section: 'VENDOR & PROCUREMENT GOVERNANCE', aliases: ['/vendor/purchase-orders', '/vendor-pos', '/vendor/pos', '/purchase-orders'] },
  { id: 'vendor-invoices', label: 'Invoices & 3-Way Match', canonicalPath: '/vendor-invoices', section: 'VENDOR & PROCUREMENT GOVERNANCE', aliases: ['/vendor/invoices', '/invoices'] },
  { id: 'vendor-wages', label: 'Client Wage Billing & Invoicing', canonicalPath: '/vendor-wages', section: 'VENDOR & PROCUREMENT GOVERNANCE', aliases: ['/vendor/wages', '/vendors/wages', '/vendor-billing', '/vendors/billing', '/wage-engine', '/vendor-portal/wages', '/client-billing', '/payroll/billing', '/payroll-billing', '/billing-runs', '/client-wage-billing'] },
  { id: 'vendor-company', label: 'My Company Profile', canonicalPath: '/vendor-company', section: 'VENDOR & PROCUREMENT GOVERNANCE', aliases: ['/vendor/company'] },
  { id: 'vendor-workforce', label: 'Workforce Directory', canonicalPath: '/vendor-workforce', section: 'VENDOR & PROCUREMENT GOVERNANCE', aliases: ['/vendor/workforce'] },
  { id: 'vendor-attendance', label: 'Attendance & Overtime', canonicalPath: '/vendor-attendance', section: 'VENDOR & PROCUREMENT GOVERNANCE', aliases: ['/vendor/attendance'] },
  { id: 'vendor-compliance', label: 'Compliance Vault', canonicalPath: '/vendor-compliance', section: 'VENDOR & PROCUREMENT GOVERNANCE', aliases: ['/vendor/compliance'] },

  // ── PERFORMANCE ──
  { id: 'performance-dashboard', label: 'Performance Dashboard', canonicalPath: '/performance', section: 'PERFORMANCE', aliases: ['/performance-dashboard'], exact: true },
  { id: 'performance-goals', label: 'Goals', canonicalPath: '/performance/goals', section: 'PERFORMANCE', aliases: ['/performance-goals'] },
  { id: 'performance-okr', label: 'OKR Objectives', canonicalPath: '/performance/okr', section: 'PERFORMANCE', aliases: ['/performance-okr'] },
  { id: 'performance-kpi', label: 'KPI Library', canonicalPath: '/performance/kpi', section: 'PERFORMANCE', aliases: ['/performance-kpi'] },
  { id: 'performance-kra', label: 'KRA Framework', canonicalPath: '/performance/kra', section: 'PERFORMANCE', aliases: ['/performance-kra'] },
  { id: 'performance-cycles', label: 'Review Cycles', canonicalPath: '/performance/cycles', section: 'PERFORMANCE', aliases: ['/performance-cycles'] },
  { id: 'performance-reviews', label: 'Reviews & 360°', canonicalPath: '/performance/reviews', section: 'PERFORMANCE', aliases: ['/performance-reviews'] },
  { id: 'performance-ratings', label: 'Ratings & Calibration', canonicalPath: '/performance/ratings', section: 'PERFORMANCE', aliases: ['/performance-ratings'] },
  { id: 'performance-development', label: 'Development Plans', canonicalPath: '/performance/development', section: 'PERFORMANCE', aliases: ['/performance-development'] },
  { id: 'performance-promotion', label: 'Promotions', canonicalPath: '/performance/promotion', section: 'PERFORMANCE', aliases: ['/performance-promotion'] },
  { id: 'performance-pip', label: 'PIP Engine', canonicalPath: '/performance/pip', section: 'PERFORMANCE', aliases: ['/performance-pip'] },
  { id: 'performance-reports', label: 'Performance Reports', canonicalPath: '/performance/reports', section: 'PERFORMANCE', aliases: ['/performance-reports'] },

  // ── LEARNING & DEVELOPMENT ──
  { id: 'lms-dashboard', label: 'Learning Dashboard', canonicalPath: '/lms', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-dashboard'], exact: true },
  { id: 'lms-courses', label: 'Courses & Player', canonicalPath: '/lms/courses', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-courses'] },
  { id: 'lms-programs', label: 'Training Programs', canonicalPath: '/lms/programs', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-programs'] },
  { id: 'lms-calendar', label: 'Training Calendar', canonicalPath: '/lms/calendar', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-calendar'] },
  { id: 'lms-enrollment', label: 'Enrollments', canonicalPath: '/lms/enrollments', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-enrollment'] },
  { id: 'lms-trainers', label: 'Trainers & Vendors', canonicalPath: '/lms/trainers', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-trainers'] },
  { id: 'lms-assessments', label: 'Assessments & Exams', canonicalPath: '/lms/assessments', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-assessments'] },
  { id: 'lms-certifications', label: 'Certifications & Expiry', canonicalPath: '/lms/certifications', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-certifications'] },
  { id: 'lms-mandatory', label: 'Mandatory Compliance', canonicalPath: '/lms/mandatory', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-mandatory'] },
  { id: 'lms-skills', label: 'Skill Gap & Paths', canonicalPath: '/lms/skills', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-skills'] },
  { id: 'lms-feedback', label: 'Feedback & Ratings', canonicalPath: '/lms/feedback', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-feedback'] },
  { id: 'lms-reports', label: 'LMS Reports', canonicalPath: '/lms/reports', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-reports'] },
  { id: 'lms-settings', label: 'LMS Settings', canonicalPath: '/lms/settings', section: 'LEARNING & DEVELOPMENT', aliases: ['/lms-settings'] },

  // ── EMPLOYEE RELATIONS ──
  { id: 'engagement', label: 'Engagement & Surveys', canonicalPath: '/employee-relations/engagement', section: 'EMPLOYEE RELATIONS', aliases: ['/engagement'] },
  { id: 'grievances', label: 'Grievance Desk', canonicalPath: '/employee-relations/grievance', section: 'EMPLOYEE RELATIONS', aliases: ['/grievances'] },
  { id: 'discipline', label: 'Disciplinary Actions', canonicalPath: '/employee-relations/discipline', section: 'EMPLOYEE RELATIONS', aliases: ['/discipline'] },
  { id: 'posh', label: 'POSH Committee', canonicalPath: '/employee-relations/posh', section: 'EMPLOYEE RELATIONS', aliases: ['/posh'] },
  { id: 'compliance', label: 'Statutory Compliance', canonicalPath: '/employee-relations/compliance', section: 'EMPLOYEE RELATIONS', aliases: ['/compliance'] },

  // ── TRAVEL & EXPENSE ──
  { id: 'other-travel', label: 'Travel & Expense Management', canonicalPath: '/travel', section: 'TRAVEL & EXPENSE', aliases: ['/other-travel'] },

  // ── COMMUNICATION & HELP ──
  { id: 'other-communication', label: 'HR Communications', canonicalPath: '/communication', section: 'COMMUNICATION & HELP', aliases: ['/other-communication'] },
  { id: 'helpdesk', label: 'Help Desk', canonicalPath: '/helpdesk', section: 'COMMUNICATION & HELP' },
  { id: 'knowledge', label: 'Knowledge Centre', canonicalPath: '/knowledge', section: 'COMMUNICATION & HELP' },

  // ── ANALYTICS & REPORTS ──
  { id: 'analytics-overview', label: 'Analytics Overview', canonicalPath: '/analytics', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-overview'], exact: true },
  { id: 'analytics-hr', label: 'HR Dashboard', canonicalPath: '/analytics/hr', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-hr'] },
  { id: 'analytics-ceo', label: 'CEO Dashboard', canonicalPath: '/analytics/ceo', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-ceo'] },
  { id: 'analytics-finance', label: 'Finance Dashboard', canonicalPath: '/analytics/finance', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-finance'] },
  { id: 'analytics-recruitment', label: 'Recruitment Analytics', canonicalPath: '/analytics/recruitment', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-recruitment'] },
  { id: 'analytics-attendance', label: 'Attendance Analytics', canonicalPath: '/analytics/attendance', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-attendance'] },
  { id: 'analytics-leave', label: 'Leave Analytics', canonicalPath: '/analytics/leave', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-leave'] },
  { id: 'analytics-payroll', label: 'Payroll Analytics', canonicalPath: '/analytics/payroll', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-payroll'] },
  { id: 'analytics-performance', label: 'Performance Analytics', canonicalPath: '/analytics/performance', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-performance'] },
  { id: 'analytics-training', label: 'Training Analytics', canonicalPath: '/analytics/training', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-training'] },
  { id: 'analytics-attrition', label: 'Attrition Analytics', canonicalPath: '/analytics/attrition', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-attrition'] },
  { id: 'analytics-workforce', label: 'Workforce Analytics', canonicalPath: '/analytics/workforce', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-workforce'] },
  { id: 'analytics-cost', label: 'Cost Analytics', canonicalPath: '/analytics/cost', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-cost'] },
  { id: 'analytics-reports', label: 'Custom Reports & Builder', canonicalPath: '/analytics/reports', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-reports'] },
  { id: 'analytics-settings', label: 'Analytics Settings', canonicalPath: '/analytics/settings', section: 'ANALYTICS & REPORTS', aliases: ['/analytics-settings'] },

  // ── AUTOMATION & ADMIN ──
  { id: 'admin-roles', label: 'Role Management', canonicalPath: '/admin/roles', section: 'AUTOMATION & ADMIN', aliases: ['/roles', '/rbac', '/admin-roles'] },
  { id: 'notifications', label: 'Notifications & Alerts', canonicalPath: '/notifications', section: 'AUTOMATION & ADMIN' },
  { id: 'admin-notifications', label: 'Notification Settings', canonicalPath: '/admin/notifications', section: 'AUTOMATION & ADMIN', aliases: ['/admin-notifications'] },
  { id: 'company-onboarding', label: 'Company Setup Wizard', canonicalPath: '/company-onboarding', section: 'AUTOMATION & ADMIN' },
  { id: 'trust-legal', label: 'Trust & Legal Center', canonicalPath: '/legal', section: 'AUTOMATION & ADMIN', aliases: ['/trust-legal', '/legal-center'] },

  // ── PLATFORM & SAAS CONTROL PLANE ──
  { id: 'platform-dashboard', label: 'Platform Command Center', canonicalPath: '/platform/dashboard', section: 'PLATFORM', aliases: ['/platform', '/platform-dashboard', '/platform/dashboard'] },
  { id: 'platform-tenants', label: 'Organizations & Tenants', canonicalPath: '/platform/tenants', section: 'PLATFORM', aliases: ['/platform-tenants', '/platform/organizations'] },
  { id: 'platform-tenant-health', label: 'Tenant Health', canonicalPath: '/platform/health', section: 'PLATFORM', aliases: ['/platform-tenant-health', '/platform/health', '/platform/tenant-health'] },
  { id: 'saas-revenue', label: 'Revenue & Growth', canonicalPath: '/platform/revenue', section: 'PLATFORM', aliases: ['/platform-revenue', '/platform/revenue', '/saas-revenue'] },
  { id: 'platform-quotations', label: 'Commercial Quotations', canonicalPath: '/platform/quotations', section: 'PLATFORM', aliases: ['/platform-quotations', '/quotations', '/saas-quotations'] },
  { id: 'platform-subscriptions', label: 'Subscriptions', canonicalPath: '/platform/subscriptions', section: 'PLATFORM', aliases: ['/platform-subscriptions', '/platform/subscriptions'] },
  { id: 'platform-invoices', label: 'SaaS Invoices & Billing', canonicalPath: '/platform/invoices', section: 'PLATFORM', aliases: ['/platform-invoices', '/platform/billing', '/platform-billing', '/saas-invoices'] },
  { id: 'platform-plans', label: 'Plans & Pricing', canonicalPath: '/platform/plans', section: 'PLATFORM', aliases: ['/platform-plans', '/platform/pricing', '/platform-pricing'] },
  { id: 'platform-addons', label: 'Add-ons Catalogue', canonicalPath: '/platform/addons', section: 'PLATFORM', aliases: ['/platform-addons', '/saas-addons'] },
  { id: 'platform-pricing-calculator', label: 'Pricing Calculator', canonicalPath: '/platform/pricing-calculator', section: 'PLATFORM', aliases: ['/platform-pricing-calculator', '/pricing-calculator'] },
  { id: 'platform-catalogue', label: 'SaaS Feature Catalogue', canonicalPath: '/platform/catalogue', section: 'PLATFORM', aliases: ['/platform-catalogue', '/platform/feature-catalogue', '/platform-feature-catalogue', '/product-catalogue'] },
  { id: 'platform-features', label: 'Engineering Feature Flags', canonicalPath: '/platform/features', section: 'PLATFORM', aliases: ['/platform-features', '/platform/flags', '/platform-flags'] },
  { id: 'platform-usage', label: 'Usage & Metering', canonicalPath: '/platform/usage', section: 'PLATFORM', aliases: ['/platform-usage', '/platform/metering'] },
  { id: 'platform-security', label: 'Security Center', canonicalPath: '/platform/security', section: 'PLATFORM', aliases: ['/platform-security'] },
  { id: 'platform-sessions', label: 'Active Sessions', canonicalPath: '/platform/sessions', section: 'PLATFORM', aliases: ['/platform-sessions'] },
  { id: 'platform-audit', label: 'Audit Log', canonicalPath: '/platform/audit', section: 'PLATFORM', aliases: ['/platform-audit'] },
  { id: 'platform-staff', label: 'Platform Staff & IAM', canonicalPath: '/platform/staff', section: 'PLATFORM', aliases: ['/platform-staff'] },
  { id: 'platform-incidents', label: 'Incidents', canonicalPath: '/platform/incidents', section: 'PLATFORM', aliases: ['/platform-incidents'] },
];

/**
 * Normalizes any route string:
 * - strips leading/trailing whitespace
 * - ensures lowercase
 * - strips trailing slashes (except root '/')
 * - ensures leading '/'
 */
export function normalizePath(path: string): string {
  if (!path) return '/';
  let cleaned = path.trim().toLowerCase();
  // Ensure starts with /
  if (!cleaned.startsWith('/')) {
    cleaned = `/${cleaned}`;
  }
  // Replace multiple slashes with single slash
  cleaned = cleaned.replace(/\/+/g, '/');
  // Strip trailing slash if not root
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

/**
 * Finds RouteDefinition by internal itemId, canonicalPath, or alias
 */
export function findRouteDefinition(query: string): RouteDefinition | undefined {
  if (!query) return undefined;
  const normalized = normalizePath(query);
  const cleanKey = query.replace(/^\//, '').toLowerCase();

  // 1. Direct ID match
  let found = ROUTE_MANIFEST.find(r => r.id.toLowerCase() === cleanKey);
  if (found) return found;

  // 2. Canonical Path match
  found = ROUTE_MANIFEST.find(r => normalizePath(r.canonicalPath) === normalized);
  if (found) return found;

  // 3. Alias match
  found = ROUTE_MANIFEST.find(r =>
    r.aliases?.some(alias => normalizePath(alias) === normalized || alias.replace(/^\//, '').toLowerCase() === cleanKey)
  );
  if (found) return found;

  return undefined;
}

/**
 * Resolves any route ID, legacy URL, or alias into its canonical path
 */
export function canonicalizeRoute(pathOrId: string): string {
  if (!pathOrId) return '/dashboard';
  const def = findRouteDefinition(pathOrId);
  if (def) return def.canonicalPath;
  return normalizePath(pathOrId);
}

/**
 * Resolves any canonical path, legacy URL, or alias into internal route ID
 */
export function resolveRouteId(pathOrSlug: string): string {
  if (!pathOrSlug) return 'dashboard';
  const def = findRouteDefinition(pathOrSlug);
  if (def) return def.id;
  return pathOrSlug.replace(/^\//, '');
}

/**
 * Checks if a target path matches current path.
 * Avoids false positives like '/payroll' matching '/payroll-settings'.
 */
export function matchRoute(currentPath: string, targetPath: string, exact: boolean = false): boolean {
  const normCurrent = normalizePath(currentPath);
  const normTarget = normalizePath(targetPath);

  if (normCurrent === normTarget) return true;
  if (exact) return false;

  // Ensure path boundaries: '/payroll' must match '/payroll/statutory' but NEVER '/payroll-statutory'
  if (normCurrent.startsWith(`${normTarget}/`)) {
    return true;
  }

  return false;
}

/**
 * Robust active route matcher for sidebar items.
 * Evaluates both internal ID mapping and canonical URL prefixes.
 */
export function isActiveRoute(itemId: string, currentNavOrPath: string): boolean {
  if (!itemId || !currentNavOrPath) return false;

  const currentDef = findRouteDefinition(currentNavOrPath);
  const itemDef = findRouteDefinition(itemId);

  // 1. Exact ID equality
  if (itemId === currentNavOrPath) return true;

  // 2. Both map to same RouteDefinition
  if (currentDef && itemDef && currentDef.id === itemDef.id) return true;

  // 3. Compare canonical paths
  if (itemDef) {
    const normCurrent = normalizePath(currentDef ? currentDef.canonicalPath : currentNavOrPath);
    const normTarget = normalizePath(itemDef.canonicalPath);

    if (itemDef.exact) {
      return normCurrent === normTarget;
    }

    if (normCurrent === normTarget) return true;
    if (!currentDef || currentDef.id === itemDef.id) {
      if (normCurrent.startsWith(`${normTarget}/`)) return true;
    }
  }

  // 4. Legacy and sub-navigation mappings
  if (itemId === 'attendance' && (currentNavOrPath === 'attendance' || currentNavOrPath === 'attendance-dashboard' || currentNavOrPath === '/attendance')) return true;
  if (itemId === 'payroll-dashboard' && (currentNavOrPath === 'payroll' || currentNavOrPath === 'payroll-dashboard' || currentNavOrPath === '/payroll')) return true;
  if (itemId === 'performance-dashboard' && (currentNavOrPath === 'performance' || currentNavOrPath === 'performance-dashboard' || currentNavOrPath === '/performance')) return true;
  if (itemId === 'lms-dashboard' && (currentNavOrPath === 'lms' || currentNavOrPath === 'lms-dashboard' || currentNavOrPath === '/lms')) return true;
  if (itemId === 'analytics-overview' && (currentNavOrPath === 'analytics' || currentNavOrPath === 'analytics-overview' || currentNavOrPath === '/analytics')) return true;

  return false;
}

/**
 * Checks if a parent navigation group has an active item.
 */
export function isGroupActive(groupName: string, items: { id: string }[], currentNavOrPath: string): boolean {
  return items.some(item => isActiveRoute(item.id, currentNavOrPath));
}

/**
 * Consolidates navigation state resolution into a single pure utility
 */
export function getNavigationState(
  currentNavOrPath: string,
  groups: { groupName: string; items: { id: string }[] }[]
): {
  activeItemId: string | null;
  activeSectionId: string | null;
  expandedSectionIds: string[];
} {
  let activeItemId: string | null = null;
  let activeSectionId: string | null = null;
  const expandedSectionIds: string[] = [];

  for (const group of groups) {
    const isGroupActiveState = group.items.some(item => {
      const active = isActiveRoute(item.id, currentNavOrPath);
      if (active && !activeItemId) {
        activeItemId = item.id;
      }
      return active;
    });

    if (isGroupActiveState) {
      activeSectionId = group.groupName;
      if (!expandedSectionIds.includes(group.groupName)) {
        expandedSectionIds.push(group.groupName);
      }
    }
  }

  return { activeItemId, activeSectionId, expandedSectionIds };
}
