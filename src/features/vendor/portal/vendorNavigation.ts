// src/features/vendor/portal/vendorNavigation.ts
// ============================================================================
// JOY PeopleHR — Authoritative Vendor Portal Navigation Architecture
// One Canonical Sidebar Definition Driven by Router, Roles & Permissions
// ============================================================================

import {
  Building2,
  TrendingUp,
  Users,
  MapPin,
  Clock,
  Sparkles,
  Upload,
  Calculator,
  CreditCard,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  History,
  FolderOpen,
  LucideIcon,
} from 'lucide-react';

export type VendorNavSection =
  | 'clients'
  | 'dashboard'
  | 'workforce'
  | 'deployments'
  | 'attendance'
  | 'settlement'
  | 'invoices'
  | 'purchase-orders'
  | 'wages'
  | 'disbursements'
  | 'licenses'
  | 'returns'
  | 'calendar'
  | 'documents'
  | 'audit';

export interface VendorNavItem {
  id: VendorNavSection;
  label: string;
  icon: LucideIcon;
  route: string;
  badge?: string;
  highlight?: boolean;
  requiredPermission?: string;
}

export interface VendorNavGroup {
  group: string;
  items: VendorNavItem[];
}

export const VENDOR_NAV_GROUPS: VendorNavGroup[] = [
  {
    group: 'WORKSPACE',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: TrendingUp,
        route: 'vendor-dashboard',
      },
      {
        id: 'clients',
        label: 'Client Workspaces',
        icon: Building2,
        route: 'vendor-clients',
      },
    ],
  },
  {
    group: 'WORKFORCE',
    items: [
      {
        id: 'workforce',
        label: 'Assigned Workforce',
        icon: Users,
        route: 'vendor-employees',
      },
      {
        id: 'deployments',
        label: 'Deployments & Sites',
        icon: MapPin,
        route: 'vendor-assignments',
      },
      {
        id: 'attendance',
        label: 'Attendance & OT',
        icon: Clock,
        route: 'vendor-attendance',
      },
    ],
  },
  {
    group: 'COMMERCIALS',
    items: [
      {
        id: 'purchase-orders',
        label: 'Purchase Orders',
        icon: FileSpreadsheet,
        route: 'vendor-purchase-orders',
      },
      {
        id: 'invoices',
        label: 'Invoices & 3-Way Match',
        icon: Upload,
        route: 'vendor-invoices',
      },
      {
        id: 'settlement',
        label: 'Commercial Settlement',
        icon: Sparkles,
        route: 'vendor-settlement-workspace',
        highlight: true,
      },
      {
        id: 'wages',
        label: 'Wage Verification',
        icon: Calculator,
        route: 'vendor-wages',
      },
      {
        id: 'disbursements',
        label: 'Payment Reconciliation',
        icon: CreditCard,
        route: 'vendor-payments',
      },
    ],
  },
  {
    group: 'COMPLIANCE',
    items: [
      {
        id: 'licenses',
        label: 'Licences & Expiry',
        icon: ShieldCheck,
        route: 'vendor-licenses',
      },
      {
        id: 'calendar',
        label: 'Compliance Calendar',
        icon: Clock,
        route: 'vendor-compliance-calendar',
      },
      {
        id: 'returns',
        label: 'Form V & Returns',
        icon: FileSpreadsheet,
        route: 'vendor-statutory-returns',
      },
    ],
  },
  {
    group: 'DOCUMENTS',
    items: [
      {
        id: 'documents',
        label: 'Documents',
        icon: FolderOpen,
        route: 'vendor-documents',
      },
    ],
  },
  {
    group: 'AUDIT',
    items: [
      {
        id: 'audit',
        label: 'Audit Trail & Reports',
        icon: History,
        route: 'vendor-audit-reports',
      },
    ],
  },
];

export const mapRouteToVendorSection = (route?: string): VendorNavSection => {
  if (!route) return 'settlement';
  const clean = route.replace(/^\/vendor\//, '').replace(/^vendor-/, '');

  switch (clean) {
    case 'clients':
    case 'multi-client':
    case 'multi-client-hub':
      return 'clients';
    case 'dashboard':
    case 'overview':
      return 'dashboard';
    case 'workforce':
    case 'employees':
    case 'workers':
      return 'workforce';
    case 'deployments':
    case 'assignments':
    case 'sites':
      return 'deployments';
    case 'attendance':
    case 'muster':
    case 'ot':
      return 'attendance';
    case 'settlement':
    case 'settlement-workspace':
      return 'settlement';
    case 'purchase-orders':
    case 'purchase_orders':
    case 'pos':
      return 'purchase-orders';
    case 'invoices':
    case 'invoice':
    case 'po':
      return 'invoices';
    case 'wages':
    case 'wage-breakdown':
    case 'wage-verification':
    case 'payroll':
    case 'payroll-verification':
      return 'wages';
    case 'disbursements':
    case 'payments':
    case 'payables':
    case 'reconciliation':
      return 'disbursements';
    case 'licenses':
    case 'licences':
      return 'licenses';
    case 'returns':
    case 'statutory-returns':
    case 'compliance':
    case 'statutory':
    case 'form-v':
      return 'returns';
    case 'calendar':
    case 'compliance-calendar':
      return 'calendar';
    case 'documents':
    case 'document-centre':
      return 'documents';
    case 'audit':
    case 'audit-reports':
    case 'reports':
      return 'audit';
    default:
      return 'settlement';
  }
};

export const mapVendorSectionToRoute = (section: VendorNavSection): string => {
  const map: Record<VendorNavSection, string> = {
    clients: 'vendor-clients',
    dashboard: 'vendor-dashboard',
    workforce: 'vendor-employees',
    deployments: 'vendor-assignments',
    attendance: 'vendor-attendance',
    settlement: 'vendor-settlement-workspace',
    invoices: 'vendor-invoices',
    'purchase-orders': 'vendor-purchase-orders',
    wages: 'vendor-wages',
    disbursements: 'vendor-payments',
    licenses: 'vendor-licenses',
    returns: 'vendor-statutory-returns',
    calendar: 'vendor-compliance-calendar',
    documents: 'vendor-documents',
    audit: 'vendor-audit-reports',
  };
  return map[section] || 'vendor-settlement-workspace';
};

export const VENDOR_NAVIGATION_GROUPS = VENDOR_NAV_GROUPS;

export const isVendorSectionAllowed = (
  section: VendorNavSection,
  role?: string
): boolean => {
  if (!role) return false;
  if (role === 'Vendor Admin') return true;
  if (role === 'Vendor Supervisor') {
    return ['dashboard', 'workforce', 'deployments', 'attendance', 'settlement', 'calendar', 'documents'].includes(section);
  }
  if (role === 'Vendor Finance') {
    return ['dashboard', 'settlement', 'purchase-orders', 'invoices', 'wages', 'disbursements', 'licenses', 'returns', 'documents', 'audit'].includes(section);
  }
  return false;
};

