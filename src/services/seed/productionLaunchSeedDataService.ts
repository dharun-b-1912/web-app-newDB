// src/services/seed/productionLaunchSeedDataService.ts
// ============================================================================
// Joy PeopleHR — Master Production Launch Seed Data Engine
// Deterministic Enterprise Dataset for JOY DEMO GROUP (Multi-Company + Vendor)
// ============================================================================

import { PortalType, AuthContext } from '../../types/authContext';
import { PortalAccessResolver } from '../auth/portalAccessResolver';
import { Company, Employee } from '../../types';

export interface SeedPersona {
  code: string;
  name: string;
  email: string;
  role: string;
  expectedPortal: PortalType;
  expectedRoute: string;
  organizationId: string;
  companyId?: string;
  vendorId?: string;
  isPlatformAdmin?: boolean;
}

export interface SeedDataset {
  organization: {
    id: string;
    name: string;
    code: string;
    plan: string;
  };
  companies: Array<{
    id: string;
    name: string;
    code: string;
    state: string;
    city: string;
    employeeCount: number;
  }>;
  vendor: {
    id: string;
    name: string;
    code: string;
    serviceChargePct: number;
    workerCount: number;
  };
  personas: SeedPersona[];
  employees: Employee[];
  vendorWorkers: Array<{
    id: string;
    vendorId: string;
    name: string;
    dailyWage: number;
    skillCategory: string;
    trade: string;
  }>;
}

export class ProductionLaunchSeedDataService {
  public static readonly ORG_ID = 'org-joy-demo-group';
  public static readonly CHENNAI_COMPANY_ID = 'comp-joy-chennai';
  public static readonly CBE_COMPANY_ID = 'comp-joy-coimbatore';
  public static readonly VENDOR_ID = 'ven-abc-security';

  /**
   * Generates the canonical, deterministic launch seed dataset for JOY DEMO GROUP
   */
  public static generateSeedDataset(): SeedDataset {
    // 1. Defined 8 Master Personas
    const personas: SeedPersona[] = [
      {
        code: 'PLATFORM_ADMIN',
        name: 'Super Admin',
        email: 'superadmin@joypeoplehr.com',
        role: 'SUPER_ADMIN',
        expectedPortal: PortalType.PLATFORM_ADMIN,
        expectedRoute: 'platform-dashboard',
        organizationId: this.ORG_ID,
        isPlatformAdmin: true,
      },
      {
        code: 'ORGANIZATION_ADMIN',
        name: 'Arun Prakash (Group Director)',
        email: 'orgadmin@joygroup.in',
        role: 'ORGANIZATION_ADMIN',
        expectedPortal: PortalType.ORGANIZATION_ADMIN,
        expectedRoute: 'executive-overview',
        organizationId: this.ORG_ID,
      },
      {
        code: 'COMPANY_ADMIN_CBE',
        name: 'Kavitha Sundaram (CBE Entity Admin)',
        email: 'admin.cbe@joygroup.in',
        role: 'COMPANY_ADMIN',
        expectedPortal: PortalType.COMPANY_ADMIN,
        expectedRoute: 'executive-overview',
        organizationId: this.ORG_ID,
        companyId: this.CBE_COMPANY_ID,
      },
      {
        code: 'HR_HEAD_CHENNAI',
        name: 'Meera Vasudevan (HR Head)',
        email: 'hrhead.chennai@joygroup.in',
        role: 'HR_HEAD',
        expectedPortal: PortalType.COMPANY_ADMIN,
        expectedRoute: 'dashboard',
        organizationId: this.ORG_ID,
        companyId: this.CHENNAI_COMPANY_ID,
      },
      {
        code: 'HR_ADMIN_CHENNAI',
        name: 'Ramesh Kumar (HR Executive)',
        email: 'hradmin.chennai@joygroup.in',
        role: 'HR_ADMIN',
        expectedPortal: PortalType.COMPANY_ADMIN,
        expectedRoute: 'dashboard',
        organizationId: this.ORG_ID,
        companyId: this.CHENNAI_COMPANY_ID,
      },
      {
        code: 'MANAGER_CHENNAI',
        name: 'Siddharth Rao (Engineering Manager)',
        email: 'manager.chennai@joygroup.in',
        role: 'MANAGER',
        expectedPortal: PortalType.EMPLOYEE_HR,
        expectedRoute: 'dashboard',
        organizationId: this.ORG_ID,
        companyId: this.CHENNAI_COMPANY_ID,
      },
      {
        code: 'EMPLOYEE_CHENNAI',
        name: 'Deepak Raj (Senior Developer)',
        email: 'emp01.chennai@joygroup.in',
        role: 'EMPLOYEE',
        expectedPortal: PortalType.EMPLOYEE_HR,
        expectedRoute: 'ess-dashboard',
        organizationId: this.ORG_ID,
        companyId: this.CHENNAI_COMPANY_ID,
      },
      {
        code: 'VENDOR_ADMIN',
        name: 'Vikram Singh (ABC Security Lead)',
        email: 'admin@abcsecurity.in',
        role: 'VENDOR_ADMIN',
        expectedPortal: PortalType.VENDOR,
        expectedRoute: 'vendor-settlement-workspace',
        organizationId: this.ORG_ID,
        vendorId: this.VENDOR_ID,
      },
    ];

    // 2. Build 20 Employees for Chennai
    const chennaiEmployees: Employee[] = Array.from({ length: 20 }, (_, idx) => {
      const num = String(idx + 1).padStart(3, '0');
      return {
        id: `emp-chn-${num}`,
        employee_id: `JOY-CHN-${num}`,
        first_name: `ChennaiWorker_${num}`,
        last_name: 'Joy',
        email: `emp${num}.chennai@joygroup.in`,
        company_id: this.CHENNAI_COMPANY_ID,
        organization_id: this.ORG_ID,
        department: idx < 10 ? 'Engineering' : 'Operations',
        designation: idx === 0 ? 'Senior Developer' : 'Team Member',
        status: 'Active',
        salary: 40000 + (idx * 2500),
        joining_date: '2025-01-15',
        created_at: new Date().toISOString(),
      } as unknown as Employee;
    });

    // 3. Build 10 Employees for Coimbatore
    const cbeEmployees: Employee[] = Array.from({ length: 10 }, (_, idx) => {
      const num = String(idx + 1).padStart(3, '0');
      return {
        id: `emp-cbe-${num}`,
        employee_id: `JOY-CBE-${num}`,
        first_name: `CbeWorker_${num}`,
        last_name: 'Joy',
        email: `emp${num}.cbe@joygroup.in`,
        company_id: this.CBE_COMPANY_ID,
        organization_id: this.ORG_ID,
        department: 'Manufacturing',
        designation: 'Plant Specialist',
        status: 'Active',
        salary: 35000 + (idx * 2000),
        joining_date: '2025-03-01',
        created_at: new Date().toISOString(),
      } as unknown as Employee;
    });

    // 4. Build 15 Vendor Contract Workers for ABC Security Services
    const vendorWorkers = Array.from({ length: 15 }, (_, idx) => {
      const num = String(idx + 1).padStart(3, '0');
      return {
        id: `wrk-abc-${num}`,
        vendorId: this.VENDOR_ID,
        name: `Contractor Guard ${num}`,
        dailyWage: 850,
        skillCategory: idx < 5 ? 'SKILLED' : 'SEMI_SKILLED',
        trade: 'Physical Security & Access Control',
      };
    });

    return {
      organization: {
        id: this.ORG_ID,
        name: 'JOY DEMO GROUP',
        code: 'JOY-GRP',
        plan: 'ENTERPRISE_PREMIUM',
      },
      companies: [
        {
          id: this.CHENNAI_COMPANY_ID,
          name: 'JOY Chennai Pvt Ltd',
          code: 'JOY-CHN',
          state: 'Tamil Nadu',
          city: 'Chennai',
          employeeCount: 20,
        },
        {
          id: this.CBE_COMPANY_ID,
          name: 'JOY Coimbatore Pvt Ltd',
          code: 'JOY-CBE',
          state: 'Tamil Nadu',
          city: 'Coimbatore',
          employeeCount: 10,
        },
      ],
      vendor: {
        id: this.VENDOR_ID,
        name: 'ABC Security Services',
        code: 'VEN-ABC-001',
        serviceChargePct: 8.5,
        workerCount: 15,
      },
      personas,
      employees: [...chennaiEmployees, ...cbeEmployees],
      vendorWorkers,
    };
  }

  /**
   * Resolves the authoritative AuthContext for a given persona in the seed dataset
   */
  public static resolvePersonaAuth(personaCode: string): AuthContext {
    const dataset = this.generateSeedDataset();
    const persona = dataset.personas.find((p) => p.code === personaCode);
    if (!persona) {
      throw new Error(`[ProductionLaunchSeedDataService] Unknown persona code: ${personaCode}`);
    }

    return PortalAccessResolver.resolve({
      userId: `user-${persona.code.toLowerCase()}`,
      authUserId: `auth-${persona.code.toLowerCase()}`,
      email: persona.email,
      fullName: persona.name,
      accountStatus: 'ACTIVE',
      organizationId: persona.organizationId,
      companyId: persona.companyId,
      vendorId: persona.vendorId,
      isPlatformAdmin: persona.isPlatformAdmin,
      rawRoles: [persona.role],
    });
  }
}
