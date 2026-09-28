// src/services/platform/featureLaunchRegistryService.ts
// ============================================================================
// Joy PeopleHR — Centralized Feature Launch Registry & Source of Truth
// Triple-Layer Governance: Navigation Guard, Route Guard, and Domain Guard
// Launch Scope Control for September 26, 2026 SaaS Production Launch
// ============================================================================

import { PortalType } from '../../types/authContext';

export type FeatureLaunchStatus =
  | 'LAUNCH_READY'    // Visible in customer navigation and fully active
  | 'BETA'            // Visible only if explicitly enabled
  | 'DEVELOPMENT'     // Restricted strictly to Platform Development section
  | 'HIDDEN'          // Completely hidden from customer navigation & direct routes
  | 'DEPRECATED';     // Scheduled for decommission

export interface LaunchFeatureDefinition {
  feature_key: string;
  display_name: string;
  portal: PortalType;
  status: FeatureLaunchStatus;
  launch_enabled: boolean;
  navigation_visible: boolean;
  route_path: string;
  required_plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  category: 'CORE_HR' | 'ATTENDANCE_LEAVE' | 'PAYROLL_FINANCE' | 'VENDOR_ECOSYSTEM' | 'ORGANIZATION_GOVERNANCE' | 'TALENT_ACQUISITION' | 'PERFORMANCE_GROWTH' | 'LEARNING_DEVELOPMENT' | 'EXPENSE_TRAVEL' | 'ANALYTICS_REPORTS' | 'PLATFORM_CONTROL';
  description: string;
}

export class FeatureLaunchRegistryService {
  private static readonly FEATURES: LaunchFeatureDefinition[] = [
    // ========================================================================
    // 1. LAUNCH READY FEATURES (Visible & Enabled for Sept 26)
    // ========================================================================
    {
      feature_key: 'company_dashboard',
      display_name: 'HR Administrative Workspace',
      portal: PortalType.COMPANY_ADMIN,
      status: 'LAUNCH_READY',
      launch_enabled: true,
      navigation_visible: true,
      route_path: 'dashboard',
      required_plan: 'Starter',
      category: 'CORE_HR',
      description: 'Central operational dashboard for HR Head and Administrators.',
    },
    {
      feature_key: 'employee_directory',
      display_name: 'Employee Directory & Profiles',
      portal: PortalType.COMPANY_ADMIN,
      status: 'LAUNCH_READY',
      launch_enabled: true,
      navigation_visible: true,
      route_path: 'employees',
      required_plan: 'Starter',
      category: 'CORE_HR',
      description: 'Complete employee lifecycle management and directory.',
    },
    {
      feature_key: 'attendance_management',
      display_name: 'Attendance & Time Tracking',
      portal: PortalType.COMPANY_ADMIN,
      status: 'LAUNCH_READY',
      launch_enabled: true,
      navigation_visible: true,
      route_path: 'attendance',
      required_plan: 'Starter',
      category: 'ATTENDANCE_LEAVE',
      description: 'Authoritative server-side attendance, shifts, and regularization.',
    },
    {
      feature_key: 'leave_management',
      display_name: 'Leave Engine & Policies',
      portal: PortalType.COMPANY_ADMIN,
      status: 'LAUNCH_READY',
      launch_enabled: true,
      navigation_visible: true,
      route_path: 'leave',
      required_plan: 'Starter',
      category: 'ATTENDANCE_LEAVE',
      description: 'Accrual engine, leave requests, balance tracking, and approvals.',
    },
    {
      feature_key: 'payroll_financials',
      display_name: 'Payroll Financial Authority',
      portal: PortalType.COMPANY_ADMIN,
      status: 'LAUNCH_READY',
      launch_enabled: true,
      navigation_visible: true,
      route_path: 'payroll',
      required_plan: 'Professional',
      category: 'PAYROLL_FINANCE',
      description: 'Statutory compliance (PF, ESI, PT, TDS), maker-checker, and locked periods.',
    },
    {
      feature_key: 'offboarding_fnf',
      display_name: 'Separation & FnF Automation',
      portal: PortalType.COMPANY_ADMIN,
      status: 'LAUNCH_READY',
      launch_enabled: true,
      navigation_visible: true,
      route_path: 'offboarding',
      required_plan: 'Professional',
      category: 'CORE_HR',
      description: '8-department clearance matrix, asset recovery, and statutory FnF.',
    },
    {
      feature_key: 'unified_approvals',
      display_name: 'Unified Approvals Inbox',
      portal: PortalType.COMPANY_ADMIN,
      status: 'LAUNCH_READY',
      launch_enabled: true,
      navigation_visible: true,
      route_path: 'approvals',
      required_plan: 'Starter',
      category: 'CORE_HR',
      description: 'Central inbox for leaves, overtimes, separations, and invoices.',
    },
    {
      feature_key: 'organization_governance',
      display_name: 'Organization Cockpit & Structure',
      portal: PortalType.ORGANIZATION_ADMIN,
      status: 'LAUNCH_READY',
      launch_enabled: true,
      navigation_visible: true,
      route_path: 'executive-overview',
      required_plan: 'Enterprise',
      category: 'ORGANIZATION_GOVERNANCE',
      description: 'Multi-entity corporate governance, branches, and legal entities.',
    },
    {
      feature_key: 'ess_portal',
      display_name: 'Employee Self-Service (ESS)',
      portal: PortalType.EMPLOYEE_HR,
      status: 'LAUNCH_READY',
      launch_enabled: true,
      navigation_visible: true,
      route_path: 'ess-dashboard',
      required_plan: 'Starter',
      category: 'CORE_HR',
      description: 'Self-service dashboard for attendance, leave, payslips, and profile.',
    },
    {
      feature_key: 'platform_control_plane',
      display_name: 'Platform Administration Control Plane',
      portal: PortalType.PLATFORM_ADMIN,
      status: 'LAUNCH_READY',
      launch_enabled: true,
      navigation_visible: true,
      route_path: 'platform-dashboard',
      required_plan: 'Enterprise',
      category: 'PLATFORM_CONTROL',
      description: 'Root multi-tenant SaaS control plane for provisioning and health.',
    },

    // ========================================================================
    // 2. PAUSED / INCOMPLETE MODULES (Hidden & Blocked for Sept 26 Launch)
    // ========================================================================
    {
      feature_key: 'performance_management',
      display_name: 'Performance & OKR Objectives',
      portal: PortalType.COMPANY_ADMIN,
      status: 'DEVELOPMENT',
      launch_enabled: false,
      navigation_visible: false,
      route_path: 'performance',
      required_plan: 'Business',
      category: 'PERFORMANCE_GROWTH',
      description: 'Goals, OKRs, KPI Library, Reviews & 360, PIP Engine (In Development).',
    },
    {
      feature_key: 'learning_development',
      display_name: 'Learning & Development (LMS)',
      portal: PortalType.COMPANY_ADMIN,
      status: 'DEVELOPMENT',
      launch_enabled: false,
      navigation_visible: false,
      route_path: 'lms',
      required_plan: 'Business',
      category: 'LEARNING_DEVELOPMENT',
      description: 'Courses, certifications, exams, training calendar (In Development).',
    },
    {
      feature_key: 'travel_expense',
      display_name: 'Travel & Expense Management',
      portal: PortalType.COMPANY_ADMIN,
      status: 'DEVELOPMENT',
      launch_enabled: false,
      navigation_visible: false,
      route_path: 'travel-expense',
      required_plan: 'Business',
      category: 'EXPENSE_TRAVEL',
      description: 'Expense claims, travel desk, per diem rules (In Development).',
    },
    {
      feature_key: 'advanced_predictive_analytics',
      display_name: 'Predictive Workforce Analytics',
      portal: PortalType.COMPANY_ADMIN,
      status: 'DEVELOPMENT',
      launch_enabled: false,
      navigation_visible: false,
      route_path: 'analytics-predictive',
      required_plan: 'Enterprise',
      category: 'ANALYTICS_REPORTS',
      description: 'AI attrition prediction and workforce modeling (In Development).',
    },
  ];

  /**
   * Retrieves all feature definitions from the authoritative registry
   */
  public static getAllFeatures(): LaunchFeatureDefinition[] {
    return [...this.FEATURES];
  }

  /**
   * Retrieves all features approved for Launch Navigation
   */
  public static getLaunchNavigationFeatures(portal?: PortalType): LaunchFeatureDefinition[] {
    return this.FEATURES.filter((f) => {
      const matchLaunch = f.launch_enabled && f.navigation_visible && f.status === 'LAUNCH_READY';
      if (!portal) return matchLaunch;
      return matchLaunch && f.portal === portal;
    });
  }

  /**
   * Evaluates if a given route is permitted in production customer navigation
   */
  public static isRouteLaunchReady(route: string): boolean {
    const clean = (route || '').toLowerCase().replace(/^#\/?/, '').trim();
    
    // Check if the route belongs to a paused/development feature
    const devFeature = this.FEATURES.find(
      (f) => !f.launch_enabled && f.route_path.toLowerCase() === clean
    );
    if (devFeature) {
      return false;
    }

    // Check if route belongs to an active launch feature
    const launchFeature = this.FEATURES.find(
      (f) => f.launch_enabled && f.route_path.toLowerCase() === clean
    );
    if (launchFeature) {
      return true;
    }

    // Default safe fallback for active sub-paths
    const isUnderDevCategory = ['performance', 'lms', 'learning', 'travel', 'analytics-predictive'].some(
      (prefix) => clean.startsWith(prefix)
    );
    return !isUnderDevCategory;
  }

  /**
   * Evaluates triple-layer protection for a route
   */
  public static evaluateRouteProtection(route: string, isPlatformStaff: boolean = false): {
    allowed: boolean;
    layer1_navVisible: boolean;
    layer2_routeAccessible: boolean;
    reason: string;
  } {
    const clean = (route || '').toLowerCase().replace(/^#\/?/, '').trim();
    const feature = this.FEATURES.find((f) => f.route_path.toLowerCase() === clean);

    if (!feature) {
      const isUnderDev = ['performance', 'lms', 'learning', 'travel', 'analytics-predictive'].some(
        (prefix) => clean.startsWith(prefix)
      );
      if (isUnderDev && !isPlatformStaff) {
        return {
          allowed: false,
          layer1_navVisible: false,
          layer2_routeAccessible: false,
          reason: 'Feature is in development and hidden from customer launch portals.',
        };
      }
      return {
        allowed: true,
        layer1_navVisible: true,
        layer2_routeAccessible: true,
        reason: 'Permitted standard operational route.',
      };
    }

    if (feature.status === 'LAUNCH_READY') {
      return {
        allowed: true,
        layer1_navVisible: feature.navigation_visible,
        layer2_routeAccessible: true,
        reason: 'Certified production launch feature.',
      };
    }

    if (isPlatformStaff) {
      return {
        allowed: true,
        layer1_navVisible: false,
        layer2_routeAccessible: true,
        reason: 'Platform development preview access.',
      };
    }

    return {
      allowed: false,
      layer1_navVisible: false,
      layer2_routeAccessible: false,
      reason: `Feature '${feature.display_name}' is paused for launch and scheduled for future phase.`,
    };
  }
}
