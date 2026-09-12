// src/services/platform/tenantAdministrativeSetupService.ts
// ============================================================================
// Joy PeopleHR — Tenant Administrative Setup & Onboarding Authority Engine
// Gate 12.5: Multi-Company Provisioning, Setup Wizard Validation & Admin Lifecycle
// ============================================================================

export interface SetupWizardState {
  companyId: string;
  isProfileConfigured: boolean;
  isLocationsConfigured: boolean;
  isDepartmentsConfigured: boolean;
  isDesignationsConfigured: boolean;
  isShiftsConfigured: boolean;
  isHolidaysConfigured: boolean;
  isLeavePoliciesConfigured: boolean;
  isPayrollConfigured: boolean;
  isSetupComplete: boolean;
  completedStepsCount: number;
  totalStepsCount: number;
}

export interface ProvisionOrganizationInput {
  orgName: string;
  orgCode: string;
  planTier: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  primaryAdminEmail: string;
  primaryAdminName: string;
}

export interface ProvisionCompanyEntityInput {
  organizationId: string;
  companyName: string;
  companyCode: string;
  legalEntityName: string;
  cin?: string;
  pan: string;
  gstin: string;
  state: string;
  city: string;
  assignedAdminEmail?: string;
  assignedHrHeadEmail?: string;
}

export class TenantAdministrativeSetupService {
  private static organizationsDb: Map<string, any> = new Map();
  private static companiesDb: Map<string, any> = new Map();
  private static wizardStatesDb: Map<string, SetupWizardState> = new Map();

  /**
   * Resets local in-memory stores for clean testing
   */
  public static resetStores(): void {
    this.organizationsDb.clear();
    this.companiesDb.clear();
    this.wizardStatesDb.clear();
  }

  /**
   * Step 1: Platform Super Admin creates an Organization with Subscription Tier
   */
  public static provisionOrganization(input: ProvisionOrganizationInput): {
    organization: any;
    status: 'ACTIVE' | 'PENDING';
    subscription: any;
  } {
    const orgId = `org-${input.orgCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    if (this.organizationsDb.has(orgId)) {
      throw new Error(`[TenantAdministrativeSetupService] Organization with ID ${orgId} already exists.`);
    }

    const org = {
      id: orgId,
      name: input.orgName,
      code: input.orgCode,
      primary_admin_email: input.primaryAdminEmail,
      primary_admin_name: input.primaryAdminName,
      created_at: new Date().toISOString(),
      status: 'ACTIVE',
    };

    const maxCompanies = input.planTier === 'Enterprise' ? 100 : input.planTier === 'Business' ? 10 : 2;
    const subscription = {
      planTier: input.planTier,
      maxCompanies,
      maxEmployees: input.planTier === 'Enterprise' ? 5000 : 500,
      featuresEnabled: [
        'CORE_HR',
        'ATTENDANCE',
        'LEAVE',
        'PAYROLL',
        'OFFBOARDING',
        input.planTier !== 'Starter' ? 'VENDOR_MANAGEMENT' : null,
      ].filter(Boolean),
    };

    this.organizationsDb.set(orgId, { org, subscription });
    return { organization: org, status: 'ACTIVE', subscription };
  }

  /**
   * Step 2: Create a Company / Legal Entity under the Organization
   */
  public static provisionCompanyEntity(input: ProvisionCompanyEntityInput): {
    company: any;
    wizardState: SetupWizardState;
  } {
    const orgEntry = this.organizationsDb.get(input.organizationId);
    if (!orgEntry) {
      throw new Error(`[TenantAdministrativeSetupService] Organization ${input.organizationId} not found.`);
    }

    // Check plan company limit
    const existingCompanies = Array.from(this.companiesDb.values()).filter(
      (c) => c.organization_id === input.organizationId
    );
    if (existingCompanies.length >= orgEntry.subscription.maxCompanies) {
      throw new Error(
        `[TenantAdministrativeSetupService] Plan limit reached: Plan '${orgEntry.subscription.planTier}' allows maximum of ${orgEntry.subscription.maxCompanies} companies.`
      );
    }

    // Prevent duplicate company code under same organization
    const duplicateCode = existingCompanies.some((c) => c.code.toLowerCase() === input.companyCode.toLowerCase());
    if (duplicateCode) {
      throw new Error(`[TenantAdministrativeSetupService] Company with code '${input.companyCode}' already exists in this organization.`);
    }

    const companyId = `comp-${input.companyCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const company = {
      id: companyId,
      organization_id: input.organizationId,
      name: input.companyName,
      code: input.companyCode,
      legal_entity_name: input.legalEntityName,
      cin: input.cin,
      pan: input.pan,
      gstin: input.gstin,
      state: input.state,
      city: input.city,
      assigned_admin_email: input.assignedAdminEmail || null,
      assigned_hr_head_email: input.assignedHrHeadEmail || null,
      status: 'SETUP_IN_PROGRESS',
      created_at: new Date().toISOString(),
    };

    const initialWizardState: SetupWizardState = {
      companyId,
      isProfileConfigured: true,
      isLocationsConfigured: false,
      isDepartmentsConfigured: false,
      isDesignationsConfigured: false,
      isShiftsConfigured: false,
      isHolidaysConfigured: false,
      isLeavePoliciesConfigured: false,
      isPayrollConfigured: false,
      isSetupComplete: false,
      completedStepsCount: 1,
      totalStepsCount: 8,
    };

    this.companiesDb.set(companyId, company);
    this.wizardStatesDb.set(companyId, initialWizardState);

    return { company, wizardState: initialWizardState };
  }

  /**
   * Step 3: Progress and validate Company Setup Wizard
   */
  public static updateSetupWizardStep(
    companyId: string,
    stepKey: keyof Omit<SetupWizardState, 'companyId' | 'isSetupComplete' | 'completedStepsCount' | 'totalStepsCount'>,
    completed: boolean
  ): SetupWizardState {
    const state = this.wizardStatesDb.get(companyId);
    if (!state) {
      throw new Error(`[TenantAdministrativeSetupService] Setup wizard state for company ${companyId} not found.`);
    }

    (state as any)[stepKey] = completed;

    const steps = [
      state.isProfileConfigured,
      state.isLocationsConfigured,
      state.isDepartmentsConfigured,
      state.isDesignationsConfigured,
      state.isShiftsConfigured,
      state.isHolidaysConfigured,
      state.isLeavePoliciesConfigured,
      state.isPayrollConfigured,
    ];

    state.completedStepsCount = steps.filter(Boolean).length;
    state.isSetupComplete = state.completedStepsCount === state.totalStepsCount;

    const company = this.companiesDb.get(companyId);
    if (company && state.isSetupComplete) {
      company.status = 'ACTIVE';
    }

    return { ...state };
  }

  /**
   * Evaluates if a company is ready for employee onboarding
   */
  public static isReadyForEmployeeOnboarding(companyId: string): {
    ready: boolean;
    missingConfigurations: string[];
  } {
    const state = this.wizardStatesDb.get(companyId);
    if (!state) {
      return { ready: false, missingConfigurations: ['Company not found'] };
    }

    const missing: string[] = [];
    if (!state.isLocationsConfigured) missing.push('Locations & Branches');
    if (!state.isDepartmentsConfigured) missing.push('Departments');
    if (!state.isDesignationsConfigured) missing.push('Designations');
    if (!state.isShiftsConfigured) missing.push('Working Shifts');
    if (!state.isHolidaysConfigured) missing.push('Holiday Calendar');
    if (!state.isLeavePoliciesConfigured) missing.push('Leave Policies');
    if (!state.isPayrollConfigured) missing.push('Payroll & Statutory Config');

    return {
      ready: missing.length === 0,
      missingConfigurations: missing,
    };
  }

  /**
   * Verifies company switching authorization
   */
  public static authorizeCompanySwitch(
    organizationId: string,
    targetCompanyId: string,
    userRole: string,
    userAllowedCompanyId?: string
  ): {
    authorized: boolean;
    reason: string;
  } {
    const targetCompany = this.companiesDb.get(targetCompanyId);
    if (!targetCompany) {
      return { authorized: false, reason: 'Target company not found.' };
    }

    if (targetCompany.organization_id !== organizationId) {
      return { authorized: false, reason: 'Cross-tenant organization switch prohibited.' };
    }

    // Organization Admin can switch across all companies in the organization
    if (userRole === 'ORGANIZATION_ADMIN' || userRole === 'SUPER_ADMIN') {
      return { authorized: true, reason: 'Organization Admin has global group switching authority.' };
    }

    // Company Admin / HR Head is bounded to their specific company entity
    if (userAllowedCompanyId && userAllowedCompanyId === targetCompanyId) {
      return { authorized: true, reason: 'User authorized for target company.' };
    }

    return {
      authorized: false,
      reason: `Access denied: Role '${userRole}' is restricted to company '${userAllowedCompanyId}' and cannot access sibling '${targetCompanyId}'.`,
    };
  }
}
