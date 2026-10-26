// src/services/platform/moduleRegistryService.ts
// ============================================================================
// Joy PeopleHR — Centralized Enterprise Module Registry & Lifecycle Service
// Master Authority for Feature Entitlement, Route Guards, and Launch Scope Control
// Target Production Launch: September 26, 2026
// ============================================================================

import {
  ModuleRegistryItem,
  ModuleLifecycleStatus,
  ModuleStatusAuditEntry,
  LaunchScopeMetrics,
} from '../../types/moduleRegistry';
import { hrEventBus } from '../hrEventBus';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

const STORAGE_KEY_MODULES = 'workforce_module_registry_v6';
const STORAGE_KEY_AUDIT = 'workforce_module_registry_audit_v6';

/**
 * CANONICAL MASTER INVENTORY OF ALL JOY PEOPLEHR DOMAINS & MODULES
 */
export const CANONICAL_MODULES: ModuleRegistryItem[] = [
  // ─── 0. CORE DASHBOARDS & WORKFORCE INTELLIGENCE (LIVE LAUNCH CRITICAL) ─
  {
    module_key: 'workforce_executive_dashboards',
    module_name: 'Workforce & Executive HR Intelligence',
    category: 'CORE_HR',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Starter',
    required_permissions: ['dashboard.view', 'employees.view'],
    dependencies: [],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'Enterprise real-time workforce intelligence and executive strategic HR analytics dashboards.',
    associated_routes: ['workforce-overview', 'executive-overview', 'dashboard', 'my-workspace'],
    associated_nav_ids: ['workforce-overview', 'executive-overview', 'dashboard', 'my-workspace'],
  },

  // ─── 1. CORE HR & EMPLOYEE LIFECYCLE (LAUNCH CRITICAL) ───────────────
  {
    module_key: 'people',
    module_name: 'People Core & Employee Lifecycle',
    category: 'CORE_HR',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Starter',
    required_permissions: ['employees.view'],
    dependencies: [],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'Gate 0 & Module 03 Certified. Authoritative owner of identity and lifecycle state machine.',
    associated_routes: ['people', 'employees', 'employee-detail', 'directory'],
    associated_nav_ids: ['people'],
  },
  {
    module_key: 'organization',
    module_name: 'Organization Architecture & Multi-Entity Structure',
    category: 'CORE_HR',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Starter',
    required_permissions: ['organization.manage'],
    dependencies: [],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'Authoritative database backing for Legal Entities, Branches, Org Chart, and Geofences.',
    associated_routes: ['organization', 'entities', 'branches', 'org-chart'],
    associated_nav_ids: ['organization'],
  },
  {
    module_key: 'onboarding',
    module_name: 'Onboarding & Candidate Conversion Engine',
    category: 'CORE_HR',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Professional',
    required_permissions: ['onboarding.manage'],
    dependencies: ['people', 'organization'],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'Production candidate pipeline with automated document collection and invite dispatch.',
    associated_routes: ['onboarding', 'onboarding-wizard'],
    associated_nav_ids: ['onboarding'],
  },
  {
    module_key: 'offboarding',
    module_name: 'Offboarding & Clearance Engine',
    category: 'CORE_HR',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Professional',
    required_permissions: ['offboarding.manage'],
    dependencies: ['people', 'organization'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'Module 02 Certified. 8-department clearance matrix, asset recovery, and FnF transition barrier.',
    associated_routes: ['offboarding', 'exit-management'],
    associated_nav_ids: ['offboarding'],
  },
  {
    module_key: 'documents',
    module_name: 'Document Engine & Digital Verification',
    category: 'CORE_HR',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Starter',
    required_permissions: ['documents.view'],
    dependencies: ['people'],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'HIGH_P1',
    completion_percentage: 100,
    development_notes: 'Verified statutory documents, letters, contracts, and digital signing.',
    associated_routes: ['documents', 'employee-documents'],
    associated_nav_ids: ['documents'],
  },
  {
    module_key: 'assets',
    module_name: 'Asset Master & Inventory Allocation',
    category: 'CORE_HR',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Professional',
    required_permissions: ['assets.view'],
    dependencies: ['people'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'HIGH_P1',
    completion_percentage: 100,
    development_notes: 'Enterprise hardware inventory, custodial handoffs, and return tracking during exit.',
    associated_routes: ['assets'],
    associated_nav_ids: ['assets'],
  },

  // ─── 2. ATTENDANCE, SHIFTS & BIOMETRICS (LAUNCH CRITICAL) ────────────
  {
    module_key: 'attendance',
    module_name: 'Attendance Engine & Biometric/GPS Integration',
    category: 'ATTENDANCE_LEAVE',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Starter',
    required_permissions: ['attendance.view'],
    dependencies: ['people'],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'Gate 1 Certified. Multi-channel punch reconciler, biometric edge agents, and geofence verification.',
    associated_routes: ['attendance', 'attendance-employees', 'history', 'late-early', 'regularization', 'exceptions', 'biometric', 'gps', 'face-attendance', 'geofences', 'calculation-audit', 'attendance-corrections', 'attendance-activity-logs'],
    associated_nav_ids: ['attendance', 'attendance-employees', 'history', 'late-early', 'regularization', 'exceptions', 'biometric', 'gps', 'face-attendance', 'geofences', 'calculation-audit', 'attendance-corrections', 'attendance-activity-logs'],
  },
  {
    module_key: 'leave',
    module_name: 'Leave Policy & Balance Ledger Engine',
    category: 'ATTENDANCE_LEAVE',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Starter',
    required_permissions: ['leave.view'],
    dependencies: ['people'],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'Module 01 Certified. Atomic ledger transactions, accrual rules, sandwich policy, and LOP proration.',
    associated_routes: ['leave', 'leave-requests', 'leave-balances', 'leave-policy', 'holiday-calendar'],
    associated_nav_ids: ['leave'],
  },
  {
    module_key: 'shifts',
    module_name: 'Shift Master & Roster Scheduling Matrix',
    category: 'ATTENDANCE_LEAVE',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Professional',
    required_permissions: ['attendance.manage_shifts'],
    dependencies: ['people', 'attendance'],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'HIGH_P1',
    completion_percentage: 100,
    development_notes: 'Shift rotation, overnight shifts, matrix assignment, and overtime policy enforcement.',
    associated_routes: ['shifts', 'roster', 'shift-calendar', 'policies', 'overtime', 'overtime-requests', 'wfh', 'breaks-workhours'],
    associated_nav_ids: ['shifts', 'roster', 'shift-calendar', 'policies', 'overtime', 'overtime-requests', 'wfh', 'breaks-workhours'],
  },

  // ─── 3. PAYROLL, STATUTORY & WAGE INVOICING (LAUNCH CRITICAL) ────────
  {
    module_key: 'payroll',
    module_name: 'Payroll Engine & Statutory Compliance OS',
    category: 'PAYROLL_FINANCE',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Business',
    required_permissions: ['payroll.view'],
    dependencies: ['people', 'attendance', 'leave'],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'Gate 2 & 2.5 Certified. Statutory PF/ESI/PT/TDS rules, locked run immutability, and bank export.',
    associated_routes: ['payroll-dashboard', 'payroll-settings', 'payroll-statutory', 'payroll-salary', 'payroll-earnings', 'payroll-deductions', 'payroll-claims', 'payroll-processing', 'payroll-reports', 'payroll-disbursement', 'payroll-documents'],
    associated_nav_ids: ['payroll-dashboard', 'payroll-settings', 'payroll-statutory', 'payroll-salary', 'payroll-earnings', 'payroll-deductions', 'payroll-claims', 'payroll-processing', 'payroll-reports', 'payroll-disbursement', 'payroll-documents'],
  },
  {
    module_key: 'fnf',
    module_name: 'Full & Final (F&F) Settlement Engine',
    category: 'PAYROLL_FINANCE',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Business',
    required_permissions: ['payroll.manage_runs'],
    dependencies: ['people', 'payroll', 'offboarding'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'Module 02 Certified. Gratuity (15/26 rule), notice period waiver, leave encashment, and settlement ledger.',
    associated_routes: ['payroll-fnf', 'fnf-settlement'],
    associated_nav_ids: ['payroll-fnf'],
  },
  {
    module_key: 'client_billing',
    module_name: 'Client Wage Billing & Manpower Invoicing',
    category: 'PAYROLL_FINANCE',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Enterprise',
    required_permissions: ['client_billing.manage'],
    dependencies: ['payroll'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'Client payroll OS for Joy Corporate Solutions: commercial contracts, margin billing, and multi-sheet exports.',
    associated_routes: ['client-billing', 'client-contracts', 'client-invoicing', 'billing-runs', 'vendor-wages', 'vendor/wages', 'wage-engine'],
    associated_nav_ids: ['client-billing', 'vendor-wages'],
  },

  // ─── 5. EMPLOYEE RELATIONS (LIVE) ───────────────────────────────────
  {
    module_key: 'employee_relations',
    module_name: 'Employee Relations & Statutory Compliance',
    category: 'EMPLOYEE_RELATIONS',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Starter',
    required_permissions: ['compliance.view'],
    dependencies: ['people'],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-09-08T05:30:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'HIGH_P1',
    completion_percentage: 92,
    development_notes: 'Grievance desk, POSH internal complaints committee, statutory returns, and HR broadcast communications.',
    associated_routes: ['engagement', 'grievances', 'discipline', 'posh', 'compliance', 'other-communication', 'helpdesk', 'knowledge'],
    associated_nav_ids: ['engagement', 'grievances', 'discipline', 'posh', 'compliance', 'other-communication', 'helpdesk', 'knowledge'],
  },

  // ══════════════════════════════════════════════════════════════════════
  // PAUSED MODULES (PRESERVED CODEBASE — INVISIBLE IN PRODUCTION HR PORTAL)
  // ══════════════════════════════════════════════════════════════════════

  // ─── PAUSED DOMAIN 01: ANALYTICS & REPORTS ───────────────────────────
  {
    module_key: 'analytics_core',
    module_name: 'Analytics, BI & Management Dashboards',
    category: 'ANALYTICS_INTELLIGENCE',
    status: 'PAUSED',
    launch_scope: false,
    launch_scope_category: 'POST_LAUNCH_PHASE_2',
    navigation_visible: false,
    route_accessible: false,
    required_plan: 'Starter',
    required_permissions: ['analytics.view'],
    dependencies: ['people', 'attendance', 'payroll'],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'POST_LAUNCH',
    planned_phase: 'Phase 2 (Q4 2026)',
    priority: 'HIGH_P1',
    completion_percentage: 85,
    development_notes: 'Scope frozen for September 26 launch stabilization. All charts, widgets, and metric engines safely preserved for Phase 2 release.',
    associated_routes: [
      'analytics', 'analytics-overview', 'analytics-hr', 'analytics-ceo',
      'analytics-finance', 'analytics-attendance', 'analytics-leave',
      'analytics-payroll', 'analytics-recruitment', 'analytics-performance',
      'analytics-training', 'analytics-attrition', 'analytics-workforce',
      'analytics-cost', 'analytics-reports', 'analytics-settings',
      'insights'
    ],
    associated_nav_ids: [
      'analytics', 'analytics-overview', 'analytics-hr', 'analytics-ceo',
      'analytics-finance', 'analytics-attendance', 'analytics-leave',
      'analytics-payroll', 'analytics-recruitment', 'analytics-performance',
      'analytics-training', 'analytics-attrition', 'analytics-workforce',
      'analytics-cost', 'analytics-reports', 'analytics-settings'
    ],
  },

  // ─── PAUSED DOMAIN 02: RECRUITMENT & ATS ─────────────────────────────
  {
    module_key: 'recruitment',
    module_name: 'Recruitment & Applicant Tracking System',
    category: 'TALENT_ACQUISITION',
    status: 'PAUSED',
    launch_scope: false,
    launch_scope_category: 'POST_LAUNCH_PHASE_2',
    navigation_visible: false,
    route_accessible: false,
    required_plan: 'Business',
    required_permissions: ['recruitment.view'],
    dependencies: ['people', 'organization'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'POST_LAUNCH',
    planned_phase: 'Phase 2 (Q4 2026)',
    priority: 'HIGH_P1',
    completion_percentage: 95,
    development_notes: 'Scope frozen for September 26 launch stabilization. Requisition approvals, candidate scoring, automated offer letters, interview scheduling, and career development safely preserved for Phase 2.',
    associated_routes: [
      'recruitment', 'career-dev', 'recruitment-dashboard', 'recruitment-requisitions',
      'recruitment-jobs', 'recruitment-applicants', 'recruitment-interviews',
      'recruitment-offers', 'recruitment-referrals', 'recruitment-talent-pool',
      'recruitment-analytics', 'recruitment-automation'
    ],
    associated_nav_ids: [
      'recruitment', 'career-dev', 'recruitment-dashboard', 'recruitment-requisitions',
      'recruitment-jobs', 'recruitment-applicants', 'recruitment-interviews',
      'recruitment-offers', 'recruitment-referrals', 'recruitment-talent-pool',
      'recruitment-analytics', 'recruitment-automation'
    ],
  },

  // ─── PAUSED DOMAIN 02: PERFORMANCE MANAGEMENT ───────────────────────
  {
    module_key: 'performance',
    module_name: 'Performance Management & OKR / KPI Engine',
    category: 'PERFORMANCE_GROWTH',
    status: 'PAUSED',
    launch_scope: false,
    launch_scope_category: 'POST_LAUNCH_PHASE_2',
    navigation_visible: false,
    route_accessible: false,
    required_plan: 'Enterprise',
    required_permissions: ['performance.manage'],
    dependencies: ['people', 'organization'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'POST_LAUNCH',
    planned_phase: 'Phase 2 (Q4 2026)',
    priority: 'HIGH_P1',
    completion_percentage: 70,
    development_notes: 'Scope frozen for September 26 launch stabilization. All components, hooks, and schemas safely preserved.',
    associated_routes: [
      'performance-dashboard', 'performance-goals', 'performance-okr',
      'performance-kpi', 'performance-kra', 'performance-cycles',
      'performance-reviews', 'performance-ratings', 'performance-development',
      'performance-promotion', 'performance-pip', 'performance-reports'
    ],
    associated_nav_ids: [
      'performance-dashboard', 'performance-goals', 'performance-okr',
      'performance-kpi', 'performance-kra', 'performance-cycles',
      'performance-reviews', 'performance-ratings', 'performance-development',
      'performance-promotion', 'performance-pip', 'performance-reports'
    ],
  },

  // ─── DOMAIN: LEARNING & DEVELOPMENT (LMS) ───────────────────────────
  {
    module_key: 'lms',
    module_name: 'Learning & Development (LMS) Engine',
    category: 'LEARNING_DEVELOPMENT',
    status: 'LIVE',
    launch_scope: true,
    launch_scope_category: 'LAUNCH_CRITICAL',
    navigation_visible: true,
    route_accessible: true,
    required_plan: 'Starter',
    required_permissions: ['lms.manage', 'lms.view'],
    dependencies: [],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'LAUNCH_CERTIFIED',
    last_certified_at: '2026-10-26T10:00:00Z',
    planned_phase: 'Phase 1 (Launch)',
    priority: 'CRITICAL_P0',
    completion_percentage: 100,
    development_notes: 'YouTube Video Publishing, Employee Watching, Anti-Skip Enforcement, MCQ Assessment & Pass/Fail Constraints, Real-Time HR Tracking & Mobile Push Reminders.',
    associated_routes: [
      'lms', 'lms-dashboard', 'lms-courses', 'lms-programs', 'lms-calendar',
      'lms-enrollment', 'lms-trainers', 'lms-assessments', 'lms-certifications',
      'lms-mandatory', 'lms-skills', 'lms-feedback', 'lms-reports', 'lms-settings',
      'ess-learning', 'tl-training'
    ],
    associated_nav_ids: [
      'lms', 'lms-dashboard', 'lms-courses', 'lms-programs', 'lms-calendar',
      'lms-enrollment', 'lms-trainers', 'lms-assessments', 'lms-certifications',
      'lms-mandatory', 'lms-skills', 'lms-feedback', 'lms-reports', 'lms-settings',
      'ess-learning', 'tl-training'
    ],
  },

  // ─── PAUSED DOMAIN 04: TRAVEL & EXPENSE MANAGEMENT ───────────────────
  {
    module_key: 'travel_expense',
    module_name: 'Travel Desk & Expense Claims Engine',
    category: 'EXPENSE_TRAVEL',
    status: 'PAUSED',
    launch_scope: false,
    launch_scope_category: 'POST_LAUNCH_PHASE_4',
    navigation_visible: false,
    route_accessible: false,
    required_plan: 'Professional',
    required_permissions: ['travel.manage'],
    dependencies: ['people', 'payroll'],
    web_enabled: true,
    mobile_enabled: true,
    certification_status: 'POST_LAUNCH',
    planned_phase: 'Phase 4 (Q2 2027)',
    priority: 'LOW_P3',
    completion_percentage: 60,
    development_notes: 'Scope frozen for September 26 launch. Code and API schemas preserved.',
    associated_routes: ['other-travel', 'travel', 'travel-desk'],
    associated_nav_ids: ['other-travel'],
  },

  // ─── PAUSED DEPENDENT ANALYTICS PAGES ──────────────────────────────
  {
    module_key: 'analytics_recruitment',
    module_name: 'Recruitment & ATS Analytics',
    category: 'ANALYTICS_INTELLIGENCE',
    status: 'PAUSED',
    launch_scope: false,
    launch_scope_category: 'POST_LAUNCH_PHASE_2',
    navigation_visible: false,
    route_accessible: false,
    required_plan: 'Business',
    required_permissions: ['analytics.view'],
    dependencies: ['recruitment'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'POST_LAUNCH',
    planned_phase: 'Phase 2 (Q4 2026)',
    priority: 'HIGH_P1',
    completion_percentage: 50,
    development_notes: 'Auto-paused due to dependency on Recruitment & ATS.',
    associated_routes: ['analytics-recruitment'],
    associated_nav_ids: ['analytics-recruitment'],
  },
  {
    module_key: 'analytics_performance',
    module_name: 'Performance Analytics Dashboard',
    category: 'ANALYTICS_INTELLIGENCE',
    status: 'PAUSED',
    launch_scope: false,
    launch_scope_category: 'POST_LAUNCH_PHASE_2',
    navigation_visible: false,
    route_accessible: false,
    required_plan: 'Enterprise',
    required_permissions: ['analytics.view'],
    dependencies: ['performance'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'POST_LAUNCH',
    planned_phase: 'Phase 2 (Q4 2026)',
    priority: 'HIGH_P1',
    completion_percentage: 40,
    development_notes: 'Auto-paused due to dependency on Performance Management.',
    associated_routes: ['analytics-performance'],
    associated_nav_ids: ['analytics-performance'],
  },
  {
    module_key: 'analytics_training',
    module_name: 'Training & LMS Analytics',
    category: 'ANALYTICS_INTELLIGENCE',
    status: 'PAUSED',
    launch_scope: false,
    launch_scope_category: 'POST_LAUNCH_PHASE_3',
    navigation_visible: false,
    route_accessible: false,
    required_plan: 'Enterprise',
    required_permissions: ['analytics.view'],
    dependencies: ['lms'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'POST_LAUNCH',
    planned_phase: 'Phase 3 (Q1 2027)',
    priority: 'MEDIUM_P2',
    completion_percentage: 40,
    development_notes: 'Auto-paused due to dependency on Learning & Development (LMS).',
    associated_routes: ['analytics-training'],
    associated_nav_ids: ['analytics-training'],
  },
  {
    module_key: 'analytics_attrition',
    module_name: 'AI Attrition & Flight Risk Predictive Engine',
    category: 'ANALYTICS_INTELLIGENCE',
    status: 'PAUSED',
    launch_scope: false,
    launch_scope_category: 'POST_LAUNCH_PHASE_2',
    navigation_visible: false,
    route_accessible: false,
    required_plan: 'Enterprise',
    required_permissions: ['analytics.view'],
    dependencies: ['people'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'POST_LAUNCH',
    planned_phase: 'Phase 2 (Q4 2026)',
    priority: 'MEDIUM_P2',
    completion_percentage: 50,
    development_notes: 'Deep ML modeling paused for launch stabilization.',
    associated_routes: ['analytics-attrition'],
    associated_nav_ids: ['analytics-attrition'],
  },
  {
    module_key: 'analytics_cost',
    module_name: 'Workforce Cost & Headcount Forecast Predictor',
    category: 'ANALYTICS_INTELLIGENCE',
    status: 'PAUSED',
    launch_scope: false,
    launch_scope_category: 'POST_LAUNCH_PHASE_3',
    navigation_visible: false,
    route_accessible: false,
    required_plan: 'Enterprise',
    required_permissions: ['analytics.view'],
    dependencies: ['payroll'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'POST_LAUNCH',
    planned_phase: 'Phase 3 (Q1 2027)',
    priority: 'MEDIUM_P2',
    completion_percentage: 45,
    development_notes: 'Advanced predictive modeling scheduled for post-launch.',
    associated_routes: ['analytics-cost'],
    associated_nav_ids: ['analytics-cost'],
  },
  {
    module_key: 'analytics_custom_reports',
    module_name: 'Custom Ad-Hoc Report Builder & Pivot Studio',
    category: 'ANALYTICS_INTELLIGENCE',
    status: 'PAUSED',
    launch_scope: false,
    launch_scope_category: 'POST_LAUNCH_PHASE_2',
    navigation_visible: false,
    route_accessible: false,
    required_plan: 'Business',
    required_permissions: ['analytics.manage'],
    dependencies: ['people', 'attendance', 'payroll'],
    web_enabled: true,
    mobile_enabled: false,
    certification_status: 'POST_LAUNCH',
    planned_phase: 'Phase 2 (Q4 2026)',
    priority: 'HIGH_P1',
    completion_percentage: 55,
    development_notes: 'Custom ad-hoc SQL builder deferred to post-launch release.',
    associated_routes: ['analytics-reports'],
    associated_nav_ids: ['analytics-reports'],
  },
];

class ModuleRegistryService {
  private modules: ModuleRegistryItem[] = [];
  private auditLogs: ModuleStatusAuditEntry[] = [];
  private initialized: boolean = false;

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedModules = localStorage.getItem(STORAGE_KEY_MODULES);
        const savedAudit = localStorage.getItem(STORAGE_KEY_AUDIT);

        if (savedModules) {
          const parsed = JSON.parse(savedModules);
          // Merge with canonical definitions to preserve schema updates
          this.modules = CANONICAL_MODULES.map((canon) => {
            const override = parsed.find((p: any) => p.module_key === canon.module_key);
            if (override) {
              return {
                ...canon,
                status: override.status,
                navigation_visible: override.navigation_visible,
                route_accessible: override.route_accessible,
                launch_scope: override.launch_scope,
                development_notes: override.development_notes || canon.development_notes,
                priority: override.priority || canon.priority,
                planned_phase: override.planned_phase || canon.planned_phase,
                completion_percentage: override.completion_percentage ?? canon.completion_percentage,
              };
            }
            return canon;
          });
        } else {
          this.modules = [...CANONICAL_MODULES];
        }

        if (savedAudit) {
          this.auditLogs = JSON.parse(savedAudit);
        }
      } else {
        this.modules = [...CANONICAL_MODULES];
      }
    } catch {
      this.modules = [...CANONICAL_MODULES];
    }
    this.initialized = true;
  }

  private persistState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_MODULES, JSON.stringify(this.modules));
        localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(this.auditLogs));
      }
    } catch (err) {
      console.error('[ModuleRegistryService] Storage error:', err);
    }
  }

  /**
   * Returns all registered modules.
   */
  getAllModules(): ModuleRegistryItem[] {
    if (!this.initialized) this.loadState();
    return [...this.modules];
  }

  /**
   * Returns a specific module by key.
   */
  getModule(moduleKey: string): ModuleRegistryItem | undefined {
    if (!this.initialized) this.loadState();
    return this.modules.find((m) => m.module_key === moduleKey);
  }

  /**
   * Returns whether a navigation item / group is visible in the production HR Portal.
   */
  isNavItemVisible(navId: string, role?: string): boolean {
    if (!this.initialized) this.loadState();

    const isPlatformStaffRole = ['Super Admin', 'Platform Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(role || '');

    // Internal Platform Portal navigation is strictly restricted to platform staff roles
    if (navId.startsWith('platform-') || navId.startsWith('saas-')) {
      return isPlatformStaffRole;
    }

    // Super Admin / Platform Admin has visibility across modules in Platform Portal
    if (isPlatformStaffRole) {
      return true;
    }

    // Match against associated nav IDs
    const matchedModule = this.modules.find((m) =>
      m.associated_nav_ids.includes(navId) || m.module_key === navId
    );

    if (!matchedModule) {
      // Default to visible if not specifically mapped to a registered module
      return true;
    }

    // Dependency check: If any dependency is PAUSED or HIDDEN, this item is hidden
    if (matchedModule.dependencies && matchedModule.dependencies.length > 0) {
      const isAnyDepPaused = matchedModule.dependencies.some((depKey) => {
        const dep = this.getModule(depKey);
        return dep && (dep.status === 'PAUSED' || dep.status === 'HIDDEN');
      });
      if (isAnyDepPaused) return false;
    }

    return (
      matchedModule.status === 'LIVE' &&
      matchedModule.navigation_visible === true &&
      matchedModule.launch_scope === true
    );
  }

  /**
   * Returns whether a complete navigation group should be rendered in the sidebar.
   */
  isNavGroupVisible(groupName: string, role?: string): boolean {
    const isPlatformStaffRole = ['Super Admin', 'Platform Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(role || '');

    if (isPlatformStaffRole) {
      return true;
    }

    const gUpper = groupName.toUpperCase();

    if (gUpper.includes('RECRUITMENT') || gUpper.includes('ATS')) {
      const recMod = this.getModule('recruitment');
      return recMod?.status === 'LIVE' && recMod.navigation_visible;
    }

    if (gUpper.includes('PERFORMANCE')) {
      const perfMod = this.getModule('performance');
      return perfMod?.status === 'LIVE' && perfMod.navigation_visible;
    }

    if (gUpper.includes('LEARNING') || gUpper.includes('LMS')) {
      const lmsMod = this.getModule('lms');
      return lmsMod?.status === 'LIVE' && lmsMod.navigation_visible;
    }

    if (gUpper.includes('TRAVEL') || gUpper.includes('EXPENSE')) {
      const trvMod = this.getModule('travel_expense');
      return trvMod?.status === 'LIVE' && trvMod.navigation_visible;
    }

    if (gUpper.includes('ANALYTICS') || gUpper.includes('REPORTS') || gUpper.includes('INSIGHTS')) {
      const analyticsMod = this.getModule('analytics_core');
      return analyticsMod?.status === 'LIVE' && analyticsMod.navigation_visible;
    }

    return true;
  }

  /**
   * Evaluates route accessibility for route guards.
   */
  evaluateRouteAccess(
    route: string,
    userRole?: string,
    isPlatformSuperAdmin: boolean = false
  ): { accessible: boolean; reason?: string; module?: ModuleRegistryItem } {
    if (!this.initialized) this.loadState();

    const isPlatformStaff =
      isPlatformSuperAdmin ||
      ['Super Admin', 'Platform Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(userRole || '');

    // Super Admin in Platform Portal always has internal access
    if (isPlatformStaff) {
      return { accessible: true };
    }

    const rLower = route.toLowerCase();

    // Core HR Dashboards and Workspace are always directly accessible in production
    if (['workforce-overview', 'executive-overview', 'dashboard', 'my-workspace'].includes(rLower)) {
      return { accessible: true };
    }

    // Internal Platform Portal routes are strictly guarded against tenant roles
    if (rLower.startsWith('platform-') || rLower.startsWith('saas-')) {
      return {
        accessible: false,
        reason: 'Access Denied: Platform control plane is restricted to Platform Administrators.',
      };
    }

    // Find any module that owns this route
    const matchedModule = this.modules.find(
      (m) =>
        m.associated_routes.includes(rLower) ||
        m.associated_routes.some((r) => rLower.startsWith(r)) ||
        m.module_key === rLower
    );

    if (!matchedModule) {
      return { accessible: true };
    }

    // Check parent dependencies
    if (matchedModule.dependencies && matchedModule.dependencies.length > 0) {
      for (const depKey of matchedModule.dependencies) {
        const dep = this.getModule(depKey);
        if (dep && (dep.status === 'PAUSED' || dep.status === 'HIDDEN')) {
          return {
            accessible: false,
            reason: `Feature is currently not available due to dependency on paused module: ${dep.module_name}`,
            module: matchedModule,
          };
        }
      }
    }

    if (matchedModule.status === 'PAUSED') {
      return {
        accessible: false,
        reason: 'This module is currently paused and scheduled for post-launch release.',
        module: matchedModule,
      };
    }

    if (matchedModule.status === 'HIDDEN' || matchedModule.status === 'DEPRECATED') {
      return {
        accessible: false,
        reason: 'This feature is currently not available.',
        module: matchedModule,
      };
    }

    if (!matchedModule.route_accessible) {
      return {
        accessible: false,
        reason: 'This route is not accessible in the current production deployment.',
        module: matchedModule,
      };
    }

    return { accessible: true, module: matchedModule };
  }

  /**
   * Updates a module's lifecycle status with strict audit logging.
   * Only Platform Super Admin can invoke this.
   */
  async updateModuleStatus(
    moduleKey: string,
    newStatus: ModuleLifecycleStatus,
    adminInfo: { id: string; name: string },
    reason: string
  ): Promise<ModuleRegistryItem> {
    if (!this.initialized) this.loadState();

    const idx = this.modules.findIndex((m) => m.module_key === moduleKey);
    if (idx === -1) {
      throw new Error(`Module with key "${moduleKey}" not found in registry.`);
    }

    const prevStatus = this.modules[idx].status;

    // Automatic alignment of visibility and route access based on status
    const isLive = newStatus === 'LIVE';
    const isBeta = newStatus === 'BETA';
    const navVisible = isLive;
    const routeAccessible = isLive || isBeta;
    const launchScope = isLive;

    const updatedModule: ModuleRegistryItem = {
      ...this.modules[idx],
      status: newStatus,
      navigation_visible: navVisible,
      route_accessible: routeAccessible,
      launch_scope: launchScope,
    };

    this.modules[idx] = updatedModule;

    // Record Audit Entry
    const auditEntry: ModuleStatusAuditEntry = {
      id: `mod-audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      module_key: moduleKey,
      module_name: updatedModule.module_name,
      previous_status: prevStatus,
      new_status: newStatus,
      changed_by: adminInfo.name || 'Platform Super Admin',
      platform_admin_id: adminInfo.id,
      changed_at: new Date().toISOString(),
      reason: reason || `Updated module lifecycle status to ${newStatus}`,
    };

    this.auditLogs = [auditEntry, ...this.auditLogs];
    this.persistState();

    // Dispatch global event for reactive UI re-render
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('platform:module_status_changed', {
          detail: { module: updatedModule, audit: auditEntry },
        })
      );
    }
    hrEventBus.emit('organization.legal_entity_updated' as any, { module: updatedModule });

    return updatedModule;
  }

  /**
   * Updates planning / roadmap metadata for a module.
   */
  async updateModuleRoadmapMetadata(
    moduleKey: string,
    updates: Partial<Pick<ModuleRegistryItem, 'planned_phase' | 'priority' | 'completion_percentage' | 'development_notes'>>
  ): Promise<ModuleRegistryItem> {
    if (!this.initialized) this.loadState();

    const idx = this.modules.findIndex((m) => m.module_key === moduleKey);
    if (idx === -1) {
      throw new Error(`Module "${moduleKey}" not found.`);
    }

    this.modules[idx] = {
      ...this.modules[idx],
      ...updates,
    };

    this.persistState();
    return this.modules[idx];
  }

  /**
   * Returns immutable audit logs.
   */
  getAuditLogs(): ModuleStatusAuditEntry[] {
    if (!this.initialized) this.loadState();
    return [...this.auditLogs];
  }

  /**
   * Computes Launch Scope KPI Metrics for the September 26 Launch Dashboard.
   */
  getLaunchScopeMetrics(): LaunchScopeMetrics {
    if (!this.initialized) this.loadState();

    const total = this.modules.length;
    const live = this.modules.filter((m) => m.status === 'LIVE').length;
    const beta = this.modules.filter((m) => m.status === 'BETA').length;
    const paused = this.modules.filter((m) => m.status === 'PAUSED').length;
    const dev = this.modules.filter((m) => m.status === 'DEVELOPMENT').length;
    const hidden = this.modules.filter((m) => m.status === 'HIDDEN' || m.status === 'DEPRECATED').length;
    const certified = this.modules.filter((m) => m.certification_status === 'LAUNCH_CERTIFIED').length;

    // Launch readiness is percentage of launch-critical modules that are LIVE & CERTIFIED
    const launchCritical = this.modules.filter((m) => m.launch_scope_category === 'LAUNCH_CRITICAL');
    const certifiedLiveLaunch = launchCritical.filter(
      (m) => m.status === 'LIVE' && m.certification_status === 'LAUNCH_CERTIFIED'
    ).length;

    const readiness =
      launchCritical.length > 0
        ? Math.round((certifiedLiveLaunch / launchCritical.length) * 100)
        : 100;

    return {
      totalModules: total,
      liveForLaunch: live,
      betaModules: beta,
      pausedModules: paused,
      developmentModules: dev,
      hiddenModules: hidden,
      launchReadinessPercentage: readiness,
      certifiedModulesCount: certified,
    };
  }

  /**
   * Resets registry to canonical baseline (for test teardown or reset).
   */
  resetToCanonical(): void {
    this.modules = [...CANONICAL_MODULES];
    this.persistState();
  }
}

export const moduleRegistryService = new ModuleRegistryService();
