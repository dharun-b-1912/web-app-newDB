// src/types/moduleRegistry.ts
// ============================================================================
// Joy PeopleHR — Centralized Enterprise Module Registry & Lifecycle Governance
// Launch Scope Control for September 26, 2026 SaaS Production Launch
// ============================================================================

export type ModuleLifecycleStatus =
  | 'LIVE'
  | 'BETA'
  | 'DEVELOPMENT'
  | 'PAUSED'
  | 'HIDDEN'
  | 'DEPRECATED';

export type LaunchScopeCategory =
  | 'LAUNCH_CRITICAL'
  | 'POST_LAUNCH_PHASE_2'
  | 'POST_LAUNCH_PHASE_3'
  | 'POST_LAUNCH_PHASE_4'
  | 'INTERNAL_ONLY';

export type ModuleCertificationStatus =
  | 'LAUNCH_CERTIFIED'
  | 'IN_PROGRESS'
  | 'NOT_CERTIFIED'
  | 'POST_LAUNCH';

export interface ModuleRegistryItem {
  module_key: string;
  module_name: string;
  category: 'CORE_HR' | 'ATTENDANCE_LEAVE' | 'PAYROLL_FINANCE' | 'VENDOR_ECOSYSTEM' | 'TALENT_ACQUISITION' | 'PERFORMANCE_GROWTH' | 'LEARNING_DEVELOPMENT' | 'EMPLOYEE_RELATIONS' | 'EXPENSE_TRAVEL' | 'ANALYTICS_INTELLIGENCE' | 'PLATFORM_CONTROL';
  status: ModuleLifecycleStatus;
  launch_scope: boolean;
  launch_scope_category: LaunchScopeCategory;
  navigation_visible: boolean;
  route_accessible: boolean;
  required_plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  required_permissions: string[];
  dependencies: string[];
  web_enabled: boolean;
  mobile_enabled: boolean;
  certification_status: ModuleCertificationStatus;
  last_certified_at?: string;
  planned_phase: string;
  priority: 'CRITICAL_P0' | 'HIGH_P1' | 'MEDIUM_P2' | 'LOW_P3';
  completion_percentage: number;
  development_notes?: string;
  associated_routes: string[];
  associated_nav_ids: string[];
}

export interface ModuleStatusAuditEntry {
  id: string;
  module_key: string;
  module_name: string;
  previous_status: ModuleLifecycleStatus;
  new_status: ModuleLifecycleStatus;
  changed_by: string;
  platform_admin_id: string;
  changed_at: string;
  reason: string;
}

export interface LaunchScopeMetrics {
  totalModules: number;
  liveForLaunch: number;
  betaModules: number;
  pausedModules: number;
  developmentModules: number;
  hiddenModules: number;
  launchReadinessPercentage: number;
  certifiedModulesCount: number;
}
