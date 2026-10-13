// src/types/saasCatalogue.ts
// ============================================================================
// Joy PeopleHR — SaaS Product Catalogue, Commercial Entitlements & Pricing Types
// Separates Master Product Catalogue, Commercial Plans, and Engineering Flags
// ============================================================================

export type ImplementationStatus = 'Implemented' | 'Partial' | 'Planned' | 'Internal';

export type CommercialType =
  | 'Included'
  | 'Premium'
  | 'Add-on'
  | 'Enterprise'
  | 'Usage-based'
  | 'Internal Only';

export type PlanTierCode = 'STARTER' | 'PREMIUM' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';

export type BillingCycle = 'Monthly' | 'Annual' | 'Two-Year' | 'Custom';

export interface FeatureDependency {
  featureKey: string;
  name: string;
  moduleKey: string;
  required: boolean;
}

export interface CommercialFeature {
  id: string;
  featureKey: string;
  name: string;
  moduleKey: string;
  moduleName: string;
  groupName: string;
  description: string;
  implementationStatus: ImplementationStatus;
  commercialType: CommercialType;
  minPlan: PlanTierCode;
  availableInPlans: PlanTierCode[];
  isAddon: boolean;
  addonPriceMonthly?: number;
  dependencies: FeatureDependency[];
  usageMeter?: {
    unit: string;
    includedPerMonth?: number;
    overageRatePerUnit?: number;
  };
  associatedRoutes?: string[];
  codeReference?: string;
}

export interface CommercialModule {
  id: string;
  moduleNumber: string; // e.g. "01", "02"
  moduleKey: string;
  name: string;
  tier: string; // e.g. "Tier 1 — HR Foundation"
  shortDescription: string;
  commercialStatus: 'Core Included' | 'Commercial Standard' | 'Commercial Premium' | 'Enterprise Advanced';
  includedInPlans: PlanTierCode[];
  availableAsAddon: boolean;
  defaultAddonPriceMonthly?: number;
  featuresCount: number;
  features: CommercialFeature[];
  iconName: string;
}

export interface VolumePricingBand {
  minEmployees: number;
  maxEmployees: number; // e.g. 50, 200, 500, 999999
  pepmPrice: number; // Monthly price per employee per month
  annualPepmPrice?: number; // Discounted annual rate per employee per month
  onboardingSetupFee?: number; // Fixed one-time onboarding/biometric setup fee
  label: string;
  isIncluded?: boolean;
  isCustom?: boolean;
}

export interface CommercialPlan {
  id: string;
  code: PlanTierCode;
  name: string;
  displayName: string;
  tagline: string;
  description: string;
  targetAudience: string;
  isPopular?: boolean;
  status: 'Active' | 'Draft' | 'Archived';
  baseMonthlyPrice: number;
  includedEmployees: number;
  additionalEmployeePrice: number; // Default PEPM
  volumeBands: VolumePricingBand[];
  includedModules: string[]; // moduleKeys
  includedFeatures: string[]; // featureKeys
  activeSubscriptionsCount: number;
  mrrFormatted: string;
  quotas: {
    maxEmployees: number;
    maxAdminUsers: number;
    maxLocations: number;
    maxCompanies: number;
    maxBiometricDevices: number;
    storageGb: number;
    apiCallsPerDay: number;
    includedWhatsAppMessagesPerMonth: number;
    supportSla: string;
  };
}

export interface CommercialAddon {
  id: string;
  addonKey: string;
  name: string;
  moduleKey?: string;
  description: string;
  category: 'Module Add-on' | 'Infrastructure & API' | 'Communication Meter' | 'Enterprise Support' | 'Product Add-ons' | 'Communication' | 'Integrations' | 'Infrastructure' | 'Support' | 'Services' | string;
  monthlyPrice: number;
  billingUnit: 'Per Month' | 'Per Employee / Mo' | 'Per Device / Mo' | 'Per 100 GB / Mo' | 'Per Message Meter' | string;
  pricingModel?: 'FIXED' | 'PER_EMPLOYEE' | 'METERED';
  includedQuantity?: number;
  additionalUsageRate?: number;
  availableForPlans: PlanTierCode[];
  isActive: boolean;
  iconName: string;
}

export interface PricingCalculationInput {
  planCode: PlanTierCode;
  employeeCount: number;
  billingCycle: BillingCycle;
  selectedAddonKeys: string[];
  locationsCount?: number;
  companiesCount?: number;
  extraBiometricDevices?: number;
  extraStorage100GbUnits?: number;
  monthlyWhatsAppMessages?: number;
  customDiscountPercent?: number;
  enterpriseOverridePrice?: number;
}

export interface PricingCalculationResult {
  planCode: PlanTierCode;
  planName: string;
  billingCycle: BillingCycle;
  employeeCount: number;
  baseMonthlyPrice: number;
  includedEmployees: number;
  additionalEmployeesCount: number;
  employeeOverageMonthly: number;
  appliedPepmRate: number;
  appliedVolumeBand?: string;
  appliedSetupFee?: number;
  itemizedAddons: Array<{
    addonKey: string;
    name: string;
    monthlyPrice: number;
    billingUnit: string;
  }>;
  addonsMonthlyTotal: number;
  usageMetersMonthlyTotal: number;
  usageMonthlyTotal?: number;
  grossMonthlyTotal: number;
  cycleMultiplier: number; // 1 for monthly, 12 for annual
  cycleDiscountPercent: number; // e.g. 10% for annual, 15% for 2-year
  cycleDiscountAmount: number;
  netPreTaxAmount: number;
  gstRatePercent: number; // 18%
  gstAmount: number;
  grandTotal: number;
  monthlyEquivalent: number;
  calculationSteps: string[];
  competitorComparison?: {
    greytHrEstimateMonthly: number;
    spineEstimateMonthly: number;
    monthlySavingsVsGreytHr: number;
    monthlySavingsVsSpine: number;
    annualSavingsVsGreytHr: number;
    annualSavingsVsSpine: number;
    savingsPercentVsGreytHr: number;
    savingsPercentVsSpine: number;
  };
}

export interface CustomerCommercialOverride {
  id: string;
  tenantId: string;
  tenantName: string;
  basePlan: PlanTierCode;
  customContractPriceMonthly: number;
  customEmployeeCount: number;
  includedAddons: string[];
  featureOverrides: Record<string, boolean>; // featureKey -> enabled/disabled
  limitOverrides: Record<string, number>;
  startDate: string;
  endDate: string;
  billingFrequency: BillingCycle;
  notes: string;
  approvedBy: string;
  approvedAt: string;
}
