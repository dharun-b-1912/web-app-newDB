// src/services/platform/saasPricingEngine.ts
// ============================================================================
// Joy PeopleHR — SaaS Pricing Engine, Volume Tiers & Dynamic Quote Calculator
// Non-hardcoded, fully configurable commercial calculation engine
// ============================================================================

import {
  CommercialPlan,
  VolumePricingBand,
  PricingCalculationInput,
  PricingCalculationResult,
  PlanTierCode,
} from '../../types/saasCatalogue';
import { saasCatalogueService } from './saasCatalogueService';

const STORAGE_KEY_PLANS = 'joy_saas_commercial_plans_v1';
const STORAGE_KEY_DISCOUNTS = 'joy_saas_pricing_discounts_v1';

export const STARTER_VOLUME_BANDS: VolumePricingBand[] = [
  { minEmployees: 1, maxEmployees: 50, pepmPrice: 65, annualPepmPrice: 49, onboardingSetupFee: 0, label: '1 – 50 Employees (₹65/mo | ₹49/yr)' },
  { minEmployees: 51, maxEmployees: 999999, pepmPrice: 60, annualPepmPrice: 45, onboardingSetupFee: 0, label: '51+ Employees (₹60/mo | ₹45/yr)' },
];

export const PREMIUM_VOLUME_BANDS: VolumePricingBand[] = [
  { minEmployees: 1, maxEmployees: 50, pepmPrice: 100, annualPepmPrice: 90, onboardingSetupFee: 9999, label: '1 – 50 Employees (₹100/mo | ₹90/yr + ₹9,999 setup)' },
  { minEmployees: 51, maxEmployees: 200, pepmPrice: 90, annualPepmPrice: 80, onboardingSetupFee: 6999, label: '51 – 200 Employees (₹90/mo | ₹80/yr + ₹6,999 setup)' },
  { minEmployees: 201, maxEmployees: 500, pepmPrice: 80, annualPepmPrice: 70, onboardingSetupFee: 4999, label: '201 – 500 Employees (₹80/mo | ₹70/yr + ₹4,999 setup)' },
  { minEmployees: 501, maxEmployees: 999999, pepmPrice: 70, annualPepmPrice: 60, onboardingSetupFee: 0, label: '500+ Employees (₹70/mo | ₹60/yr, Setup Waived)', isCustom: true },
];

export const ENTERPRISE_VOLUME_BANDS: VolumePricingBand[] = [
  { minEmployees: 1, maxEmployees: 50, pepmPrice: 139, annualPepmPrice: 119, onboardingSetupFee: 9999, label: '1 – 50 Employees (₹139/mo | ₹119/yr + ₹9,999 setup)' },
  { minEmployees: 51, maxEmployees: 200, pepmPrice: 119, annualPepmPrice: 99, onboardingSetupFee: 6999, label: '51 – 200 Employees (₹119/mo | ₹99/yr + ₹6,999 setup)' },
  { minEmployees: 201, maxEmployees: 500, pepmPrice: 99, annualPepmPrice: 79, onboardingSetupFee: 4999, label: '201 – 500 Employees (₹99/mo | ₹79/yr + ₹4,999 setup)' },
  { minEmployees: 501, maxEmployees: 999999, pepmPrice: 79, annualPepmPrice: 69, onboardingSetupFee: 0, label: '500+ Employees (₹79/mo | ₹69/yr, Setup Waived)', isCustom: true },
];

export const DEFAULT_VOLUME_BANDS: VolumePricingBand[] = PREMIUM_VOLUME_BANDS;

export const INITIAL_COMMERCIAL_PLANS: CommercialPlan[] = [
  {
    id: 'plan-starter',
    code: 'STARTER',
    name: 'Starter',
    displayName: 'Joy Starter',
    tagline: 'Affordable HR & Attendance Foundation for growing businesses',
    description: 'Essential core HR, leave management, basic attendance, employee self-service portal, and mobile ESS.',
    targetAudience: 'Startups & SMBs with 10 – 50 employees',
    isPopular: false,
    status: 'Active',
    baseMonthlyPrice: 0,
    includedEmployees: 0,
    additionalEmployeePrice: 65, // Slab base: ₹65 / ₹49
    volumeBands: STARTER_VOLUME_BANDS,
    includedModules: ['core_hr', 'ess', 'leave', 'attendance', 'communication', 'analytics'],
    includedFeatures: [
      'core.org_structure',
      'core.company_management',
      'core.branches',
      'core.departments',
      'core.employee_master',
      'core.employee_lifecycle',
      'core.onboarding',
      'core.documents',
      'core.digital_letters',
      'ess.profile',
      'ess.documents',
      'ess.attendance',
      'ess.leave',
      'ess.payslip',
      'ess.mobile_ess',
      'leave.types',
      'leave.balance',
      'leave.accrual',
      'leave.holiday_calendar',
      'attendance.web_punch',
      'attendance.mobile_punch',
      'attendance.history',
      'attendance.late_early_report',
      'communication.email',
      'communication.in_app',
      'analytics.standard_reports',
      'analytics.export_excel',
    ],
    activeSubscriptionsCount: 42,
    mrrFormatted: '₹1.48L',
    quotas: {
      maxEmployees: 100,
      maxAdminUsers: 1, // 1 HR User included
      maxLocations: 2,
      maxCompanies: 1,
      maxBiometricDevices: 1,
      storageGb: 15,
      apiCallsPerDay: 5000,
      includedWhatsAppMessagesPerMonth: 0,
      supportSla: '48-hour email support',
    },
  },
  {
    id: 'plan-premium',
    code: 'PREMIUM',
    name: 'Premium',
    displayName: 'Joy Premium',
    tagline: 'Recommended: Full India Statutory Payroll + Shift Roster + WhatsApp Bot',
    description: 'Everything in Starter + Shift Roster, Automated Overtime, Full Payroll Engine (PF/ESI/PT/TDS), Bank Upload Formats, WhatsApp Bot, Asset Management & Hierarchy MIS Emails.',
    targetAudience: 'Mid-market enterprises with 50 – 500 employees',
    isPopular: true, // HIGHLIGHTED DEFAULT PLAN
    status: 'Active',
    baseMonthlyPrice: 0,
    includedEmployees: 0,
    additionalEmployeePrice: 100, // Slab base: ₹100 / ₹90
    volumeBands: PREMIUM_VOLUME_BANDS,
    includedModules: [
      'core_hr',
      'ess',
      'leave',
      'attendance',
      'payroll',
      'expense',
      'communication',
      'analytics',
    ],
    includedFeatures: [
      // All starter features plus:
      'core.full_and_final',
      'core.e_signature',
      'core.hr_workflows',
      'core.manager_portal',
      'ess.tax_information',
      'ess.loans_advances',
      'ess.expense',
      'leave.auto_accrual',
      'leave.carry_forward',
      'leave.encashment',
      'leave.comp_off',
      'leave.approval_workflow',
      'attendance.correction',
      'attendance.missing_punch',
      'attendance.shift_management',
      'attendance.shift_roster',
      'attendance.rotational_shifts',
      'attendance.night_shifts',
      'attendance.overtime',
      'attendance.ot_approval',
      'attendance.gps',
      'attendance.geo_fencing',
      'attendance.field_attendance',
      'attendance.ip_restriction',
      'payroll.salary_structures',
      'payroll.earnings_deductions',
      'payroll.run',
      'payroll.preview',
      'payroll.approval_workflow',
      'payroll.lock',
      'payroll.payslips',
      'payroll.pf_compliance',
      'payroll.esi_compliance',
      'payroll.pt_compliance',
      'payroll.tds_compliance',
      'payroll.bank_advice',
      'payroll.statutory_reports',
      'expense.claims',
      'expense.categories',
      'expense.receipt_upload',
      'expense.approval_flow',
      'expense.payroll_sync',
      'communication.payroll_notifications',
      'communication.templates',
      'communication.delivery_logs',
      'analytics.advanced_reports',
    ],
    activeSubscriptionsCount: 68,
    mrrFormatted: '₹4.82L',
    quotas: {
      maxEmployees: 1000,
      maxAdminUsers: 3, // 3 HR Users included
      maxLocations: 10,
      maxCompanies: 3,
      maxBiometricDevices: 5,
      storageGb: 50,
      apiCallsPerDay: 50000,
      includedWhatsAppMessagesPerMonth: 3000,
      supportSla: '12-hour business hours SLA',
    },
  },
  {
    id: 'plan-business',
    code: 'BUSINESS',
    name: 'Business',
    displayName: 'Joy Business',
    tagline: 'Complete Talent Suite + LMS + WhatsApp Automation + REST API',
    description: 'Everything in Professional + Recruitment ATS, Performance 360 Appraisals, Learning LMS, Advanced Analytics, Biometric Push Gateway, WhatsApp automation, and Developer API.',
    targetAudience: 'Scaling high-growth companies with 100 – 500+ employees',
    isPopular: false,
    status: 'Active',
    baseMonthlyPrice: 9999,
    includedEmployees: 100,
    additionalEmployeePrice: 80, // ₹80 / employee / month
    volumeBands: DEFAULT_VOLUME_BANDS,
    includedModules: [
      'core_hr',
      'ess',
      'leave',
      'attendance',
      'biometric',
      'payroll',
      'expense',
      'recruitment',
      'performance',
      'lms',
      'communication',
      'analytics',
    ],
    includedFeatures: [
      // All Professional plus:
      'ess.ai_assistant',
      'biometric.device_registration',
      'biometric.device_mapping',
      'biometric.punch_sync',
      'biometric.device_monitoring',
      'biometric.device_logs',
      'payroll.arrears',
      'payroll.bonus_incentives',
      'payroll.offcycle',
      'payroll.form_16',
      'payroll.form_24q',
      'payroll.gl_integration',
      'recruitment.job_requisition',
      'recruitment.job_openings',
      'recruitment.candidate_database',
      'recruitment.resume_management',
      'recruitment.pipeline_kanban',
      'recruitment.screening',
      'recruitment.interview_scheduling',
      'recruitment.interview_feedback',
      'recruitment.offer_management',
      'recruitment.offer_letter_esign',
      'recruitment.onboarding_convert',
      'recruitment.reports',
      'performance.goals',
      'performance.kra_kpi',
      'performance.tracking',
      'performance.self_appraisal',
      'performance.manager_appraisal',
      'performance.360_feedback',
      'performance.review_cycles',
      'performance.reports',
      'lms.course_catalogue',
      'lms.training_programs',
      'lms.learning_paths',
      'lms.scorm_player',
      'lms.assessments',
      'lms.certification',
      'communication.whatsapp_bot',
      'communication.whatsapp_payslips',
      'communication.whatsapp_otp',
      'communication.sms',
      'communication.broadcast',
      'analytics.custom_reports',
      'analytics.scheduled_reports',
      'analytics.dashboard_builder',
      'analytics.workforce_analytics',
      'analytics.payroll_analytics',
      'platform.integrations',
    ],
    activeSubscriptionsCount: 14,
    mrrFormatted: '₹1.74L',
    quotas: {
      maxEmployees: 2500,
      maxAdminUsers: 30,
      maxLocations: 50,
      maxCompanies: 10,
      maxBiometricDevices: 25,
      storageGb: 200,
      apiCallsPerDay: 500000,
      includedWhatsAppMessagesPerMonth: 10000,
      supportSla: '4-hour priority response SLA',
    },
  },
  {
    id: 'plan-enterprise',
    code: 'ENTERPRISE',
    name: 'Enterprise',
    displayName: 'Joy Enterprise',
    tagline: 'HRMS + Vendor Workforce + Procurement + 3-Way Match + Client Billing',
    description: 'Custom comprehensive suite: Vendor Workforce, Vendor Self-Service Portal, Procurement POs, 3-Way Match Settlement, Outbound Client Billing, SSO/SAML 2.0, Dedicated VPC, and 15m SLA.',
    targetAudience: 'Large conglomerates, manufacturing plants & manpower contractors (500+ to 50,000+)',
    isPopular: false,
    status: 'Active',
    baseMonthlyPrice: 0,
    includedEmployees: 0,
    additionalEmployeePrice: 139, // Slab base: ₹139 / ₹119
    volumeBands: ENTERPRISE_VOLUME_BANDS,
    includedModules: [
      'core_hr',
      'ess',
      'leave',
      'attendance',
      'biometric',
      'payroll',
      'expense',
      'recruitment',
      'performance',
      'lms',
      'communication',
      'analytics',
      'vendor_workforce',
      'vendor_portal',
      'procurement',
      'invoice_settlement_billing',
    ],
    includedFeatures: [
      // Everything across all 16 modules
      'biometric.push_gateway',
      'biometric.hardware_adapters',
      'biometric.remote_enrollment',
      'performance.bell_curve',
      'vendor.master',
      'vendor.onboarding',
      'vendor.contracts',
      'vendor.employees',
      'vendor.site_allocation',
      'vendor.attendance',
      'vendor.ot',
      'vendor.wage_rates',
      'vendor.compliance_docs',
      'vendor.clra_registers',
      'vendor.performance',
      'vendor.blacklisting',
      'vendor_portal.dashboard',
      'vendor_portal.worker_upload',
      'vendor_portal.attendance_review',
      'vendor_portal.challan_upload',
      'vendor_portal.invoice_submission',
      'vendor_portal.payment_status',
      'procurement.purchase_request',
      'procurement.approval_flow',
      'procurement.rfq',
      'procurement.quotations',
      'procurement.po_generation',
      'procurement.po_approval',
      'procurement.po_allocation',
      'procurement.budget_checking',
      'invoice.creation_upload',
      'invoice.three_way_match',
      'invoice.approval_workflow',
      'settlement.gst_tds',
      'settlement.retention',
      'settlement.net_payable',
      'settlement.utr_tracking',
      'client_billing.master',
      'client_billing.rate_cards',
      'client_billing.attendance_billing',
      'client_billing.invoice_dispatch',
      'client_billing.collections',
      'client_billing.aging_reports',
      'platform.sso_saml',
      'platform.forensic_audit',
    ],
    activeSubscriptionsCount: 3,
    mrrFormatted: '₹0.38L',
    quotas: {
      maxEmployees: 100000,
      maxAdminUsers: 5, // 5 HR Users included
      maxLocations: 999,
      maxCompanies: 999,
      maxBiometricDevices: 999,
      storageGb: 5000,
      apiCallsPerDay: 5000000,
      includedWhatsAppMessagesPerMonth: 50000,
      supportSla: 'Dedicated TAM with 15-minute phone hotline SLA',
    },
  },
];

export interface CycleDiscountsConfig {
  annualDiscountPercent: number; // default 10%
  twoYearDiscountPercent: number; // default 15%
  threeYearDiscountPercent: number; // default 20%
}

class SaasPricingEngine {
  private plans: CommercialPlan[];
  private discounts: CycleDiscountsConfig;

  constructor() {
    this.plans = this.loadPlans();
    this.discounts = this.loadDiscounts();
  }

  private loadPlans(): CommercialPlan[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLANS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 4) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_COMMERCIAL_PLANS;
  }

  private loadDiscounts(): CycleDiscountsConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DISCOUNTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {
      annualDiscountPercent: 10,
      twoYearDiscountPercent: 15,
      threeYearDiscountPercent: 20,
    };
  }

  public getPlans(): CommercialPlan[] {
    return this.plans;
  }

  public getPlanByCode(code: PlanTierCode): CommercialPlan | undefined {
    if (code === 'PREMIUM' || code === 'PROFESSIONAL' || code === 'BUSINESS') {
      return this.plans.find((p) => p.code === 'PREMIUM' || p.code === 'PROFESSIONAL') || this.plans[1];
    }
    return this.plans.find((p) => p.code === code);
  }

  public getDiscounts(): CycleDiscountsConfig {
    return this.discounts;
  }

  public updateDiscounts(newDiscounts: Partial<CycleDiscountsConfig>): void {
    this.discounts = { ...this.discounts, ...newDiscounts };
    localStorage.setItem(STORAGE_KEY_DISCOUNTS, JSON.stringify(this.discounts));
  }

  public updatePlan(updatedPlan: CommercialPlan): void {
    const idx = this.plans.findIndex((p) => p.code === updatedPlan.code);
    if (idx >= 0) {
      this.plans[idx] = updatedPlan;
    } else {
      this.plans.push(updatedPlan);
    }
    localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(this.plans));
  }

  /**
   * Determine the PEPM rate from configurable volume pricing bands
   */
  public getPepmForBand(plan: CommercialPlan, employeeCount: number): number {
    const bands = plan.volumeBands && plan.volumeBands.length > 0 ? plan.volumeBands : DEFAULT_VOLUME_BANDS;
    const matchingBand = bands.find(
      (b) => employeeCount >= b.minEmployees && employeeCount <= b.maxEmployees
    ) || bands[bands.length - 1];

    return matchingBand.pepmPrice > 0 ? matchingBand.pepmPrice : plan.additionalEmployeePrice;
  }

  /**
   * Authoritative, transparent SaaS Pricing Calculation
   * Formula:
   * (Employee Count × Slab PEPM) + Add-ons + Usage Meters + Setup Fee + 18% GST = Grand Total
   */
  public calculateQuote(input: PricingCalculationInput): PricingCalculationResult {
    const plan = this.getPlanByCode(input.planCode) || this.plans[1];
    const steps: string[] = [];
    const employeeCount = Math.max(1, input.employeeCount);
    const isAnnual = input.billingCycle === 'Annual' || input.billingCycle === 'Two-Year';

    // 1. Match volume band
    const bands = plan.volumeBands && plan.volumeBands.length > 0 ? plan.volumeBands : DEFAULT_VOLUME_BANDS;
    const matchingBand = bands.find(
      (b) => employeeCount >= b.minEmployees && employeeCount <= b.maxEmployees
    ) || bands[bands.length - 1];

    const monthlyRate = matchingBand.pepmPrice;
    const annualRate = matchingBand.annualPepmPrice ?? Math.round(monthlyRate * 0.85);
    const appliedPepmRate = isAnnual ? annualRate : monthlyRate;
    const appliedSetupFee = isAnnual ? (matchingBand.onboardingSetupFee ?? 0) : 0;

    // 2. Base Plan / Employee Subscription Calculation
    let employeeSubscriptionMonthly = 0;
    const baseMonthlyPrice = plan.baseMonthlyPrice;

    if (baseMonthlyPrice > 0) {
      const additionalEmployeesCount = Math.max(0, employeeCount - plan.includedEmployees);
      const employeeOverageMonthly = additionalEmployeesCount * appliedPepmRate;
      employeeSubscriptionMonthly = baseMonthlyPrice + employeeOverageMonthly;
      steps.push(`Base Plan [${plan.name}]: ₹${baseMonthlyPrice.toLocaleString('en-IN')}/mo (Includes ${plan.includedEmployees} employees)`);
      if (additionalEmployeesCount > 0) {
        steps.push(`Additional Employees: ${additionalEmployeesCount} × ₹${appliedPepmRate}/mo = ₹${employeeOverageMonthly.toLocaleString('en-IN')}/mo`);
      }
    } else {
      employeeSubscriptionMonthly = employeeCount * appliedPepmRate;
      steps.push(`Plan [${plan.name}]: ${employeeCount} Employees × ₹${appliedPepmRate}/mo (${matchingBand.label}) = ₹${employeeSubscriptionMonthly.toLocaleString('en-IN')}/mo`);
    }

    if (appliedSetupFee > 0) {
      steps.push(`One-Time Onboarding & Biometric Training Fee: +₹${appliedSetupFee.toLocaleString('en-IN')}`);
    }

    // 3. Modular Add-ons Calculation
    const allAddons = saasCatalogueService.getAddons();
    const itemizedAddons: PricingCalculationResult['itemizedAddons'] = [];
    let addonsMonthlyTotal = 0;
    let addonsOneTimeTotal = 0;

    for (const addonKey of input.selectedAddonKeys || []) {
      const addon = allAddons.find((a) => a.addonKey === addonKey);
      if (addon) {
        const isOneTime = addon.billingUnit === 'One-Time Charge';
        let addonEffectivePrice = addon.monthlyPrice;

        // Billed per field staff if field GPS route tracking
        if (addon.addonKey === 'field_gps_route_tracking') {
          const fieldUsers = Math.max(5, Math.round(employeeCount * 0.25));
          addonEffectivePrice = fieldUsers * 39;
        }

        itemizedAddons.push({
          addonKey: addon.addonKey,
          name: addon.name,
          monthlyPrice: addonEffectivePrice,
          billingUnit: addon.billingUnit,
        });

        if (isOneTime) {
          addonsOneTimeTotal += addonEffectivePrice;
          steps.push(`One-Time Add-on [${addon.name}]: +₹${addonEffectivePrice.toLocaleString('en-IN')}`);
        } else {
          addonsMonthlyTotal += addonEffectivePrice;
          steps.push(`Add-on [${addon.name}]: +₹${addonEffectivePrice.toLocaleString('en-IN')}/mo`);
        }
      }
    }

    // 4. Usage Meters (Biometrics, Extra Storage, WhatsApp Overages)
    let usageMetersMonthlyTotal = 0;
    if (input.extraBiometricDevices && input.extraBiometricDevices > 0) {
      const deviceCost = input.extraBiometricDevices * 499;
      usageMetersMonthlyTotal += deviceCost;
      steps.push(`Extra Biometric Devices: ${input.extraBiometricDevices} × ₹499 = +₹${deviceCost.toLocaleString('en-IN')}/mo`);
    }

    if (input.extraStorage100GbUnits && input.extraStorage100GbUnits > 0) {
      const storageCost = input.extraStorage100GbUnits * 799;
      usageMetersMonthlyTotal += storageCost;
      steps.push(`Extra Cloud Storage: ${input.extraStorage100GbUnits} × 100 GB @ ₹799 = +₹${storageCost.toLocaleString('en-IN')}/mo`);
    }

    if (input.monthlyWhatsAppMessages && input.monthlyWhatsAppMessages > 3000) {
      const extraMsgs = input.monthlyWhatsAppMessages - 3000;
      const waCost = Math.round(extraMsgs * 0.55);
      usageMetersMonthlyTotal += waCost;
      steps.push(`WhatsApp Message Overage: ${extraMsgs.toLocaleString('en-IN')} msgs × ₹0.55 = +₹${waCost.toLocaleString('en-IN')}/mo`);
    }

    // Gross Monthly Total
    let grossMonthlyTotal = employeeSubscriptionMonthly + addonsMonthlyTotal + usageMetersMonthlyTotal;

    // Enterprise Override check
    if (input.enterpriseOverridePrice !== undefined && input.enterpriseOverridePrice > 0) {
      grossMonthlyTotal = input.enterpriseOverridePrice;
      steps.push(`Commercial Override Applied: Fixed Negotiated Contract Rate = ₹${grossMonthlyTotal.toLocaleString('en-IN')}/mo`);
    }

    // 5. Billing Cycle Multiplier & Discounts
    let cycleMultiplier = 1;
    let cycleDiscountPercent = 0;

    if (input.billingCycle === 'Annual') {
      cycleMultiplier = 12;
    } else if (input.billingCycle === 'Two-Year') {
      cycleMultiplier = 24;
      cycleDiscountPercent = input.customDiscountPercent ?? 5;
    }

    const preDiscountCycleGross = grossMonthlyTotal * cycleMultiplier;
    const cycleDiscountAmount = Math.round(preDiscountCycleGross * (cycleDiscountPercent / 100));
    const totalSetupAndOneTimeFees = appliedSetupFee + addonsOneTimeTotal;
    const netPreTaxAmount = preDiscountCycleGross - cycleDiscountAmount + totalSetupAndOneTimeFees;

    if (cycleDiscountPercent > 0) {
      steps.push(
        `${input.billingCycle} Contract (${cycleMultiplier} mos): Subtotal ₹${preDiscountCycleGross.toLocaleString('en-IN')} with ${cycleDiscountPercent}% Term Discount (-₹${cycleDiscountAmount.toLocaleString('en-IN')}) + Setup/One-Time ₹${totalSetupAndOneTimeFees.toLocaleString('en-IN')} = ₹${netPreTaxAmount.toLocaleString('en-IN')}`
      );
    } else {
      steps.push(`Contract Duration: ${input.billingCycle} (${cycleMultiplier} month subscription: ₹${(grossMonthlyTotal * cycleMultiplier).toLocaleString('en-IN')}${totalSetupAndOneTimeFees > 0 ? ` + ₹${totalSetupAndOneTimeFees.toLocaleString('en-IN')} one-time/setup fee` : ''})`);
    }

    // 6. GST Calculation (18% Statutory Goods & Services Tax)
    const gstRatePercent = 18;
    const gstAmount = Math.round(netPreTaxAmount * 0.18);
    const grandTotal = netPreTaxAmount + gstAmount;
    const monthlyEquivalent = Math.round(grandTotal / cycleMultiplier);

    steps.push(`Statutory GST (18%): +₹${gstAmount.toLocaleString('en-IN')}`);
    steps.push(`Grand Contract Total: ₹${grandTotal.toLocaleString('en-IN')} (₹${monthlyEquivalent.toLocaleString('en-IN')}/mo effective)`);

    // 7. Dynamic Competitor Quotation Benchmark (greytHR & Spine HR Suite)
    // greytHR equivalent:
    // Growth Base: ₹4,495 (includes 50 emps) + ₹85 per addl emp
    // + GeoMark+ (Mobile GPS Punch): ₹50 * employeeCount
    // + Expense Claims: ₹35 * employeeCount (if not Starter)
    // + Live Field GPS: ₹140 * fieldUsers (if field tracking chosen)
    const greytHrBase = employeeCount <= 50 ? 4495 : 4495 + (employeeCount - 50) * 85;
    const greytHrGeoMark = employeeCount * 50;
    const greytHrExpense = plan.code !== 'STARTER' ? employeeCount * 35 : 0;
    const greytHrFieldGps = input.selectedAddonKeys?.includes('field_gps_route_tracking')
      ? Math.max(5, Math.round(employeeCount * 0.25)) * 140
      : 0;
    const greytHrEstimateMonthly = greytHrBase + greytHrGeoMark + greytHrExpense + greytHrFieldGps;

    // Spine HR Suite equivalent:
    // Core HRIS + Payroll + Time Attendance: ₹25 PEPM
    // Employee Self Service: ₹12 PEPM
    // Leave Management: ₹12 PEPM
    // Google Location API Add-on: ₹15 PEPM
    // Spine one-time setup: ₹50,000 (amortized over 12 months = ₹4,167/mo)
    const spineRecurringMonthly = employeeCount * (25 + 12 + 12 + 15);
    const spineEstimateMonthly = spineRecurringMonthly + Math.round(50000 / 12);

    const monthlySavingsVsGreytHr = Math.max(0, greytHrEstimateMonthly - grossMonthlyTotal);
    const monthlySavingsVsSpine = Math.max(0, spineEstimateMonthly - grossMonthlyTotal);
    const annualSavingsVsGreytHr = monthlySavingsVsGreytHr * 12;
    const annualSavingsVsSpine = monthlySavingsVsSpine * 12;
    const savingsPercentVsGreytHr = greytHrEstimateMonthly > 0 ? Math.round((monthlySavingsVsGreytHr / greytHrEstimateMonthly) * 100) : 0;
    const savingsPercentVsSpine = spineEstimateMonthly > 0 ? Math.round((monthlySavingsVsSpine / spineEstimateMonthly) * 100) : 0;

    return {
      planCode: plan.code,
      planName: plan.name,
      billingCycle: input.billingCycle,
      employeeCount,
      baseMonthlyPrice: plan.baseMonthlyPrice,
      includedEmployees: plan.includedEmployees,
      additionalEmployeesCount: employeeCount,
      employeeOverageMonthly: employeeSubscriptionMonthly,
      appliedPepmRate,
      appliedVolumeBand: matchingBand.label,
      appliedSetupFee: totalSetupAndOneTimeFees,
      itemizedAddons,
      addonsMonthlyTotal,
      usageMetersMonthlyTotal,
      usageMonthlyTotal: usageMetersMonthlyTotal,
      grossMonthlyTotal,
      cycleMultiplier,
      cycleDiscountPercent,
      cycleDiscountAmount,
      netPreTaxAmount,
      gstRatePercent,
      gstAmount,
      grandTotal,
      monthlyEquivalent,
      calculationSteps: steps,
      competitorComparison: {
        greytHrEstimateMonthly,
        spineEstimateMonthly,
        monthlySavingsVsGreytHr,
        monthlySavingsVsSpine,
        annualSavingsVsGreytHr,
        annualSavingsVsSpine,
        savingsPercentVsGreytHr,
        savingsPercentVsSpine,
      },
    };
  }
}

export const saasPricingEngine = new SaasPricingEngine();
