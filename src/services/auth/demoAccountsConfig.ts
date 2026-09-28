// src/services/auth/demoAccountsConfig.ts
// ============================================================
// Joy PeopleHR — Pre-Configured V-Guard Demo Personas & Auth Switcher
// ============================================================

import { AuthSessionUser, AuthResult, AuthContextMode } from './authService';
import { Organization, ScopeLevel } from '../../types';

export interface DemoPersona {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  title: string;
  department: string;
  avatarUrl: string;
  authContext: AuthContextMode;
  destinationRoute: string;
  isPlatformAdmin: boolean;
  description: string;
  badge: string;
}

export const VGUARD_ORGANIZATION: Organization = {
  id: 'org-vguard',
  name: 'V-Guard Industries Ltd',
  slug: 'vguard',
  industry: 'Electricals & Consumer Durables',
  status: 'Active',
  plan: 'Enterprise',
  default_currency: 'INR',
  timezone: 'Asia/Kolkata',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-09-18T00:00:00.000Z',
};

export const VGUARD_COMPANY = {
  id: 'comp-vguard',
  organization_id: 'org-vguard',
  legal_name: 'V-Guard Industries Limited',
  trade_name: 'V-Guard Consumer Electronics & Appliances',
  statutory_registration_no: 'L31200KL1996PLC010010',
  tax_id: 'AABCV1234F',
  gstin: '32AABCV1234F1Z9',
  country: 'India',
  city: 'Kochi',
  state: 'Kerala',
  postal_code: '682017',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  address: '42/962, Vennala High School Road, Vennala, Kochi, Kerala 682028',
  status: 'Active',
  created_at: '2026-01-01T00:00:00.000Z',
};

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'demo-superadmin-01',
    name: 'Joy Platform Super Admin',
    email: 'superadmin@joypeoplehr.com',
    password: 'SuperAdmin#2026!',
    role: 'Super Admin',
    title: 'WorkForce Platform Administrator',
    department: 'Platform Engineering & SaaS Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&fit=crop&crop=faces',
    authContext: 'platform',
    destinationRoute: 'platform-dashboard',
    isPlatformAdmin: true,
    description: 'Full multi-tenant super admin cockpit, tenant provisioning, MRR metrics & global audit ledger.',
    badge: 'Platform Super Admin',
  },
  {
    id: 'demo-vguard-admin-01',
    name: 'Rajesh Kumar',
    email: 'admin@vguard.in',
    password: 'VGuardAdmin#2026!',
    role: 'Company Admin',
    title: 'Managing Director & Enterprise Administrator',
    department: 'Executive Leadership',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&fit=crop&crop=faces',
    authContext: 'admin',
    destinationRoute: 'dashboard',
    isPlatformAdmin: false,
    description: 'V-Guard legal entity control, GSTIN/PAN setup, subscription plan usage, branches & departments.',
    badge: 'Company Admin',
  },
  {
    id: 'demo-vguard-hr-01',
    name: 'Sunita Menon',
    email: 'hr@vguard.in',
    password: 'VGuardHR#2026!',
    role: 'HR Head',
    title: 'Vice President — Human Resources',
    department: 'People Operations & Culture',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=128&fit=crop&crop=faces',
    authContext: 'tenant',
    destinationRoute: 'dashboard',
    isPlatformAdmin: false,
    description: 'Employee onboarding wizard, statutory compliance (PF/ESI/PT), leave policies & payroll runs.',
    badge: 'HR Head',
  },
  {
    id: 'demo-vguard-mgr-01',
    name: 'Vikram Nair',
    email: 'manager.eng@vguard.in',
    password: 'VGuardMgr#2026!',
    role: 'Manager',
    title: 'Senior Engineering Manager',
    department: 'R&D and Product Engineering',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&fit=crop&crop=faces',
    authContext: 'tenant',
    destinationRoute: 'dashboard',
    isPlatformAdmin: false,
    description: 'Direct team attendance regularization approvals, shift allocations, leave requests & 1-on-1s.',
    badge: 'Manager',
  },
  {
    id: 'demo-vguard-tl-01',
    name: 'Kavitha S',
    email: 'tl.devops@vguard.in',
    password: 'VGuardTL#2026!',
    role: 'Team Lead',
    title: 'Tech Lead — Embedded Systems & IoT',
    department: 'Smart Appliances Division',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&fit=crop&crop=faces',
    authContext: 'tenant',
    destinationRoute: 'tl-dashboard',
    isPlatformAdmin: false,
    description: 'Sprint planning, biometric device attendance tracking, timesheets & shift monitoring.',
    badge: 'Team Lead',
  },
  {
    id: 'demo-vguard-emp-01',
    name: 'Rohit Verma',
    email: 'employee.rohit@vguard.in',
    password: 'VGuardEmp#2026!',
    role: 'Employee',
    title: 'Senior Firmware Engineer',
    department: 'Smart Appliances Division',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=128&fit=crop&crop=faces',
    authContext: 'tenant',
    destinationRoute: 'ess-dashboard',
    isPlatformAdmin: false,
    description: 'Employee Self-Service (ESS), mobile geofenced punch-in/out, pay slips & leave balance.',
    badge: 'Employee (ESS)',
  },
];

export const demoAccountsConfig = {
  getDemoPersonas(): DemoPersona[] {
    return DEMO_PERSONAS;
  },

  getPersonaByEmail(email: string): DemoPersona | undefined {
    const clean = email.toLowerCase().trim();
    return DEMO_PERSONAS.find((p) => p.email.toLowerCase() === clean);
  },

  isDemoAccount(identifier: string): boolean {
    const clean = identifier.toLowerCase().trim();
    return DEMO_PERSONAS.some((p) => p.email.toLowerCase() === clean);
  },

  authenticateDemoAccount(
    identifier: string,
    password: string,
    context: AuthContextMode = 'tenant'
  ): AuthResult | null {
    const clean = identifier.toLowerCase().trim();
    const persona = DEMO_PERSONAS.find((p) => p.email.toLowerCase() === clean);

    if (!persona) return null;

    if (persona.password !== password) {
      return {
        success: false,
        errorMessage: 'Invalid demo password. Please verify the demo credentials provided on screen.',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }

    const orgId = persona.isPlatformAdmin ? 'platform-root' : 'org-vguard';

    // Seed V-Guard into local storage for immediate persistence
    if (typeof localStorage !== 'undefined' && !persona.isPlatformAdmin) {
      try {
        localStorage.setItem('workforce_active_org_id', 'org-vguard');
        localStorage.setItem('workforce_active_company_id', 'comp-vguard');

        // Ensure V-Guard exists in cached organizations
        const orgsRaw = localStorage.getItem('workforce_orgs');
        const orgs = orgsRaw ? JSON.parse(orgsRaw) : [];
        if (!orgs.some((o: any) => o.id === 'org-vguard')) {
          orgs.push(VGUARD_ORGANIZATION);
          localStorage.setItem('workforce_orgs', JSON.stringify(orgs));
        }

        // Ensure V-Guard exists in cached companies
        const compsRaw = localStorage.getItem('workforce_companies');
        const comps = compsRaw ? JSON.parse(compsRaw) : [];
        if (!comps.some((c: any) => c.id === 'comp-vguard')) {
          comps.push(VGUARD_COMPANY);
          localStorage.setItem('workforce_companies', JSON.stringify(comps));
        }
      } catch (_) {}
    }

    const sessionUser: AuthSessionUser = {
      id: persona.id,
      auth_user_id: persona.id,
      email: persona.email,
      name: persona.name,
      avatar_url: persona.avatarUrl,
      organization_id: orgId,
      tenant_id: orgId,
      status: 'Active',
      account_status: 'ACTIVE',
      must_change_password: false,
      is_platform_admin: persona.isPlatformAdmin,
      platform_role: persona.isPlatformAdmin ? 'SUPER_ADMIN' : undefined,
      role: persona.role,
      roles: [
        {
          id: `role-${persona.role.toLowerCase().replace(/\s+/g, '-')}`,
          organization_id: orgId,
          name: persona.role,
          description: `${persona.role} Role for ${persona.name}`,
          permissions: persona.isPlatformAdmin
            ? [{ permission_id: '*', scope_level: 'Organization' as ScopeLevel }]
            : [
                { permission_id: 'tenant.workspace.read', scope_level: 'Organization' as ScopeLevel },
                { permission_id: 'tenant.workspace.write', scope_level: 'Organization' as ScopeLevel },
                { permission_id: '*', scope_level: 'Organization' as ScopeLevel },
              ],
        },
      ],
      created_at: new Date().toISOString(),
    };

    return {
      success: true,
      user: sessionUser,
      tenant: persona.isPlatformAdmin ? undefined : VGUARD_ORGANIZATION,
      destinationRoute: persona.destinationRoute,
      mustChangePassword: false,
    };
  },
};
