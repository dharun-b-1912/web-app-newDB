// src/services/platform/saasCommercialService.ts
// ============================================================================
// Joy PeopleHR — Master SaaS Commercial Lifecycle Service
// Unifies Quotation Maker, Immutable Pricing Snapshots, Invoices & Payments
// ============================================================================

import {
  CommercialClient,
  CommercialQuotation,
  QuotationLineItem,
  OneTimeServiceItem,
  QuotationVersion,
  QuotationStatus,
  SaaSInvoice,
  InvoiceLineItem,
  InvoicePaymentRecord,
  InvoiceType,
  InvoiceStatus,
  CrmLead,
  CrmOpportunity,
  LeadStage,
  OpportunityStage,
  QuotationOriginType,
  QuotationPurpose,
} from '../../types/saasCommercial';
import { PlanTierCode, BillingCycle } from '../../types/saasCatalogue';
import { saasPricingEngine } from './saasPricingEngine';
import { saasCatalogueService } from './saasCatalogueService';
import { platformTenantService } from './platformTenantService';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

const STORAGE_KEY_LEADS = 'joy_saas_crm_leads_v1';
const STORAGE_KEY_OPPORTUNITIES = 'joy_saas_crm_opportunities_v1';
const STORAGE_KEY_CLIENTS = 'joy_saas_crm_clients_v1';
const STORAGE_KEY_QUOTES = 'joy_saas_quotations_v1';
const STORAGE_KEY_INVOICES = 'joy_saas_invoices_v1';
export const STORAGE_KEY_SUPPLIER_DETAILS = 'joy_saas_supplier_company_details_v1';

export interface SupplierCompanyDetails {
  legalName: string;
  tradeName: string;
  tagline?: string;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
  address: string;
  email: string;
  phone: string;
  website?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  bankDetails: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
    upiId: string;
  };
}

export const SUPPLIER_COMPANY_DETAILS: SupplierCompanyDetails = {
  legalName: 'JOY CORPORATE SOLUTIONS PRIVATE LIMITED',
  tradeName: 'Joy PeopleHR',
  tagline: 'Enterprise Workforce Cloud',
  gstin: '33AABCJ1928K1Z5',
  pan: 'AABCJ1928K',
  state: 'Tamil Nadu',
  stateCode: '33',
  address: 'Level 6, Joy Tech Park, OMR IT Highway, Chennai, Tamil Nadu 600096, India',
  email: 'billing@joypeoplehr.com',
  phone: '+91 (044) 6912-8800',
  website: 'https://joypeoplehr.com',
  signatoryName: 'Arun K',
  signatoryDesignation: 'Commercial Lead & Enterprise Solutions',
  bankDetails: {
    accountName: 'JOY CORPORATE SOLUTIONS PRIVATE LIMITED',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50200088921822',
    ifsc: 'HDFC0000128',
    branch: 'OMR Sholinganallur Branch, Chennai',
    upiId: 'joypeoplehr@hdfcbank',
  },
};

export const INITIAL_LEADS: CrmLead[] = [
  {
    id: 'lead-01',
    leadNumber: 'LEAD-2026-0048',
    companyName: 'ABC Industries Pvt Ltd',
    contactPerson: 'Rajesh Kumar',
    designation: 'HR Head',
    email: 'rajesh@abcindustries.in',
    phone: '+91 98401 23456',
    website: 'https://abcindustries.in',
    industry: 'Manufacturing',
    estimatedEmployees: 850,
    locationsCount: 12,
    source: 'Website',
    salesOwner: 'Arun K',
    stage: 'QUALIFIED',
    requirements: [
      'core_hr',
      'ess',
      'attendance',
      'leave',
      'payroll',
      'biometric',
      'recruitment',
      'performance',
      'vendor_workforce',
      'procurement',
    ],
    opportunityId: 'opp-01',
    createdAt: '2026-09-01',
    updatedAt: '2026-09-12',
  },
  {
    id: 'lead-02',
    leadNumber: 'LEAD-2026-0052',
    companyName: 'Zenith Life Sciences & Healthcare',
    contactPerson: 'Dr. Sunita Rao',
    designation: 'Director — People Operations',
    email: 'sunita.rao@zenithlifesciences.com',
    phone: '+91 98112 44332',
    website: 'https://zenithlifesciences.com',
    industry: 'Pharmaceuticals & Healthcare',
    estimatedEmployees: 420,
    locationsCount: 6,
    source: 'Inbound Demo',
    salesOwner: 'Priya Sharma',
    stage: 'REQUIREMENT_CAPTURED',
    requirements: ['core_hr', 'ess', 'attendance', 'leave', 'payroll', 'biometric', 'expense'],
    opportunityId: 'opp-02',
    createdAt: '2026-09-14',
    updatedAt: '2026-09-28',
  },
  {
    id: 'lead-03',
    leadNumber: 'LEAD-2026-0061',
    companyName: 'Apex Steel & Heavy Engineering Works',
    contactPerson: 'Karan Mehra',
    designation: 'General Manager — HR & Administration',
    email: 'karan.m@apexsteel.co.in',
    phone: '+91 98220 54321',
    website: 'https://apexsteel.co.in',
    industry: 'Industrial Engineering',
    estimatedEmployees: 1100,
    locationsCount: 8,
    source: 'Referral',
    salesOwner: 'Arun K',
    stage: 'QUALIFIED',
    requirements: [
      'core_hr',
      'ess',
      'attendance',
      'leave',
      'payroll',
      'biometric',
      'vendor_workforce',
      'procurement',
      'invoice_settlement',
    ],
    createdAt: '2026-09-20',
    updatedAt: '2026-10-01',
  },
];

export const INITIAL_OPPORTUNITIES: CrmOpportunity[] = [
  {
    id: 'opp-01',
    opportunityNumber: 'OPP-2026-0031',
    dealName: 'ABC Industries — Enterprise HRMS & Vendor Workforce Rollout',
    leadId: 'lead-01',
    leadNumber: 'LEAD-2026-0048',
    companyName: 'ABC Industries Pvt Ltd',
    contactPerson: 'Rajesh Kumar',
    designation: 'HR Head',
    email: 'rajesh@abcindustries.in',
    phone: '+91 98401 23456',
    industry: 'Manufacturing',
    estimatedEmployees: 850,
    locationsCount: 12,
    legalEntitiesCount: 2,
    estimatedArr: 850000,
    probability: 70,
    expectedCloseDate: '2026-10-31',
    salesOwner: 'Arun K',
    stage: 'PROPOSAL',
    originType: 'NEW_CUSTOMER',
    capturedRequirements: [
      'core_hr',
      'ess',
      'attendance',
      'leave',
      'payroll',
      'biometric',
      'recruitment',
      'performance',
      'vendor_workforce',
      'procurement',
    ],
    quotationIds: ['qt-01'],
    activeQuotationId: 'qt-01',
    createdAt: '2026-09-12',
    updatedAt: '2026-10-02',
  },
  {
    id: 'opp-02',
    opportunityNumber: 'OPP-2026-0035',
    dealName: 'Zenith Healthcare — Multi-Facility Clinical HR & Payroll',
    leadId: 'lead-02',
    leadNumber: 'LEAD-2026-0052',
    companyName: 'Zenith Life Sciences & Healthcare',
    contactPerson: 'Dr. Sunita Rao',
    designation: 'Director — People Operations',
    email: 'sunita.rao@zenithlifesciences.com',
    phone: '+91 98112 44332',
    industry: 'Pharmaceuticals & Healthcare',
    estimatedEmployees: 420,
    locationsCount: 6,
    legalEntitiesCount: 1,
    estimatedArr: 450000,
    probability: 60,
    expectedCloseDate: '2026-11-15',
    salesOwner: 'Priya Sharma',
    stage: 'REQUIREMENT',
    originType: 'NEW_CUSTOMER',
    capturedRequirements: ['core_hr', 'ess', 'attendance', 'leave', 'payroll', 'biometric', 'expense'],
    quotationIds: ['qt-03'],
    activeQuotationId: 'qt-03',
    createdAt: '2026-09-28',
    updatedAt: '2026-10-04',
  },
  {
    id: 'opp-03',
    opportunityNumber: 'OPP-2026-0039',
    dealName: 'XYZ Express Logistics — Fleet & Contractor Workforce Expansion',
    clientId: 'cli-02',
    clientName: 'XYZ Logistics & Supply Chain Pvt Ltd',
    companyName: 'XYZ Logistics & Supply Chain Pvt Ltd',
    contactPerson: 'Pooja Hegde',
    designation: 'VP People & Culture',
    email: 'pooja.h@xyzlogistics.com',
    phone: '+91 98801 87654',
    industry: 'Warehousing & 3PL Logistics',
    estimatedEmployees: 500,
    locationsCount: 8,
    legalEntitiesCount: 1,
    estimatedArr: 360000,
    probability: 85,
    expectedCloseDate: '2026-11-05',
    salesOwner: 'Arun K',
    stage: 'PROPOSAL',
    originType: 'EXISTING_CUSTOMER',
    capturedRequirements: [
      'core_hr',
      'ess',
      'attendance',
      'leave',
      'payroll',
      'vendor_workforce',
      'vendor_portal',
    ],
    quotationIds: ['qt-02'],
    activeQuotationId: 'qt-02',
    createdAt: '2026-09-20',
    updatedAt: '2026-10-04',
  },
];

export const INITIAL_CLIENTS: CommercialClient[] = [
  {
    id: 'cli-01',
    clientCode: 'CLI-2026-00124',
    legalName: 'ABC Industries Private Limited',
    tradeName: 'ABC Manufacturing & Heavy Engineering',
    gstin: '33AABCA4589E1Z2',
    pan: 'AABCA4589E',
    contactPerson: 'Rajesh Kumar',
    designation: 'HR Head',
    email: 'rajesh@abc.com',
    phone: '+91 98401 23456',
    website: 'https://abcindustries.in',
    billingAddress: {
      line1: 'Plot 45, Ambattur Industrial Estate',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      pinCode: '600058',
    },
    industry: 'Manufacturing',
    employeeCount: 850,
    locationsCount: 12,
    companiesCount: 2,
    customerType: 'Enterprise',
    status: 'Active',
    createdAt: '2026-02-15',
  },
  {
    id: 'cli-02',
    clientCode: 'CLI-2026-00123',
    legalName: 'XYZ Logistics & Supply Chain Pvt Ltd',
    tradeName: 'XYZ Express Logistics',
    gstin: '29AABCX9912F1Z8',
    pan: 'AABCX9912F',
    contactPerson: 'Pooja Hegde',
    designation: 'VP People & Culture',
    email: 'pooja.h@xyzlogistics.com',
    phone: '+91 98801 87654',
    website: 'https://xyzlogistics.com',
    billingAddress: {
      line1: 'Outer Ring Road, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pinCode: '560103',
    },
    industry: 'Warehousing & 3PL Logistics',
    employeeCount: 240,
    customerType: 'Mid-Market',
    status: 'Active',
    createdAt: '2026-04-10',
  },
  {
    id: 'cli-03',
    clientCode: 'CLI-2026-00122',
    legalName: 'Metro Infrastructure & Construction Group',
    tradeName: 'Metro Infra Consortium',
    gstin: '27AABCM3312Q1ZX',
    pan: 'AABCM3312Q',
    contactPerson: 'Suresh Gaikwad',
    designation: 'Chief Human Resources Officer (CHRO)',
    email: 'suresh.g@metroinfra.in',
    phone: '+91 98200 99887',
    website: 'https://metroinfra.in',
    billingAddress: {
      line1: 'Bandra-Kurla Complex (BKC)',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pinCode: '400051',
    },
    industry: 'Infrastructure & EPC',
    employeeCount: 4500,
    customerType: 'Enterprise',
    status: 'Lead',
    createdAt: '2026-06-20',
  },
];

export const DEFAULT_ONE_TIME_SERVICES: OneTimeServiceItem[] = [
  { key: 'impl_setup', name: 'Enterprise Deployment & Account Setup', description: 'Multi-entity org structure, branches, roles & permission mapping.', rate: 30000, selected: true },
  { key: 'data_migration', name: 'Legacy HR & Employee Data Migration', description: 'Sanitization, historical leave ledger balance, and employee master migration.', rate: 25000, selected: true },
  { key: 'biometric_config', name: 'Biometric Turnstile Push Gateway Setup', description: 'Daemon setup on-premise, ADMS port forwarding, and gate mapping.', rate: 20000, selected: false },
  { key: 'payroll_config', name: 'Custom Salary Structures & Statutory Compliance Setup', description: 'CTC rule builder, PF/ESI/PT slab verification, and bank payout advice formats.', rate: 25000, selected: true },
  { key: 'admin_training', name: 'HR Staff & Supervisor Training Program', description: 'Comprehensive video webinars and live training for HR admins and site managers.', rate: 15000, selected: true },
];

export const INITIAL_QUOTATIONS: CommercialQuotation[] = [
  {
    id: 'qt-01',
    quotationNumber: 'QT-2026-00124',
    version: 1,
    originType: 'NEW_CUSTOMER',
    purpose: 'NEW_SUBSCRIPTION',
    opportunityId: 'opp-01',
    opportunityNumber: 'OPP-2026-0031',
    leadId: 'lead-01',
    leadNumber: 'LEAD-2026-0048',
    clientName: 'ABC Industries Pvt Ltd',
    clientGstin: '33AABCA4589E1Z2',
    clientEmail: 'rajesh@abcindustries.in',
    clientPhone: '+91 98401 23456',
    clientState: 'Tamil Nadu',
    salesOwner: 'Arun K (Commercial Lead)',
    planCode: 'BUSINESS',
    planName: 'Business',
    billingCycle: 'Annual',
    employeeCount: 850,
    includedEmployees: 100,
    additionalEmployeesCount: 750,
    pepmRate: 50,
    selectedAddonKeys: ['recruitment_suite', 'vendor_workforce_mgmt', 'invoice_3way_matching'],
    requirements: {
      employees: 850,
      companies: 2,
      locations: 12,
      modulesRequested: ['Core HR', 'Attendance', 'Payroll', 'Recruitment', 'Vendor Workforce', 'Invoice Matching'],
      ssoRequired: true,
      apiTier: 'Advanced REST',
    },
    lineItems: [
      {
        id: 'li-1',
        sku: 'PLAN-BIZ',
        description: 'Joy Business SaaS Subscription (Includes 100 Employees)',
        category: 'RECURRING_PLAN',
        quantity: 1,
        unit: 'Plan',
        unitRateMonthly: 9999,
        monthsCount: 12,
        grossAmount: 119988,
        discountAmount: 11999,
        netAmount: 107989,
        sacCode: '998313',
      },
      {
        id: 'li-2',
        sku: 'SEAT-OVERAGE',
        description: 'Workforce Seat Expansion (750 Additional Employees @ ₹50 PEPM)',
        category: 'RECURRING_OVERAGE',
        quantity: 750,
        unit: 'Employee',
        unitRateMonthly: 50,
        monthsCount: 12,
        grossAmount: 450000,
        discountAmount: 45000,
        netAmount: 405000,
        sacCode: '998313',
      },
      {
        id: 'li-3',
        sku: 'ADDON-VENDOR',
        description: 'Vendor Workforce Management Module',
        category: 'RECURRING_ADDON',
        quantity: 1,
        unit: 'Module',
        unitRateMonthly: 4999,
        monthsCount: 12,
        grossAmount: 59988,
        discountAmount: 5999,
        netAmount: 53989,
        sacCode: '998313',
      },
      {
        id: 'li-4',
        sku: 'ADDON-MATCH',
        description: 'Invoice & 3-Way Match Settlement Engine',
        category: 'RECURRING_ADDON',
        quantity: 1,
        unit: 'Module',
        unitRateMonthly: 3999,
        monthsCount: 12,
        grossAmount: 47988,
        discountAmount: 4799,
        netAmount: 43189,
        sacCode: '998313',
      },
    ],
    oneTimeServices: [
      { key: 'impl_setup', name: 'Enterprise Deployment & Account Setup', description: 'Multi-entity setup', rate: 30000, selected: true },
      { key: 'payroll_config', name: 'Custom Salary Structures & Statutory Compliance Setup', description: 'CTC rule builder', rate: 25000, selected: true },
    ],
    pricingSnapshot: {
      pricingVersionId: 'pv-2026-q3',
      basePlanMonthly: 9999,
      overageMonthly: 37500,
      addonsMonthly: 8998,
      grossMonthlyRunRate: 56497,
      cycleMultiplier: 12,
      termDiscountPercent: 10,
      negotiatedDiscountPercent: 5,
      totalDiscountPercent: 15,
      discountAmount: 101694,
      recurringPreTax: 576270,
      oneTimePreTax: 55000,
      taxableSubtotal: 631270,
      gstRatePercent: 18,
      gstAmount: 113629,
      totalFirstYearValue: 744899,
    },
    approval: {
      required: true,
      tier: 'Commercial Head',
      approvedBy: 'Siddharth (VP Commercial)',
      approvedAt: '2026-10-02T11:00:00Z',
      approvalComments: 'Approved 15% combined term + negotiated enterprise discount for annual prepayment.',
    },
    status: 'SENT',
    validUntil: '2026-10-31',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-02',
    versions: [
      {
        versionNumber: 1,
        createdAt: '2026-10-01',
        createdBy: 'Arun K',
        grossAnnualValue: 677964,
        discountPercentage: 15,
        discountAmount: 101694,
        netAnnualValue: 576270,
        oneTimeServicesTotal: 55000,
        gstAmount: 113629,
        totalContractValue: 744899,
        status: 'SENT',
      },
    ],
  },
  {
    id: 'qt-02',
    quotationNumber: 'QT-2026-00123',
    version: 2,
    originType: 'EXISTING_CUSTOMER',
    purpose: 'ADDITIONAL_SEATS',
    opportunityId: 'opp-03',
    opportunityNumber: 'OPP-2026-0039',
    clientId: 'cli-02',
    clientName: 'XYZ Logistics & Supply Chain Pvt Ltd',
    clientGstin: '29AABCX9912F1Z8',
    clientEmail: 'pooja.h@xyzlogistics.com',
    clientPhone: '+91 98801 87654',
    clientState: 'Karnataka',
    salesOwner: 'Priya Sharma',
    planCode: 'PROFESSIONAL',
    planName: 'Professional',
    billingCycle: 'Annual',
    employeeCount: 240,
    includedEmployees: 100,
    additionalEmployeesCount: 140,
    pepmRate: 60,
    selectedAddonKeys: ['recruitment_suite'],
    requirements: {
      employees: 240,
      companies: 1,
      locations: 5,
      modulesRequested: ['Core HR', 'Attendance GPS', 'Payroll PF/ESI', 'Recruitment'],
      ssoRequired: false,
      apiTier: 'Standard',
    },
    lineItems: [],
    oneTimeServices: [
      { key: 'impl_setup', name: 'Enterprise Deployment & Account Setup', description: 'Setup', rate: 20000, selected: true },
    ],
    pricingSnapshot: {
      pricingVersionId: 'pv-2026-q3',
      basePlanMonthly: 5999,
      overageMonthly: 8400,
      addonsMonthly: 2499,
      grossMonthlyRunRate: 16898,
      cycleMultiplier: 12,
      termDiscountPercent: 10,
      negotiatedDiscountPercent: 0,
      totalDiscountPercent: 10,
      discountAmount: 20278,
      recurringPreTax: 182498,
      oneTimePreTax: 20000,
      taxableSubtotal: 202498,
      gstRatePercent: 18,
      gstAmount: 36450,
      totalFirstYearValue: 238948,
    },
    approval: {
      required: false,
      tier: 'Sales',
    },
    status: 'ACCEPTED',
    validUntil: '2026-10-20',
    createdAt: '2026-09-25',
    updatedAt: '2026-10-04',
    convertedSubscriptionId: 'sub-xyz-2026',
    versions: [
      {
        versionNumber: 1,
        createdAt: '2026-09-25',
        createdBy: 'Priya Sharma',
        grossAnnualValue: 202776,
        discountPercentage: 0,
        discountAmount: 0,
        netAnnualValue: 202776,
        oneTimeServicesTotal: 20000,
        gstAmount: 40099,
        totalContractValue: 262875,
        status: 'NEGOTIATION',
      },
      {
        versionNumber: 2,
        createdAt: '2026-10-04',
        createdBy: 'Priya Sharma',
        grossAnnualValue: 202776,
        discountPercentage: 10,
        discountAmount: 20278,
        netAnnualValue: 182498,
        oneTimeServicesTotal: 20000,
        gstAmount: 36450,
        totalContractValue: 238948,
        status: 'ACCEPTED',
      },
    ],
  },
];

export const INITIAL_INVOICES: SaaSInvoice[] = [
  {
    id: 'inv-01',
    invoiceNumber: 'INV/26-27/000184',
    invoiceType: 'TAX_INVOICE',
    financialYear: '26-27',
    clientId: 'cli-01',
    clientName: 'ABC Industries Private Limited',
    clientGstin: '33AABCA4589E1Z2',
    clientAddress: 'Plot 45, Ambattur Industrial Estate, Chennai, Tamil Nadu 600058',
    clientState: 'Tamil Nadu',
    supplierName: SUPPLIER_COMPANY_DETAILS.legalName,
    supplierGstin: SUPPLIER_COMPANY_DETAILS.gstin,
    supplierState: SUPPLIER_COMPANY_DETAILS.state,
    placeOfSupply: 'Tamil Nadu (33)',
    isInterState: false, // Intra-state -> CGST 9% + SGST 9%
    subscriptionId: 'SUB-2026-000184',
    quotationId: 'qt-01',
    billingPeriodStart: '2026-10-01',
    billingPeriodEnd: '2026-10-31',
    invoiceDate: '2026-10-06',
    dueDate: '2026-10-21',
    paymentTerms: '15 Days Net',
    lineItems: [
      {
        id: 'li-inv-1',
        sku: 'PLAN-BIZ-MO',
        description: 'Business SaaS Plan — 100 Employees Base (Oct 2026)',
        quantity: 1,
        unit: 'Plan',
        unitPrice: 9999,
        discount: 1000,
        taxableValue: 8999,
        sacCode: '998313',
        cgstRate: 9,
        cgstAmount: 810,
        sgstRate: 9,
        sgstAmount: 810,
        igstRate: 0,
        igstAmount: 0,
        totalLineAmount: 10619,
      },
      {
        id: 'li-inv-2',
        sku: 'SEAT-OVERAGE-MO',
        description: 'Workforce Seat Overage (750 additional employees @ ₹50 PEPM)',
        quantity: 750,
        unit: 'Employee',
        unitPrice: 50,
        discount: 3750,
        taxableValue: 33750,
        sacCode: '998313',
        cgstRate: 9,
        cgstAmount: 3037.5,
        sgstRate: 9,
        sgstAmount: 3037.5,
        igstRate: 0,
        igstAmount: 0,
        totalLineAmount: 39825,
      },
      {
        id: 'li-inv-3',
        sku: 'ADDON-VENDOR-MO',
        description: 'Vendor Workforce Management Module (Oct 2026)',
        quantity: 1,
        unit: 'Module',
        unitPrice: 4999,
        discount: 500,
        taxableValue: 4499,
        sacCode: '998313',
        cgstRate: 9,
        cgstAmount: 405,
        sgstRate: 9,
        sgstAmount: 405,
        igstRate: 0,
        igstAmount: 0,
        totalLineAmount: 5309,
      },
      {
        id: 'li-inv-4',
        sku: 'ADDON-MATCH-MO',
        description: 'Invoice & 3-Way Match Settlement Engine (Oct 2026)',
        quantity: 1,
        unit: 'Module',
        unitPrice: 3999,
        discount: 400,
        taxableValue: 3599,
        sacCode: '998313',
        cgstRate: 9,
        cgstAmount: 324,
        sgstRate: 9,
        sgstAmount: 324,
        igstRate: 0,
        igstAmount: 0,
        totalLineAmount: 4247,
      },
    ],
    subtotal: 56497,
    discountAmount: 5650,
    taxableValue: 50847,
    cgstAmount: 4576.5,
    sgstAmount: 4576.5,
    igstAmount: 0,
    totalTax: 9153,
    totalInvoiceAmount: 60000,
    amountPaid: 0,
    balanceDue: 60000,
    status: 'Sent',
    bankDetails: SUPPLIER_COMPANY_DETAILS.bankDetails,
    payments: [],
    createdAt: '2026-10-06T10:00:00Z',
    notes: 'Thank you for your business. Monthly SaaS billing per contract QT-2026-00124.',
  },
  {
    id: 'inv-02',
    invoiceNumber: 'INV/26-27/000183',
    invoiceType: 'TAX_INVOICE',
    financialYear: '26-27',
    clientId: 'cli-02',
    clientName: 'XYZ Logistics & Supply Chain Pvt Ltd',
    clientGstin: '29AABCX9912F1Z8',
    clientAddress: 'Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103',
    clientState: 'Karnataka',
    supplierName: SUPPLIER_COMPANY_DETAILS.legalName,
    supplierGstin: SUPPLIER_COMPANY_DETAILS.gstin,
    supplierState: SUPPLIER_COMPANY_DETAILS.state,
    placeOfSupply: 'Karnataka (29)',
    isInterState: true, // Inter-state -> IGST 18%
    subscriptionId: 'SUB-2026-000183',
    quotationId: 'qt-02',
    billingPeriodStart: '2026-10-01',
    billingPeriodEnd: '2027-09-30',
    invoiceDate: '2026-10-04',
    dueDate: '2026-10-19',
    paymentTerms: 'Immediate upon receipt',
    lineItems: [
      {
        id: 'li-inv-21',
        sku: 'PLAN-PRO-ANNUAL',
        description: 'Joy Professional SaaS Plan — Annual 1-Year Prepayment',
        quantity: 1,
        unit: 'Year',
        unitPrice: 71988,
        discount: 7199,
        taxableValue: 64789,
        sacCode: '998313',
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 18,
        igstAmount: 11662,
        totalLineAmount: 76451,
      },
    ],
    subtotal: 71988,
    discountAmount: 7199,
    taxableValue: 64789,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 11662,
    totalTax: 11662,
    totalInvoiceAmount: 76451,
    amountPaid: 76451,
    balanceDue: 0,
    status: 'Paid',
    bankDetails: SUPPLIER_COMPANY_DETAILS.bankDetails,
    payments: [
      {
        id: 'pay-01',
        paymentNumber: 'PAY-2026-00123',
        invoiceId: 'inv-02',
        amount: 76451,
        method: 'Bank Transfer (NEFT/RTGS)',
        utrOrReference: 'HDFCR520261005881923',
        paymentDate: '2026-10-05',
        receivedBy: 'Finance Desk Anand',
        verified: true,
      },
    ],
    createdAt: '2026-10-04T14:00:00Z',
  },
];

class SaasCommercialService {
  private leads: CrmLead[];
  private opportunities: CrmOpportunity[];
  private clients: CommercialClient[];
  private quotations: CommercialQuotation[];
  private invoices: SaaSInvoice[];
  private supplierDetails: SupplierCompanyDetails;

  constructor() {
    this.leads = this.loadLeads();
    this.opportunities = this.loadOpportunities();
    this.clients = this.loadClients();
    this.quotations = this.loadQuotations();
    this.invoices = this.loadInvoices();
    this.supplierDetails = this.loadSupplierDetails();
    this.syncRemoteData();
  }

  private async syncRemoteData(): Promise<void> {
    if (!isSupabaseEnabled) return;
    try {
      // 1. Leads
      const { data: remoteLeads, error: leadsErr } = await supabase
        .from('crm_leads')
        .select('*')
        .limit(100);
      if (!leadsErr && remoteLeads && remoteLeads.length > 0) {
        remoteLeads.forEach((rl: any) => {
          const idx = this.leads.findIndex((l) => l.id === rl.id);
          const mapped: CrmLead = {
            id: rl.id,
            leadNumber: rl.lead_number,
            companyName: rl.company_name,
            contactPerson: rl.contact_person,
            designation: rl.designation,
            email: rl.email,
            phone: rl.phone,
            website: rl.website,
            industry: rl.industry,
            estimatedEmployees: rl.estimated_employees,
            locationsCount: rl.locations_count,
            source: rl.source,
            salesOwner: rl.sales_owner,
            stage: rl.stage,
            requirements: rl.requirements || [],
            notes: rl.notes,
            opportunityId: rl.opportunity_id,
            convertedClientId: rl.converted_client_id,
            createdAt: rl.created_at,
            updatedAt: rl.updated_at,
          };
          if (idx >= 0) this.leads[idx] = mapped;
          else this.leads.push(mapped);
        });
        this.setItem(STORAGE_KEY_LEADS, JSON.stringify(this.leads));
      }

      // 2. Opportunities
      const { data: remoteOpps, error: oppsErr } = await supabase
        .from('crm_opportunities')
        .select('*')
        .limit(100);
      if (!oppsErr && remoteOpps && remoteOpps.length > 0) {
        remoteOpps.forEach((ro: any) => {
          const idx = this.opportunities.findIndex((o) => o.id === ro.id);
          const mapped: CrmOpportunity = {
            id: ro.id,
            opportunityNumber: ro.opportunity_number,
            dealName: ro.deal_name,
            leadId: ro.lead_id,
            leadNumber: ro.lead_number,
            clientId: ro.client_id,
            clientName: ro.client_name,
            companyName: ro.company_name,
            contactPerson: ro.contact_person,
            designation: ro.designation,
            email: ro.email,
            phone: ro.phone,
            industry: ro.industry,
            estimatedEmployees: ro.estimated_employees,
            locationsCount: ro.locations_count,
            legalEntitiesCount: ro.legal_entities_count,
            estimatedArr: Number(ro.estimated_arr || 0),
            probability: ro.probability,
            expectedCloseDate: ro.expected_close_date,
            salesOwner: ro.sales_owner,
            stage: (ro.stage || 'DISCOVERY') as OpportunityStage,
            capturedRequirements: ro.captured_requirements || [],
            quotationIds: ro.quotation_ids || [],
            activeQuotationId: ro.active_quotation_id,
            originType: (ro.origin_type || 'NEW_CUSTOMER') as QuotationOriginType,
            notes: ro.notes,
            createdAt: ro.created_at,
            updatedAt: ro.updated_at,
          };
          if (idx >= 0) this.opportunities[idx] = mapped;
          else this.opportunities.push(mapped);
        });
        this.setItem(STORAGE_KEY_OPPORTUNITIES, JSON.stringify(this.opportunities));
      }

      // 3. Quotations
      const { data: remoteQuotes, error: quotesErr } = await supabase
        .from('commercial_quotations')
        .select('*')
        .limit(100);
      if (!quotesErr && remoteQuotes && remoteQuotes.length > 0) {
        remoteQuotes.forEach((rq: any) => {
          const idx = this.quotations.findIndex((q) => q.id === rq.id);
          const mapped: CommercialQuotation = {
            id: rq.id,
            quotationNumber: rq.quotation_number,
            version: rq.version,
            originType: rq.origin_type,
            purpose: rq.purpose,
            opportunityId: rq.opportunity_id,
            opportunityNumber: rq.opportunity_number,
            leadId: rq.lead_id,
            leadNumber: rq.lead_number,
            clientId: rq.client_id,
            clientName: rq.client_name,
            clientGstin: rq.client_gstin,
            clientEmail: rq.client_email,
            clientPhone: rq.client_phone,
            clientState: rq.client_state,
            salesOwner: rq.sales_owner,
            planCode: rq.plan_code,
            planName: rq.plan_name,
            billingCycle: rq.billing_cycle,
            employeeCount: rq.employee_count,
            includedEmployees: rq.included_employees,
            additionalEmployeesCount: rq.additional_employees_count,
            pepmRate: Number(rq.pepm_rate),
            selectedAddonKeys: rq.selected_addon_keys || [],
            requirements: rq.requirements || {},
            lineItems: rq.line_items || [],
            oneTimeServices: rq.one_time_services || [],
            pricingSnapshot: rq.pricing_snapshot || {},
            approval: rq.approval || { required: false, tier: 'Sales' },
            solutionConfig: rq.solution_config,
            terms: rq.terms,
            status: rq.status,
            validUntil: rq.valid_until,
            convertedClientId: rq.converted_client_id,
            convertedOrgId: rq.converted_org_id,
            convertedSubscriptionId: rq.converted_subscription_id,
            createdAt: rq.created_at,
            updatedAt: rq.updated_at,
            versions: [],
          };
          if (idx >= 0) this.quotations[idx] = mapped;
          else this.quotations.push(mapped);
        });
        this.setItem(STORAGE_KEY_QUOTES, JSON.stringify(this.quotations));
      }
    } catch (err) {
      console.warn('Supabase commercial sync skipped:', err);
    }
  }

  private getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch {}
    }
    return null;
  }

  private setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch {}
    }
  }

  private loadLeads(): CrmLead[] {
    try {
      const saved = this.getItem(STORAGE_KEY_LEADS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_LEADS;
  }

  private loadOpportunities(): CrmOpportunity[] {
    try {
      const saved = this.getItem(STORAGE_KEY_OPPORTUNITIES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_OPPORTUNITIES;
  }

  private loadClients(): CommercialClient[] {
    try {
      const saved = this.getItem(STORAGE_KEY_CLIENTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_CLIENTS;
  }

  private loadQuotations(): CommercialQuotation[] {
    try {
      const saved = this.getItem(STORAGE_KEY_QUOTES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_QUOTATIONS;
  }

  private loadInvoices(): SaaSInvoice[] {
    try {
      const saved = this.getItem(STORAGE_KEY_INVOICES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_INVOICES;
  }

  private loadSupplierDetails(): SupplierCompanyDetails {
    try {
      const saved = this.getItem(STORAGE_KEY_SUPPLIER_DETAILS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...SUPPLIER_COMPANY_DETAILS,
          ...parsed,
          bankDetails: {
            ...SUPPLIER_COMPANY_DETAILS.bankDetails,
            ...(parsed.bankDetails || {}),
          },
        };
      }
    } catch {}
    return SUPPLIER_COMPANY_DETAILS;
  }

  public getSupplierDetails(): SupplierCompanyDetails {
    return this.supplierDetails;
  }

  public updateSupplierDetails(updates: Partial<SupplierCompanyDetails>): SupplierCompanyDetails {
    this.supplierDetails = {
      ...this.supplierDetails,
      ...updates,
      bankDetails: {
        ...this.supplierDetails.bankDetails,
        ...(updates.bankDetails || {}),
      },
    };
    this.setItem(STORAGE_KEY_SUPPLIER_DETAILS, JSON.stringify(this.supplierDetails));
    return this.supplierDetails;
  }

  // ── CRM Leads ────────────────────────────────────────────────────────────
  public getLeads(): CrmLead[] {
    return this.leads;
  }

  public getLeadById(id: string): CrmLead | undefined {
    return this.leads.find((l) => l.id === id);
  }

  public saveLead(lead: CrmLead): void {
    const idx = this.leads.findIndex((l) => l.id === lead.id);
    if (idx >= 0) {
      this.leads[idx] = { ...lead, updatedAt: new Date().toISOString().slice(0, 10) };
    } else {
      this.leads.unshift(lead);
    }
    this.setItem(STORAGE_KEY_LEADS, JSON.stringify(this.leads));

    if (isSupabaseEnabled) {
      supabase
        .from('crm_leads')
        .upsert({
          id: lead.id,
          lead_number: lead.leadNumber,
          company_name: lead.companyName,
          contact_person: lead.contactPerson,
          designation: lead.designation,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
          industry: lead.industry,
          estimated_employees: lead.estimatedEmployees,
          locations_count: lead.locationsCount,
          source: lead.source,
          sales_owner: lead.salesOwner,
          stage: lead.stage,
          requirements: lead.requirements,
          notes: lead.notes,
          opportunity_id: lead.opportunityId,
          converted_client_id: lead.convertedClientId,
          updated_at: new Date().toISOString(),
        })
        .then(() => {}, () => {});
    }
  }

  // ── CRM Opportunities ────────────────────────────────────────────────────
  public getOpportunities(): CrmOpportunity[] {
    return this.opportunities;
  }

  public getOpportunityById(id: string): CrmOpportunity | undefined {
    return this.opportunities.find((o) => o.id === id);
  }

  public saveOpportunity(opp: CrmOpportunity): void {
    const idx = this.opportunities.findIndex((o) => o.id === opp.id);
    if (idx >= 0) {
      this.opportunities[idx] = { ...opp, updatedAt: new Date().toISOString().slice(0, 10) };
    } else {
      this.opportunities.unshift(opp);
    }
    this.setItem(STORAGE_KEY_OPPORTUNITIES, JSON.stringify(this.opportunities));

    if (isSupabaseEnabled) {
      supabase
        .from('crm_opportunities')
        .upsert({
          id: opp.id,
          opportunity_number: opp.opportunityNumber,
          deal_name: opp.dealName,
          lead_id: opp.leadId,
          lead_number: opp.leadNumber,
          client_id: opp.clientId,
          client_name: opp.clientName,
          company_name: opp.companyName,
          contact_person: opp.contactPerson,
          designation: opp.designation,
          email: opp.email,
          phone: opp.phone,
          industry: opp.industry,
          estimated_employees: opp.estimatedEmployees,
          locations_count: opp.locationsCount,
          legal_entities_count: opp.legalEntitiesCount,
          estimated_arr: opp.estimatedArr,
          probability: opp.probability,
          expected_close_date: opp.expectedCloseDate,
          sales_owner: opp.salesOwner,
          stage: opp.stage,
          captured_requirements: opp.capturedRequirements,
          active_quotation_id: opp.activeQuotationId,
          origin_type: opp.originType,
          notes: opp.notes,
          updated_at: new Date().toISOString(),
        })
        .then(() => {}, () => {});
    }
  }

  public createOpportunityFromLead(leadId: string, dealOverrides?: Partial<CrmOpportunity>): CrmOpportunity {
    const lead = this.getLeadById(leadId);
    if (!lead) throw new Error('Lead not found');

    const oppNumber = `OPP-2026-00${this.opportunities.length + 32}`;
    const newOpp: CrmOpportunity = {
      id: `opp-${Date.now()}`,
      opportunityNumber: oppNumber,
      dealName: `${lead.companyName} — SaaS Proposal`,
      leadId: lead.id,
      leadNumber: lead.leadNumber,
      companyName: lead.companyName,
      contactPerson: lead.contactPerson,
      designation: lead.designation,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      estimatedEmployees: lead.estimatedEmployees,
      locationsCount: lead.locationsCount || 1,
      legalEntitiesCount: 1,
      estimatedArr: lead.estimatedEmployees * 1000,
      probability: 60,
      expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      salesOwner: lead.salesOwner || 'Arun K',
      stage: 'REQUIREMENT',
      originType: 'NEW_CUSTOMER',
      capturedRequirements: lead.requirements || ['core_hr', 'ess', 'attendance', 'leave', 'payroll'],
      quotationIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      ...dealOverrides,
    };

    this.saveOpportunity(newOpp);
    lead.opportunityId = newOpp.id;
    lead.stage = 'QUALIFIED';
    this.saveLead(lead);

    return newOpp;
  }

  public getClients(): CommercialClient[] {
    return this.clients;
  }

  public getClientById(id: string): CommercialClient | undefined {
    return this.clients.find((c) => c.id === id);
  }

  public addClient(client: CommercialClient): void {
    this.clients.unshift(client);
    this.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(this.clients));

    if (isSupabaseEnabled) {
      supabase
        .from('commercial_clients')
        .upsert({
          id: client.id,
          client_code: client.clientCode,
          legal_name: client.legalName,
          organization_id: client.organizationId,
          industry: client.industry,
          employee_count: client.employeeCount,
          gstin: client.gstin,
          pan: client.pan,
          cin: client.cin,
          billing_address: client.billingAddress,
          primary_contact: client.primaryContact,
          billing_contact: client.billingContact,
          commercial_status: client.commercialStatus,
          notes: client.notes,
          updated_at: new Date().toISOString(),
        })
        .then(() => {}, () => {});
    }
  }

  public updateClient(client: CommercialClient): void {
    const idx = this.clients.findIndex((c) => c.id === client.id);
    if (idx >= 0) {
      this.clients[idx] = client;
      this.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(this.clients));

      if (isSupabaseEnabled) {
        supabase
          .from('commercial_clients')
          .upsert({
            id: client.id,
            client_code: client.clientCode,
            legal_name: client.legalName,
            organization_id: client.organizationId,
            industry: client.industry,
            employee_count: client.employeeCount,
            gstin: client.gstin,
            pan: client.pan,
            cin: client.cin,
            billing_address: client.billingAddress,
            primary_contact: client.primaryContact,
            billing_contact: client.billingContact,
            commercial_status: client.commercialStatus,
            notes: client.notes,
            updated_at: new Date().toISOString(),
          })
          .then(() => {}, () => {});
      }
    }
  }

  public deleteClient(id: string): void {
    this.clients = this.clients.filter((c) => c.id !== id);
    this.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(this.clients));
  }

  public getQuotations(): CommercialQuotation[] {
    return this.quotations;
  }

  public getQuotationById(id: string): CommercialQuotation | undefined {
    return this.quotations.find((q) => q.id === id);
  }

  public saveQuotation(quote: CommercialQuotation): void {
    const idx = this.quotations.findIndex((q) => q.id === quote.id);
    if (idx >= 0) {
      this.quotations[idx] = quote;
    } else {
      this.quotations.unshift(quote);
    }
    this.setItem(STORAGE_KEY_QUOTES, JSON.stringify(this.quotations));

    if (isSupabaseEnabled) {
      supabase
        .from('commercial_quotations')
        .upsert({
          id: quote.id,
          quotation_number: quote.quotationNumber,
          version: quote.version,
          origin_type: quote.originType,
          purpose: quote.purpose,
          opportunity_id: quote.opportunityId,
          opportunity_number: quote.opportunityNumber,
          lead_id: quote.leadId,
          lead_number: quote.leadNumber,
          client_id: quote.clientId,
          client_name: quote.clientName,
          client_gstin: quote.clientGstin,
          client_email: quote.clientEmail,
          client_phone: quote.clientPhone,
          client_state: quote.clientState,
          sales_owner: quote.salesOwner,
          plan_code: quote.planCode,
          plan_name: quote.planName,
          billing_cycle: quote.billingCycle,
          employee_count: quote.employeeCount,
          included_employees: quote.includedEmployees,
          additional_employees_count: quote.additionalEmployeesCount,
          pepm_rate: quote.pepmRate,
          selected_addon_keys: quote.selectedAddonKeys,
          requirements: quote.requirements,
          line_items: quote.lineItems,
          one_time_services: quote.oneTimeServices,
          pricing_snapshot: quote.pricingSnapshot,
          approval: quote.approval,
          solution_config: quote.solutionConfig,
          terms: quote.terms,
          status: quote.status,
          valid_until: quote.validUntil,
          converted_client_id: quote.convertedClientId,
          converted_org_id: quote.convertedOrgId,
          converted_subscription_id: quote.convertedSubscriptionId,
          updated_at: new Date().toISOString(),
        })
        .then(() => {}, () => {});
    }
  }

  public updateQuotationStatus(
    id: string,
    status: QuotationStatus,
    actor: string = 'Super Admin',
    comments?: string
  ): void {
    const quote = this.getQuotationById(id);
    if (!quote) return;

    quote.status = status;
    quote.updatedAt = new Date().toISOString();

    if (status === 'APPROVED') {
      quote.approval.approvedBy = actor;
      quote.approval.approvedAt = new Date().toISOString();
      if (comments) quote.approval.approvalComments = comments;
    }

    this.saveQuotation(quote);
  }

  /**
   * Enterprise Commercial Lifecycle: Convert an Accepted Quotation into Client, Org Tenant, Subscription & Invoice.
   * Maintains strict traceability without creating duplicate entities.
   */
  public async convertAcceptedQuotationToClient(
    quoteId: string,
    conversionData?: {
      legalName?: string;
      tradeName?: string;
      gstin?: string;
      pan?: string;
      cin?: string;
      billingAddress?: {
        line1: string;
        city: string;
        state: string;
        country: string;
        pinCode: string;
      };
      adminName?: string;
      adminEmail?: string;
      adminPhone?: string;
    }
  ): Promise<{
    client: CommercialClient;
    organizationId: string;
    subscriptionId: string;
    invoice: SaaSInvoice;
  }> {
    const quote = this.getQuotationById(quoteId);
    if (!quote) throw new Error('Quotation not found');

    const subscriptionId = `SUB-${Date.now().toString().slice(-6)}`;
    let client: CommercialClient;
    let targetOrgId = '';

    if (quote.originType === 'EXISTING_CUSTOMER' && quote.clientId) {
      // 1. Existing Customer path — Do NOT create duplicate client
      const found = this.getClientById(quote.clientId);
      if (!found) throw new Error(`Existing client ${quote.clientId} not found`);
      client = found;

      // Link to existing organization tenant
      const existingOrg = platformTenantService.getOrganizations().items.find(
        (o) => o.legal_name.toLowerCase() === client.legalName.toLowerCase() || o.id === client.id
      );
      targetOrgId = existingOrg?.id || `org-${client.id}`;
    } else {
      // 2. New Customer (Prospect) path — Lead → Client conversion
      const legalName = conversionData?.legalName || quote.clientName;
      const gstin = conversionData?.gstin || quote.clientGstin || 'Pending Verification';
      const pan = conversionData?.pan || (gstin.length >= 12 ? gstin.slice(2, 12) : 'PANPending');

      // Check if a client record already exists for this company
      const existingClient = this.clients.find(
        (c) => c.legalName.toLowerCase().trim() === legalName.toLowerCase().trim()
      );

      if (existingClient) {
        client = existingClient;
      } else {
        client = {
          id: `cli-${Date.now().toString().slice(-6)}`,
          clientCode: `CLI-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          legalName,
          tradeName: conversionData?.tradeName || legalName,
          gstin,
          pan,
          contactPerson: conversionData?.adminName || quote.clientName,
          designation: 'Authorized Representative',
          email: conversionData?.adminEmail || quote.clientEmail,
          phone: conversionData?.adminPhone || quote.clientPhone || '+91 98401 23456',
          billingAddress: conversionData?.billingAddress || {
            line1: 'Corporate Campus, High Tech Zone',
            city: 'Chennai',
            state: quote.clientState || 'Tamil Nadu',
            country: 'India',
            pinCode: '600096',
          },
          industry: quote.requirements?.modulesRequested?.length ? 'Technology & Manufacturing' : 'Enterprise SaaS',
          employeeCount: quote.employeeCount,
          customerType: quote.employeeCount > 500 ? 'Enterprise' : 'Mid-Market',
          status: 'Active',
          createdAt: new Date().toISOString().slice(0, 10),
        };
        this.addClient(client);
      }

      // Provision Organization Tenant if not already present
      const rawSlug = legalName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 24);
      targetOrgId = `org-${rawSlug}`;

      const existingOrg = platformTenantService.getOrganizationById(targetOrgId);
      if (!existingOrg) {
        try {
          const newOrg = await platformTenantService.provisionOrganization({
            company_name: client.legalName,
            display_name: client.tradeName || client.legalName,
            industry: client.industry,
            country: 'India',
            state: client.billingAddress.state,
            city: client.billingAddress.city,
            gstin: client.gstin !== 'Pending Verification' ? client.gstin : undefined,
            pan: client.pan !== 'PANPending' ? client.pan : undefined,
            cin: conversionData?.cin,
            admin_name: client.contactPerson,
            admin_email: client.email,
            admin_phone: client.phone,
            plan: quote.planName as any,
            billing_cycle: quote.billingCycle,
            is_trial: false,
          });
          targetOrgId = newOrg.id;
        } catch {
          // If provisioning caught an expected collision, link to existing
          targetOrgId = `org-${rawSlug}`;
        }
      }

      // Update CRM Lead status & linkage
      if (quote.leadId) {
        const lead = this.getLeadById(quote.leadId);
        if (lead) {
          lead.stage = 'WON';
          lead.convertedClientId = client.id;
          this.saveLead(lead);
        }
      }

      // Update CRM Opportunity status & linkage
      if (quote.opportunityId) {
        const opp = this.getOpportunityById(quote.opportunityId);
        if (opp) {
          opp.stage = 'WON';
          opp.clientId = client.id;
          opp.clientName = client.legalName;
          this.saveOpportunity(opp);
        }
      }
    }

    // Freeze linkages onto Quotation
    quote.status = 'CONVERTED';
    quote.clientId = client.id;
    quote.clientName = client.legalName;
    if (client.gstin && client.gstin !== 'Pending Verification') {
      quote.clientGstin = client.gstin;
    }
    quote.convertedClientId = client.id;
    quote.convertedOrgId = targetOrgId;
    quote.convertedSubscriptionId = subscriptionId;
    quote.updatedAt = new Date().toISOString().slice(0, 10);
    this.saveQuotation(quote);

    // Generate First Official Tax Invoice from immutable pricing snapshot
    const invoiceNumber = `INV/26-27/000${this.invoices.length + 185}`;
    const isInterState = client.billingAddress.state !== SUPPLIER_COMPANY_DETAILS.state;
    const taxableValue = quote.pricingSnapshot.recurringPreTax + quote.pricingSnapshot.oneTimePreTax;
    const totalTax = Math.round(taxableValue * 0.18);
    const cgstAmount = isInterState ? 0 : Math.round(totalTax / 2);
    const sgstAmount = isInterState ? 0 : Math.round(totalTax / 2);
    const igstAmount = isInterState ? totalTax : 0;
    const totalInvoiceAmount = taxableValue + totalTax;

    const newInvoice: SaaSInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      invoiceType: 'TAX_INVOICE',
      financialYear: '26-27',
      clientId: client.id,
      clientName: client.legalName,
      clientGstin: client.gstin !== 'Pending Verification' ? client.gstin : '33AABCJ1928K1Z5',
      clientAddress: `${client.billingAddress.line1}, ${client.billingAddress.city}, ${client.billingAddress.state} ${client.billingAddress.pinCode}`,
      clientState: client.billingAddress.state,
      supplierName: SUPPLIER_COMPANY_DETAILS.legalName,
      supplierGstin: SUPPLIER_COMPANY_DETAILS.gstin,
      supplierState: SUPPLIER_COMPANY_DETAILS.state,
      placeOfSupply: client.billingAddress.state,
      isInterState,
      subscriptionId,
      quotationId: quote.id,
      billingPeriodStart: new Date().toISOString().slice(0, 10),
      billingPeriodEnd: new Date(Date.now() + (quote.billingCycle === 'Annual' ? 365 : 30) * 86400000).toISOString().slice(0, 10),
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      paymentTerms: '15 Days Net',
      lineItems: [
        {
          id: `li-${Date.now()}-1`,
          sku: `PLAN-${quote.planCode}`,
          description: `${quote.planName} SaaS Plan — (${quote.employeeCount} Employees, ${quote.billingCycle})`,
          quantity: 1,
          unit: quote.billingCycle === 'Annual' ? 'Year' : 'Month',
          unitPrice: quote.pricingSnapshot.recurringPreTax,
          discount: 0,
          taxableValue: quote.pricingSnapshot.recurringPreTax,
          sacCode: '998313',
          cgstRate: isInterState ? 0 : 9,
          cgstAmount: isInterState ? 0 : Math.round(quote.pricingSnapshot.recurringPreTax * 0.09),
          sgstRate: isInterState ? 0 : 9,
          sgstAmount: isInterState ? 0 : Math.round(quote.pricingSnapshot.recurringPreTax * 0.09),
          igstRate: isInterState ? 18 : 0,
          igstAmount: isInterState ? Math.round(quote.pricingSnapshot.recurringPreTax * 0.18) : 0,
          totalLineAmount: quote.pricingSnapshot.recurringPreTax + Math.round(quote.pricingSnapshot.recurringPreTax * 0.18),
        },
      ],
      subtotal: taxableValue,
      discountAmount: quote.pricingSnapshot.discountAmount,
      taxableValue,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      totalInvoiceAmount,
      amountPaid: 0,
      balanceDue: totalInvoiceAmount,
      status: 'Issued',
      bankDetails: SUPPLIER_COMPANY_DETAILS.bankDetails,
      payments: [],
      createdAt: new Date().toISOString(),
      notes: `Invoice generated automatically upon commercial conversion of quotation ${quote.quotationNumber}.`,
    };

    this.invoices.unshift(newInvoice);
    this.setItem(STORAGE_KEY_INVOICES, JSON.stringify(this.invoices));

    return {
      client,
      organizationId: targetOrgId,
      subscriptionId,
      invoice: newInvoice,
    };
  }

  /**
   * Backwards compatible 1-Click convert helper
   */
  public async convertQuotationToSubscription(quoteId: string): Promise<{ subscriptionId: string; invoiceId: string }> {
    const res = await this.convertAcceptedQuotationToClient(quoteId);
    return { subscriptionId: res.subscriptionId, invoiceId: res.invoice.id };
  }

  public getInvoices(): SaaSInvoice[] {
    return this.invoices;
  }

  public getInvoiceById(id: string): SaaSInvoice | undefined {
    return this.invoices.find((i) => i.id === id);
  }

  public saveInvoice(invoice: SaaSInvoice): void {
    const idx = this.invoices.findIndex((i) => i.id === invoice.id);
    if (idx >= 0) {
      this.invoices[idx] = invoice;
    } else {
      this.invoices.unshift(invoice);
    }
    this.setItem(STORAGE_KEY_INVOICES, JSON.stringify(this.invoices));
  }

  public recordPayment(
    invoiceId: string,
    amount: number,
    method: InvoicePaymentRecord['method'],
    utrOrReference: string,
    receivedBy: string = 'Finance Desk'
  ): void {
    const inv = this.getInvoiceById(invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const payment: InvoicePaymentRecord = {
      id: `pay-${Date.now()}`,
      paymentNumber: `PAY-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      invoiceId,
      amount,
      method,
      utrOrReference,
      paymentDate: new Date().toISOString().slice(0, 10),
      receivedBy,
      verified: true,
    };

    inv.payments.push(payment);
    inv.amountPaid += amount;
    inv.balanceDue = Math.max(0, inv.totalInvoiceAmount - inv.amountPaid);

    if (inv.balanceDue <= 0) {
      inv.status = 'Paid';
    } else {
      inv.status = 'Partially Paid';
    }

    this.saveInvoice(inv);
  }
}

export const saasCommercialService = new SaasCommercialService();
