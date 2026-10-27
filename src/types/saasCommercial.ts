
// src/types/saasCommercial.ts
// ============================================================================
// Joy PeopleHR — SaaS Commercial Architecture Type Definitions
// Unifies Quotations, Invoices, Payments, Tax SAC, and Commercial Snapshots
// ============================================================================

import { PlanTierCode, BillingCycle } from './saasCatalogue';

export type QuotationStatus =
  | 'DRAFT'
  | 'INTERNAL_REVIEW'
  | 'APPROVED'
  | 'SENT'
  | 'VIEWED'
  | 'NEGOTIATION'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'CONVERTED';

export type InvoiceType =
  | 'TAX_INVOICE'
  | 'PROFORMA'
  | 'RECURRING'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE';

export type InvoiceStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Issued'
  | 'Sent'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled'
  | 'Void';

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'DISCOVERY'
  | 'REQUIREMENT_CAPTURED'
  | 'PRICING'
  | 'QUOTATION_SENT'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'DISQUALIFIED';

export type LeadSource =
  | 'Website'
  | 'Inbound Demo'
  | 'Referral'
  | 'LinkedIn'
  | 'Outbound Campaign'
  | 'Event';

export interface CrmLead {
  id: string;
  leadNumber: string; // LEAD-2026-0048
  companyName: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  website?: string;
  industry: string;
  estimatedEmployees: number;
  locationsCount?: number;
  source: LeadSource;
  salesOwner: string;
  stage: LeadStage;
  requirements?: string[];
  notes?: string;
  opportunityId?: string;
  convertedClientId?: string;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityStage =
  | 'DISCOVERY'
  | 'REQUIREMENT'
  | 'PRICING'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export interface CrmOpportunity {
  id: string;
  opportunityNumber: string; // OPP-2026-0031
  dealName: string;
  leadId?: string;
  leadNumber?: string;
  clientId?: string; // If existing client expansion/renewal
  clientName?: string;
  companyName: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  industry: string;
  estimatedEmployees: number;
  locationsCount: number;
  legalEntitiesCount: number;
  estimatedArr: number;
  probability: number; // e.g. 70 (%)
  expectedCloseDate: string;
  salesOwner: string;
  stage: OpportunityStage;
  capturedRequirements: string[];
  quotationIds?: string[];
  activeQuotationId?: string;
  originType: 'NEW_CUSTOMER' | 'EXISTING_CUSTOMER';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialSalesOwner {
  id: string; // e.g. 'so-01'
  staffId?: string; // Optional link to platform_staff table
  name: string;
  email: string;
  phone?: string;
  designation: string; // e.g. 'Commercial Lead & Enterprise Solutions'
  territory: string; // e.g. 'India (South) & Strategic Accounts'
  annualQuotaArr: number; // in INR
  closedWonArr: number; // in INR
  activeDealsCount: number;
  totalPipelineValue: number; // in INR
  winRatePct: number;
  status: 'Active' | 'Inactive';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuotationOriginType = 'NEW_CUSTOMER' | 'EXISTING_CUSTOMER';

export type QuotationPurpose =
  | 'NEW_SUBSCRIPTION'
  | 'PLAN_UPGRADE'
  | 'PLAN_DOWNGRADE'
  | 'ADDITIONAL_SEATS'
  | 'ADD_MODULES'
  | 'EXPANSION'
  | 'RENEWAL'
  | 'CONTRACT_AMENDMENT';

export interface CommercialClient {
  id: string;
  clientCode: string; // e.g. CLI-00124
  legalName: string;
  tradeName?: string;
  logoUrl?: string; // Optimized company logo URL or Base64 data URI
  organizationId?: string;
  leadId?: string;
  opportunityId?: string;
  gstin: string;
  pan: string;
  cin?: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  website?: string;
  billingAddress: {
    line1: string;
    city: string;
    state: string; // e.g. "Tamil Nadu", "Maharashtra"
    country: string; // "India"
    pinCode: string;
  };
  primaryContact?: {
    name?: string;
    email?: string;
    phone?: string;
    designation?: string;
  } | any;
  billingContact?: {
    name?: string;
    email?: string;
    phone?: string;
    designation?: string;
  } | any;
  industry: string;
  employeeCount: number;
  locationsCount?: number;
  companiesCount?: number;
  customerType?: 'Enterprise' | 'Mid-Market' | 'SMB';
  status?: 'Active' | 'Lead' | 'Churned';
  commercialStatus?: 'PENDING_ONBOARDING' | 'ACTIVE' | 'SUSPENDED' | 'CHURNED';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QuotationLineItem {
  id: string;
  sku: string;
  description: string;
  category: 'RECURRING_PLAN' | 'RECURRING_OVERAGE' | 'RECURRING_ADDON' | 'ONE_TIME_SERVICE' | 'USAGE_METER';
  quantity: number;
  unit: string; // "Plan", "Employee", "Module", "Session", "Device"
  unitRateMonthly: number;
  monthsCount: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  sacCode: string; // default "998313" (IT Software Services)
}

export interface OneTimeServiceItem {
  key: string;
  name: string;
  description: string;
  rate: number;
  selected: boolean;
}

export interface QuotationVersion {
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  grossAnnualValue: number;
  discountPercentage: number;
  discountAmount: number;
  netAnnualValue: number;
  oneTimeServicesTotal: number;
  gstAmount: number;
  totalContractValue: number;
  status: QuotationStatus;
  notes?: string;
}

export interface CommercialQuotation {
  id: string;
  quotationNumber: string; // QT-2026-00124
  version: number;
  originType: QuotationOriginType; // 'NEW_CUSTOMER' | 'EXISTING_CUSTOMER'
  purpose?: QuotationPurpose;
  opportunityId?: string;
  opportunityNumber?: string;
  leadId?: string;
  leadNumber?: string;
  clientId?: string; // Optional for prospects until converted to Client
  clientName: string; // Company / Prospect Name
  clientLogoUrl?: string; // Client Company Logo
  clientGstin?: string; // Optional for prospects ("Pending Verification")
  clientEmail: string;
  clientPhone?: string;
  clientState: string;
  salesOwner: string;
  planCode: PlanTierCode;
  planName: string;
  billingCycle: BillingCycle;
  employeeCount: number;
  includedEmployees: number;
  additionalEmployeesCount: number;
  pepmRate: number;
  selectedAddonKeys: string[];
  requirements: {
    employees: number;
    companies: number;
    locations: number;
    modulesRequested: string[];
    ssoRequired: boolean;
    apiTier: string;
  };
  lineItems: QuotationLineItem[];
  oneTimeServices: OneTimeServiceItem[];
  // Pricing Snapshot (Immutable)
  pricingSnapshot: {
    pricingVersionId: string;
    basePlanMonthly: number;
    overageMonthly: number;
    addonsMonthly: number;
    grossMonthlyRunRate: number;
    cycleMultiplier: number;
    termDiscountPercent: number;
    negotiatedDiscountPercent: number;
    totalDiscountPercent: number;
    discountAmount: number;
    recurringPreTax: number;
    oneTimePreTax: number;
    taxableSubtotal: number;
    gstRatePercent: number; // 18
    gstAmount: number;
    totalFirstYearValue: number;
  };
  approval: {
    required: boolean;
    tier: 'Sales' | 'Sales Manager' | 'Commercial Head' | 'Super Admin';
    approvedBy?: string;
    approvedAt?: string;
    approvalComments?: string;
  };
  terms?: {
    contractDurationMonths: number;
    billingFrequency: string;
    paymentTerms: string;
    subscriptionStartDate: string;
    renewalTerm: string;
    quotationValidityDays: number;
    annualEscalationPct: number;
    implementationTimelineWeeks: string;
  };
  solutionConfig?: {
    requirements: string[];
    biometricRequired: boolean;
    biometricDevicesCount: number;
    biometricIntegration: string;
    payrollFrequency: string;
    payrollStatutory: string[];
    analyticsTiers: string[];
    vendorWorkforceRequired: boolean;
    vendorPortalRequired: boolean;
    procurementRequired: boolean;
    invoiceSettlementRequired: boolean;
    clientBillingRequired: boolean;
  };
  status: QuotationStatus;
  validUntil: string;
  paymentLink?: string;
  razorpayQrPayload?: string;
  createdAt: string;
  updatedAt: string;
  convertedClientId?: string;
  convertedOrgId?: string;
  convertedSubscriptionId?: string;
  versions: QuotationVersion[];
}

export interface InvoiceLineItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxableValue: number;
  sacCode: string;
  cgstRate: number; // e.g. 9
  cgstAmount: number;
  sgstRate: number; // e.g. 9
  sgstAmount: number;
  igstRate: number; // e.g. 18
  igstAmount: number;
  totalLineAmount: number;
}

export type PaymentMethod =
  | 'NEFT'
  | 'RTGS'
  | 'IMPS'
  | 'UPI'
  | 'Credit Card'
  | 'Debit Card'
  | 'Net Banking'
  | 'Cheque'
  | 'Bank Transfer (NEFT/RTGS)';

export interface InvoicePaymentRecord {
  id: string;
  paymentNumber: string; // PAY-2026-00124
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  utrOrReference: string;
  paymentDate: string;
  receivedBy: string;
  verified: boolean;
  notes?: string;
}

export interface SaaSInvoice {
  id: string;
  invoiceNumber: string; // INV/26-27/000184
  invoiceType: InvoiceType;
  financialYear: string; // "26-27"
  clientId: string;
  clientName: string;
  clientGstin: string;
  clientAddress: string;
  clientState: string;
  supplierName: string;
  supplierGstin: string;
  supplierState: string; // "Tamil Nadu" (Code 33)
  placeOfSupply: string; // State of client
  isInterState: boolean;
  subscriptionId?: string;
  quotationId?: string;
  relatedOriginalInvoiceId?: string; // For Credit Note / Debit Note
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalInvoiceAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  paymentTerms: string; // "15 Days"
  bankDetails: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
    upiId: string;
  };
  payments: InvoicePaymentRecord[];
  createdAt: string;
  notes?: string;
}
