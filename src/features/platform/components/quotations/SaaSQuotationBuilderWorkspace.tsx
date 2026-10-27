// src/features/platform/components/quotations/SaaSQuotationBuilderWorkspace.tsx
// ============================================================================
// Joy PeopleHR — Enterprise 7-Stage SaaS Quotation & Solution Configurator
// Solution Configurator + Commercial Calculator + Proposal Document Generator
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  Layers,
  DollarSign,
  ShieldCheck,
  Check,
  Briefcase,
  Calendar,
  Send,
  Zap,
  HardDrive,
  Fingerprint,
  MessageSquare,
  HelpCircle,
  Eye,
  X,
  CreditCard,
  Globe,
  Sliders,
  CheckSquare,
  Square,
  TrendingDown,
  Info,
  UserCheck,
  Compass,
  Tag,
  ChevronRight,
  ExternalLink,
  QrCode,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../services/api';
import {
  CommercialQuotation,
  CommercialClient,
  OneTimeServiceItem,
  CrmOpportunity,
  CrmLead,
  QuotationOriginType,
  QuotationPurpose,
} from '../../../../types/saasCommercial';
import { PlanTierCode, BillingCycle } from '../../../../types/saasCatalogue';
import { saasCommercialService, DEFAULT_ONE_TIME_SERVICES } from '../../../../services/platform/saasCommercialService';
import { saasPricingEngine } from '../../../../services/platform/saasPricingEngine';
import { saasCatalogueService } from '../../../../services/platform/saasCatalogueService';
import { razorpayOrderService } from '../../../../services/platform/razorpayOrderService';
import { CompanyLogoUpload } from '../../../../components/common/CompanyLogoUpload';

interface SaaSQuotationBuilderWorkspaceProps {
  clients: CommercialClient[];
  initialOriginType?: QuotationOriginType;
  initialOpportunityId?: string;
  initialClientId?: string;
  onCancel: () => void;
  onSaveQuote: (newQuote: CommercialQuotation) => void;
  onOpenPreview: (quote: CommercialQuotation) => void;
}

export const SaaSQuotationBuilderWorkspace: React.FC<SaaSQuotationBuilderWorkspaceProps> = ({
  clients,
  initialOriginType,
  initialOpportunityId,
  initialClientId,
  onCancel,
  onSaveQuote,
  onOpenPreview,
}) => {
  // Stepper Stage: 1 to 7
  const [currentStep, setCurrentStep] = useState<number>(1);

  // CRM Origin: 'NEW_CUSTOMER' vs 'EXISTING_CUSTOMER' (Null shows selection screen)
  const [originType, setOriginType] = useState<QuotationOriginType | null>(initialOriginType || null);
  const [selectedOppId, setSelectedOppId] = useState<string>(initialOpportunityId || '');
  const [quotationPurpose, setQuotationPurpose] = useState<QuotationPurpose>('NEW_SUBSCRIPTION');
  const [companyName, setCompanyName] = useState<string>('');
  const [activeDrawer, setActiveDrawer] = useState<'LEAD' | 'OPPORTUNITY' | null>(null);

  const opportunities = useMemo(() => saasCommercialService.getOpportunities(), []);
  const leads = useMemo(() => saasCommercialService.getLeads(), []);

  const selectedOpp = useMemo(() => {
    return opportunities.find((o) => o.id === selectedOppId);
  }, [opportunities, selectedOppId]);

  const selectedOppLead = useMemo(() => {
    if (!selectedOpp?.leadId) return undefined;
    return leads.find((l) => l.id === selectedOpp.leadId);
  }, [leads, selectedOpp]);

  // STAGE 1: Client & Requirement (For existing customer path)
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || '');
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0];
  }, [clients, selectedClientId]);

  const [contactName, setContactName] = useState<string>('');
  const [contactDesignation, setContactDesignation] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [clientLogoUrl, setClientLogoUrl] = useState<string>(() => {
    const init = clients.find((c) => c.id === initialClientId);
    return init?.logoUrl || '';
  });

  const salesOwners = useMemo(() => saasCommercialService.getSalesOwners(), []);

  const [salesOwner, setSalesOwner] = useState<string>(() => {
    const list = saasCommercialService.getSalesOwners();
    return list[0] ? `${list[0].name} (${list[0].designation})` : (api.getCurrentUser()?.name || 'Platform Administrator');
  });
  const [salesTeam, setSalesTeam] = useState<string>('Enterprise Commercial Sales');
  const [startDate, setStartDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [validityDays, setValidityDays] = useState<number>(15);
  const [validUntilDate, setValidUntilDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [enableRazorpay, setEnableRazorpay] = useState<boolean>(true);
  const [clientState, setClientState] = useState<string>('Tamil Nadu');
  const [clientIndustry, setClientIndustry] = useState<string>('Software & Technology');

  const handleValidityDaysChange = (days: number) => {
    setValidityDays(days);
    if (days > 0) {
      const base = new Date(startDate || new Date().toISOString().split('T')[0]);
      base.setDate(base.getDate() + days);
      setValidUntilDate(base.toISOString().split('T')[0]);
    }
  };

  // Business Requirement Checklist (16 items)
  const [requirements, setRequirements] = useState<Record<string, boolean>>({
    core_hr: true,
    ess: true,
    attendance: true,
    leave: true,
    payroll: true,
    biometric: true,
    recruitment: false,
    performance: false,
    lms: false,
    expense: false,
    analytics: false,
    vendor_workforce: false,
    vendor_portal: false,
    procurement: false,
    invoice_settlement: false,
    client_billing: false,
  });

  // Handler for Opportunity Selection & Automatic Requirement Import
  const handleOpportunityChange = (oppId: string) => {
    setSelectedOppId(oppId);
    const opp = opportunities.find((o) => o.id === oppId);
    if (opp) {
      setCompanyName(opp.companyName);
      setContactName(opp.contactPerson);
      setContactDesignation(opp.designation);
      setContactEmail(opp.email);
      setContactPhone(opp.phone);
      setSalesOwner(opp.salesOwner);
      setEmployeeCount(opp.estimatedEmployees);
      setLocationsCount(opp.locationsCount);
      setCompaniesCount(opp.legalEntitiesCount);

      // Auto-import captured discovery requirements
      const newReqs: Record<string, boolean> = {
        core_hr: true,
        ess: true,
        attendance: true,
        leave: true,
        payroll: true,
        biometric: false,
        recruitment: false,
        performance: false,
        lms: false,
        expense: false,
        analytics: false,
        vendor_workforce: false,
        vendor_portal: false,
        procurement: false,
        invoice_settlement: false,
        client_billing: false,
      };

      if (opp.capturedRequirements && opp.capturedRequirements.length > 0) {
        opp.capturedRequirements.forEach((reqKey) => {
          newReqs[reqKey] = true;
        });
      }
      setRequirements(newReqs);
    }
  };

  // Handler for Existing Client Selection
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const c = clients.find((item) => item.id === clientId);
    if (c) {
      setCompanyName(c.legalName);
      setContactName(c.contactPerson || '');
      setContactDesignation(c.designation || '');
      setContactEmail(c.email || '');
      setContactPhone(c.phone || '');
      setEmployeeCount(c.employeeCount || 850);
      setLocationsCount(c.locationsCount || 12);
      setCompaniesCount(c.companiesCount || 2);
      setClientLogoUrl(c.logoUrl || '');
    }
  };

  const toggleReq = (key: string) => {
    setRequirements((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // STAGE 2: Module Configurations
  const [expandedFeatureModule, setExpandedFeatureModule] = useState<string | null>(null);
  const [biometricDevicesCount, setBiometricDevicesCount] = useState<number>(5);
  const [biometricIntegration, setBiometricIntegration] = useState<string>('ZKTeco');
  const [payrollFrequency, setPayrollFrequency] = useState<'Monthly' | 'Weekly' | 'Bi-weekly'>('Monthly');
  const [payrollStatutory, setPayrollStatutory] = useState({
    pf: true,
    esi: true,
    pt: true,
    tds: true,
  });
  const [analyticsAdvanced, setAnalyticsAdvanced] = useState<boolean>(true);

  // STAGE 3: Plan & Scope
  const [employeeCount, setEmployeeCount] = useState<number>(selectedClient?.employeeCount || 850);
  const [locationsCount, setLocationsCount] = useState<number>(selectedClient?.locationsCount || 12);
  const [companiesCount, setCompaniesCount] = useState<number>(selectedClient?.companiesCount || 2);
  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanTierCode>('ENTERPRISE');

  // Plan Recommendation Engine
  const recommendedPlan = useMemo<{
    code: PlanTierCode;
    reason: string[];
  }>(() => {
    const reasons: string[] = [];
    if (requirements.vendor_workforce) reasons.push('Vendor Workforce Management selected');
    if (requirements.procurement) reasons.push('Procurement & Purchase Orders selected');
    if (requirements.invoice_settlement) reasons.push('Invoice & 3-Way Match Settlement selected');
    if (companiesCount > 1) reasons.push(`Multi-company architecture (${companiesCount} Legal Entities)`);
    if (employeeCount > 500) reasons.push(`Enterprise workforce scale (${employeeCount} Employees)`);

    if (requirements.vendor_workforce || requirements.procurement || requirements.invoice_settlement || employeeCount > 500) {
      return { code: 'ENTERPRISE', reason: reasons };
    }
    if (requirements.recruitment || requirements.performance || requirements.lms) {
      return { code: 'BUSINESS', reason: ['Talent suite (Recruitment/Performance/LMS) required'] };
    }
    if (requirements.payroll) {
      return { code: 'PROFESSIONAL', reason: ['Indian Statutory Payroll required'] };
    }
    return { code: 'STARTER', reason: ['Basic Core HR only'] };
  }, [requirements, companiesCount, employeeCount]);

  // STAGE 4: Add-ons & One-time Implementation
  const allAddons = useMemo(() => saasCatalogueService.getAddons(), []);
  const allPlans = useMemo(() => saasPricingEngine.getPlans(), []);

  // Filter add-ons: only show what is NOT included in current plan
  const planIncludedAddons = useMemo(() => {
    if (selectedPlanCode === 'ENTERPRISE') {
      return ['recruitment_suite', 'performance_management', 'learning_management', 'sso_saml_auth', 'api_developer_pack'];
    }
    if (selectedPlanCode === 'BUSINESS') {
      return ['recruitment_suite', 'performance_management', 'learning_management', 'sso_saml_auth'];
    }
    return [];
  }, [selectedPlanCode]);

  const [selectedAddonKeys, setSelectedAddonKeys] = useState<string[]>(['biometric_device_gateway', 'premium_support_sla']);
  const [oneTimeServices, setOneTimeServices] = useState<OneTimeServiceItem[]>([
    { key: 'impl', name: 'Comprehensive Implementation & Provisioning', description: 'End-to-end workspace configuration and workflow rollout', rate: 50000, selected: true },
    { key: 'migration', name: 'Legacy Master Data Migration & Verification', description: 'Data cleansing, master validation, and parallel verification', rate: 25000, selected: true },
    { key: 'payroll_config', name: 'Payroll Rule & Statutory Configuration', description: 'CTC structures, tax slabs, PF/ESI/PT rules & historical mapping', rate: 30000, selected: true },
    { key: 'bio_setup', name: 'Biometric Hardware Gateway Setup (ADMS)', description: 'Push daemon configuration, network mapping & punch testing', rate: 20000, selected: true },
    { key: 'training', name: 'HR Admin & Super Admin Training', description: 'Train-the-trainer workshops and operational playbook handover', rate: 15000, selected: true },
  ]);

  // STAGE 5 & 6: Commercial Terms & Pricing
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('Annual');
  const [contractDurationMonths, setContractDurationMonths] = useState<number>(12);
  const [paymentTerms, setPaymentTerms] = useState<string>('15 Days');
  const [annualPriceEscalation, setAnnualPriceEscalation] = useState<number>(5);
  const [implementationTimeline, setImplementationTimeline] = useState<string>('4–6 Weeks');
  const [negotiatedDiscountPct, setNegotiatedDiscountPct] = useState<number>(5);

  // Compute live quote through the pricing engine
  const calculatedPricing = useMemo(() => {
    // Add biometric devices add-on pricing if required
    const effectiveAddons = [...selectedAddonKeys];
    if (requirements.biometric && !effectiveAddons.includes('biometric_device_gateway')) {
      effectiveAddons.push('biometric_device_gateway');
    }

    const quoteResult = saasPricingEngine.calculateQuote({
      planCode: selectedPlanCode,
      employeeCount,
      billingCycle,
      selectedAddonKeys: effectiveAddons.filter((k) => !planIncludedAddons.includes(k)),
      extraBiometricDevices: requirements.biometric ? biometricDevicesCount : 0,
      customDiscountPercent: negotiatedDiscountPct > 0 ? negotiatedDiscountPct : undefined,
    });

    const oneTimeTotal = oneTimeServices
      .filter((s) => s.selected)
      .reduce((sum, s) => sum + s.rate, 0);

    const recurringAnnualPreTax = quoteResult.netPreTaxAmount;
    const taxableSubtotal = recurringAnnualPreTax + oneTimeTotal;
    const gstAmount = Math.round(taxableSubtotal * 0.18);
    const totalContractValue = taxableSubtotal + gstAmount;

    return {
      quoteResult,
      oneTimeTotal,
      recurringAnnualPreTax,
      taxableSubtotal,
      gstAmount,
      totalContractValue,
    };
  }, [
    selectedPlanCode,
    employeeCount,
    billingCycle,
    selectedAddonKeys,
    requirements.biometric,
    biometricDevicesCount,
    negotiatedDiscountPct,
    oneTimeServices,
    planIncludedAddons,
  ]);

  // Compile final quotation object
  const createQuotationObject = (status: 'DRAFT' | 'SENT' | 'INTERNAL_REVIEW' = 'SENT'): CommercialQuotation => {
    const plan = allPlans.find((p) => p.code === selectedPlanCode) || allPlans[3];
    const quoteNumber = `QT-2026-00${Math.floor(100 + Math.random() * 900)}`;

    const isNewCustomer = originType === 'NEW_CUSTOMER';
    const opp = selectedOpp;
    const client = clients.find((c) => c.id === selectedClientId) || clients[0];

    const finalClientName = isNewCustomer
      ? (opp?.companyName || companyName || 'Prospective Enterprise Pvt Ltd')
      : (client?.legalName || companyName || 'Client Organization');

    const finalClientGstin = isNewCustomer
      ? undefined // "GST details pending verification"
      : client?.gstin;

    const finalClientState = isNewCustomer
      ? (clientState || 'Tamil Nadu')
      : (client?.billingAddress?.state || clientState || 'Tamil Nadu');

    return {
      id: `qt-${Date.now()}`,
      quotationNumber: quoteNumber,
      version: 1,
      originType: originType || 'NEW_CUSTOMER',
      purpose: !isNewCustomer ? quotationPurpose : 'NEW_SUBSCRIPTION',
      opportunityId: opp?.id,
      opportunityNumber: opp?.opportunityNumber,
      leadId: isNewCustomer ? opp?.leadId : undefined,
      leadNumber: isNewCustomer ? opp?.leadNumber : undefined,
      clientId: !isNewCustomer ? client?.id : undefined,
      clientName: finalClientName,
      clientLogoUrl: clientLogoUrl || (!isNewCustomer ? client?.logoUrl : undefined),
      clientGstin: finalClientGstin,
      clientEmail: contactEmail || (isNewCustomer ? (opp?.email || 'contact@prospect.com') : client?.email),
      clientPhone: contactPhone || (isNewCustomer ? opp?.phone : client?.phone),
      clientState: finalClientState,
      salesOwner,
      planCode: selectedPlanCode,
      planName: plan.name,
      billingCycle,
      employeeCount,
      includedEmployees: plan.includedEmployees,
      additionalEmployeesCount: Math.max(0, employeeCount - plan.includedEmployees),
      pepmRate: calculatedPricing.quoteResult.appliedPepmRate,
      selectedAddonKeys,
      requirements: {
        employees: employeeCount,
        companies: companiesCount,
        locations: locationsCount,
        modulesRequested: plan.includedModules,
        ssoRequired: selectedAddonKeys.includes('sso_saml_auth'),
        apiTier: 'Enterprise',
      },
      terms: {
        contractDurationMonths,
        billingFrequency: billingCycle,
        paymentTerms,
        subscriptionStartDate: startDate,
        renewalTerm: 'Annual Automatic Renewal',
        quotationValidityDays: validityDays,
        annualEscalationPct: annualPriceEscalation,
        implementationTimelineWeeks: implementationTimeline,
      },
      solutionConfig: {
        requirements: Object.keys(requirements).filter((k) => requirements[k]),
        biometricRequired: requirements.biometric,
        biometricDevicesCount,
        biometricIntegration,
        payrollFrequency,
        payrollStatutory: Object.keys(payrollStatutory).filter((k) => (payrollStatutory as any)[k]),
        analyticsTiers: analyticsAdvanced ? ['Standard Analytics', 'Advanced Analytics'] : ['Standard Analytics'],
        vendorWorkforceRequired: requirements.vendor_workforce,
        vendorPortalRequired: requirements.vendor_portal,
        procurementRequired: requirements.procurement,
        invoiceSettlementRequired: requirements.invoice_settlement,
        clientBillingRequired: requirements.client_billing,
      },
      lineItems: [],
      oneTimeServices: oneTimeServices.filter((s) => s.selected),
      pricingSnapshot: {
        pricingVersionId: 'pv-2026-q4',
        basePlanMonthly: calculatedPricing.quoteResult.baseMonthlyPrice,
        overageMonthly: calculatedPricing.quoteResult.employeeOverageMonthly,
        addonsMonthly: calculatedPricing.quoteResult.addonsMonthlyTotal,
        grossMonthlyRunRate: calculatedPricing.quoteResult.grossMonthlyTotal,
        cycleMultiplier: calculatedPricing.quoteResult.cycleMultiplier,
        termDiscountPercent: calculatedPricing.quoteResult.cycleDiscountPercent,
        negotiatedDiscountPercent: negotiatedDiscountPct,
        totalDiscountPercent: calculatedPricing.quoteResult.cycleDiscountPercent + negotiatedDiscountPct,
        discountAmount: calculatedPricing.quoteResult.cycleDiscountAmount,
        recurringPreTax: calculatedPricing.recurringAnnualPreTax,
        oneTimePreTax: calculatedPricing.oneTimeTotal,
        taxableSubtotal: calculatedPricing.taxableSubtotal,
        gstRatePercent: 18,
        gstAmount: calculatedPricing.gstAmount,
        totalFirstYearValue: calculatedPricing.totalContractValue,
      },
      approval: {
        required: negotiatedDiscountPct > 10,
        tier: negotiatedDiscountPct > 20 ? 'Commercial Head' : negotiatedDiscountPct > 10 ? 'Sales Manager' : 'Sales',
        approvedBy: negotiatedDiscountPct <= 10 ? 'Auto-Approved (Sales Authority)' : undefined,
        approvedAt: negotiatedDiscountPct <= 10 ? new Date().toISOString() : undefined,
      },
      status,
      validUntil: validUntilDate,
      paymentLink: enableRazorpay ? razorpayOrderService.generatePaymentLink(quoteNumber, calculatedPricing.totalContractValue) : undefined,
      razorpayQrPayload: enableRazorpay ? razorpayOrderService.generateUpiQrPayload(quoteNumber, calculatedPricing.totalContractValue, finalClientName) : undefined,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      versions: [
        {
          versionNumber: 1,
          createdAt: new Date().toISOString().slice(0, 10),
          createdBy: salesOwner,
          grossAnnualValue: calculatedPricing.quoteResult.grossMonthlyTotal * 12,
          discountPercentage: calculatedPricing.quoteResult.cycleDiscountPercent + negotiatedDiscountPct,
          discountAmount: calculatedPricing.quoteResult.cycleDiscountAmount,
          netAnnualValue: calculatedPricing.recurringAnnualPreTax,
          oneTimeServicesTotal: calculatedPricing.oneTimeTotal,
          gstAmount: calculatedPricing.gstAmount,
          totalContractValue: calculatedPricing.totalContractValue,
          status,
        },
      ],
    };
  };

  const handleSaveDraft = () => {
    const q = createQuotationObject('DRAFT');
    saasCommercialService.saveQuotation(q);
    onSaveQuote(q);
  };

  const handleSendForApproval = () => {
    const q = createQuotationObject('INTERNAL_REVIEW');
    saasCommercialService.saveQuotation(q);
    onSaveQuote(q);
  };

  const handleGenerateProposal = () => {
    const q = createQuotationObject('SENT');
    saasCommercialService.saveQuotation(q);
    onSaveQuote(q);
    onOpenPreview(q);
  };

  const stepsList = useMemo(
    () => [
      { num: 1, label: originType === 'NEW_CUSTOMER' ? 'Opportunity' : 'Client & Scope' },
      { num: 2, label: 'HRMS Modules' },
      { num: 3, label: 'Plan & Scope' },
      { num: 4, label: 'Add-ons & Services' },
      { num: 5, label: 'Commercial Pricing' },
      { num: 6, label: 'Terms & Approval' },
      { num: 7, label: 'Review & Generate' },
    ],
    [originType]
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in flex flex-col h-full max-h-full relative">
      
      {/* ── Top Header & Real 7-Stage Progress Bar ──────────────────────────── */}
      <div className="bg-slate-900 text-white px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Create SaaS Quotation & Solution Proposal</h2>
                {originType ? (
                  <>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Step {currentStep} of 7
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        originType === 'NEW_CUSTOMER'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {originType === 'NEW_CUSTOMER' ? 'New Customer (Prospect)' : 'Existing Client'}
                    </span>
                  </>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Source Selection
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative HRMS Solution Configurator, Commercial Calculator & Proposal Generator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {originType && (
              <button
                type="button"
                onClick={() => setOriginType(null)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors font-medium mr-2"
              >
                ← Switch Origin
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel & Exit
            </Button>
          </div>
        </div>

        {/* 7-Stage Progress Stepper (Only active once origin is chosen) */}
        {originType && (
          <div className="mt-5 grid grid-cols-7 gap-1 pt-3 border-t border-slate-800">
            {stepsList.map((step) => {
              const isCompleted = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex flex-col items-center gap-1 group text-left cursor-pointer transition-all ${
                    isCurrent ? 'opacity-100' : isCompleted ? 'opacity-90 hover:opacity-100' : 'opacity-40'
                  }`}
                >
                  <div className="w-full flex items-center">
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/40'
                          : isCompleted
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.num}
                    </div>
                    <div
                      className={`h-1 w-full mx-1 rounded-full ${
                        isCompleted ? 'bg-emerald-600' : isCurrent ? 'bg-emerald-500/40' : 'bg-slate-800'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-medium text-center truncate max-w-full block ${
                      isCurrent ? 'text-emerald-400 font-bold' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main Content Area ─────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-50/50 min-h-0">

        {/* ── STAGE 0: COMPACT SOURCE SELECTION SCREEN ───────────────────────── */}
        {originType === null && (
          <div className="max-w-3xl mx-auto my-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1.5 pb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Commercial Quotation Origin
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2">What are you quoting?</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                In B2B SaaS, new sales start from prospective CRM Opportunities, whereas expansions start directly from an active Client.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              {/* Option 1: New Customer (From Opportunity) */}
              <div
                onClick={() => {
                  setOriginType('NEW_CUSTOMER');
                  if (!selectedOppId && opportunities.length > 0) {
                    handleOpportunityChange(opportunities[0].id);
                  }
                  setCurrentStep(1);
                }}
                className="group relative bg-white p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900">NEW CUSTOMER</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Sales Funnel</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Create quotation from a Lead or Sales Opportunity. Auto-imports discovery requirements and prospective employee headcount.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-[11.5px] text-slate-600">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>Imports captured CRM discovery requirements</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>No premature Client or Tenant creation</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>Converts to Client only upon commercial acceptance</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Select Opportunity →
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {opportunities.length} Pipeline Deals
                  </span>
                </div>
              </div>

              {/* Option 2: Existing Customer */}
              <div
                onClick={() => {
                  setOriginType('EXISTING_CUSTOMER');
                  if (!selectedClientId && clients.length > 0) {
                    handleClientChange(clients[0].id);
                  }
                  setCurrentStep(1);
                }}
                className="group relative bg-white p-6 rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900">EXISTING CUSTOMER</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">Account Expansion</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    New plan, upgrade, seat expansion, modular add-on, or annual renewal quotation for an active customer.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-[11.5px] text-slate-600">
                    <div className="flex items-center gap-2 text-purple-700 font-semibold">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>Loads live subscription and current MRR</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>Prevents duplicate Client and Tenant accounts</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>Computes delta pricing vs current plan</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Select Client →
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {clients.length} Active Accounts
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: OPPORTUNITY / CLIENT & BUSINESS REQUIREMENT ──────────────── */}
        {originType !== null && currentStep === 1 && (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Header depending on origin */}
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                      originType === 'NEW_CUSTOMER'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {originType === 'NEW_CUSTOMER' ? 'Step 1: Opportunity & Customer Requirement' : 'Step 1: Client & Subscription Scope'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {originType === 'NEW_CUSTOMER' ? 'Opportunity & Customer Requirement' : 'Client & Subscription Scope'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {originType === 'NEW_CUSTOMER'
                    ? 'Start by identifying the sales opportunity. Requirements and organization scope will be imported automatically.'
                    : 'Select an active client to configure their renewal, seat expansion, or plan upgrade.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOriginType(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
              >
                ← Change Source
              </button>
            </div>

            {/* PATH A: NEW CUSTOMER OPPORTUNITY SELECTION */}
            {originType === 'NEW_CUSTOMER' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 block text-xs">
                    Source Opportunity *
                  </label>
                  {selectedOpp && (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Imported from Opportunity
                    </span>
                  )}
                </div>

                <select
                  value={selectedOppId}
                  onChange={(e) => handleOpportunityChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm bg-white shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Choose Opportunity from CRM --</option>
                  {opportunities.map((opp) => (
                    <option key={opp.id} value={opp.id}>
                      {opp.opportunityNumber} — {opp.companyName} ({opp.estimatedEmployees} Employees, {opp.industry})
                    </option>
                  ))}
                </select>

                {/* When opportunity is selected, show banner */}
                {selectedOpp && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 rounded-xl bg-slate-900 text-white grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Opportunity</span>
                        <span className="font-bold text-emerald-400 font-mono text-sm">{selectedOpp.opportunityNumber}</span>
                        <span className="block text-[11px] text-slate-300 truncate mt-0.5">{selectedOpp.dealName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Lead Reference</span>
                        <span className="font-bold text-blue-300 font-mono text-sm">{selectedOpp.leadNumber || 'Direct Opp'}</span>
                        <span className="block text-[11px] text-slate-300 mt-0.5">Stage: {selectedOpp.stage}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sales Owner</span>
                        <span className="font-bold text-slate-200 text-sm">{selectedOpp.salesOwner}</span>
                        <span className="block text-[11px] text-slate-400 mt-0.5">Prob: {selectedOpp.probability}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Expected Close</span>
                        <span className="font-bold text-amber-300 text-sm">{selectedOpp.expectedCloseDate}</span>
                        <div className="flex gap-2.5 mt-1">
                          <button
                            type="button"
                            onClick={() => setActiveDrawer('OPPORTUNITY')}
                            className="text-[10.5px] font-bold text-emerald-300 hover:text-emerald-200 underline inline-flex items-center gap-0.5"
                          >
                            <span>View Opp</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Prospect & Company Details (Always visible and editable) */}
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="md:col-span-1">
                      <CompanyLogoUpload
                        value={clientLogoUrl}
                        onChange={setClientLogoUrl}
                        companyName={companyName || 'Prospect'}
                        label="Client Brand Logo"
                        compact
                      />
                    </div>
                    <div className="md:col-span-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-700 block text-[11px] font-semibold mb-1">Company / Legal Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-slate-700 block text-[11px] font-semibold mb-1">Industry Vertical</label>
                          <input
                            type="text"
                            placeholder="e.g. Software & Technology"
                            value={clientIndustry}
                            onChange={(e) => setClientIndustry(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-slate-700 block text-[11px] font-semibold mb-1">Primary Contact Person *</label>
                          <input
                            type="text"
                            placeholder="e.g. Rajesh Kumar"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-slate-700 block text-[11px] font-semibold mb-1">Designation</label>
                          <input
                            type="text"
                            placeholder="e.g. Chief HR Officer / Director"
                            value={contactDesignation}
                            onChange={(e) => setContactDesignation(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-slate-700 block text-[11px] font-semibold mb-1">Contact Email *</label>
                          <input
                            type="email"
                            placeholder="e.g. hr@acmetech.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-700 block text-[11px] font-semibold mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98400 12345"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 block text-[11px] font-semibold mb-1">Billing State / Place of Supply</label>
                      <select
                        value={clientState}
                        onChange={(e) => setClientState(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white"
                      >
                        <option value="Tamil Nadu">Tamil Nadu (33)</option>
                        <option value="Karnataka">Karnataka (29)</option>
                        <option value="Maharashtra">Maharashtra (27)</option>
                        <option value="Telangana">Telangana (36)</option>
                        <option value="Delhi">Delhi (07)</option>
                        <option value="Haryana">Haryana (06)</option>
                        <option value="Uttar Pradesh">Uttar Pradesh (09)</option>
                        <option value="Gujarat">Gujarat (24)</option>
                        <option value="Kerala">Kerala (32)</option>
                        <option value="West Bengal">West Bengal (19)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-700 block text-[11px] font-semibold mb-1">Initial Workforce Headcount</label>
                      <input
                        type="number"
                        min={1}
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Sales Ownership & Validity */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <label className="text-slate-500 block text-[11px] font-semibold mb-1">Sales Owner</label>
                      <select
                        value={salesOwner}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSalesOwner(val);
                          const matched = salesOwners.find((so) => `${so.name} (${so.designation})` === val || so.name === val);
                          if (matched && matched.territory) {
                            setSalesTeam(matched.territory);
                          }
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white text-slate-800"
                      >
                        {salesOwners.map((so) => (
                          <option key={so.id} value={`${so.name} (${so.designation})`}>
                            {so.name} — {so.designation}
                          </option>
                        ))}
                        <option value="Direct Inbound Commercial">Direct Inbound Commercial</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-500 block text-[11px] font-semibold mb-1">Sales Team</label>
                      <input
                        type="text"
                        value={salesTeam}
                        onChange={(e) => setSalesTeam(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 block text-[11px] font-semibold mb-1">Subscription Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          const base = new Date(e.target.value);
                          base.setDate(base.getDate() + validityDays);
                          setValidUntilDate(base.toISOString().split('T')[0]);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-500 text-[11px] font-semibold">Valid Until</label>
                        <span className="text-[10px] text-emerald-700 font-bold font-mono">({validityDays}d window)</span>
                      </div>
                      <input
                        type="date"
                        value={validUntilDate}
                        onChange={(e) => {
                          setValidUntilDate(e.target.value);
                          setValidityDays(0);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PATH B: EXISTING CLIENT SELECTION */}
            {originType === 'EXISTING_CUSTOMER' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1 text-xs">
                      Select Existing Client Organization *
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm bg-white shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    >
                      <option value="">-- Choose Client Organization --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.legalName} ({c.gstin}) — {c.employeeCount} Employees
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1 text-xs">
                      Quotation Purpose / Proposal Type *
                    </label>
                    <select
                      value={quotationPurpose}
                      onChange={(e) => setQuotationPurpose(e.target.value as QuotationPurpose)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm bg-white shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    >
                      <option value="EXPANSION">Workforce Expansion & Additional Seats</option>
                      <option value="PLAN_UPGRADE">Plan Upgrade (e.g. Professional → Enterprise)</option>
                      <option value="ADD_MODULES">Modular Add-on Procurement</option>
                      <option value="RENEWAL">Annual Contract Renewal</option>
                      <option value="CONTRACT_AMENDMENT">Contract Amendment</option>
                      <option value="PLAN_DOWNGRADE">Plan Downgrade</option>
                      <option value="NEW_SUBSCRIPTION">Additional Subsidiary Subscription</option>
                    </select>
                  </div>
                </div>

                {selectedClient && selectedClientId ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Live Subscription Benchmark Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Current Live Subscription & Account Context
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          GSTIN: {selectedClient.gstin} | State: {selectedClient.billingAddress.state}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current Plan</span>
                          <span className="font-bold text-slate-800 text-sm">Business</span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">{selectedClient.employeeCount} Current Employees</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current MRR</span>
                          <span className="font-bold text-slate-900 text-sm">₹74,394/mo</span>
                          <span className="block text-[11px] text-emerald-600 mt-0.5">Active Tenant</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Renewal Date</span>
                          <span className="font-bold text-slate-800 text-sm">31-Oct-2027</span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">Auto-renewal active</span>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                          <span className="text-purple-700 block text-[10px] uppercase font-semibold">Purpose</span>
                          <span className="font-bold text-purple-900 text-sm">{quotationPurpose.replace(/_/g, ' ')}</span>
                          <span className="block text-[11px] text-purple-700 mt-0.5">No duplicate client</span>
                        </div>
                      </div>
                    </div>

                    {/* Primary Contact Details & Brand Logo */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pt-2">
                      <div className="md:col-span-1">
                        <CompanyLogoUpload
                          value={clientLogoUrl || selectedClient?.logoUrl}
                          onChange={setClientLogoUrl}
                          companyName={companyName || selectedClient?.legalName}
                          label="Client Brand Logo"
                          compact
                        />
                      </div>
                      <div className="md:col-span-3 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-500 block text-[11px] font-semibold mb-1">Client Legal Name</label>
                            <input
                              type="text"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-slate-500 block text-[11px] font-semibold mb-1">Primary Contact</label>
                            <input
                              type="text"
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-500 block text-[11px] font-semibold mb-1">Designation</label>
                            <input
                              type="text"
                              value={contactDesignation}
                              onChange={(e) => setContactDesignation(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-slate-500 block text-[11px] font-semibold mb-1">Email</label>
                            <input
                              type="email"
                              value={contactEmail}
                              onChange={(e) => setContactEmail(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sales Ownership & Validity */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                      <div>
                        <label className="text-slate-500 block text-[11px] font-semibold mb-1">Account Manager / Sales Owner</label>
                        <select
                          value={salesOwner}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSalesOwner(val);
                            const matched = salesOwners.find((so) => `${so.name} (${so.designation})` === val || so.name === val);
                            if (matched && matched.territory) {
                              setSalesTeam(matched.territory);
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white text-slate-800"
                        >
                          {salesOwners.map((so) => (
                            <option key={so.id} value={`${so.name} (${so.designation})`}>
                              {so.name} — {so.designation}
                            </option>
                          ))}
                          <option value="Direct Inbound Commercial">Direct Inbound Commercial</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-500 block text-[11px] font-semibold mb-1">Sales Team</label>
                        <input
                          type="text"
                          value={salesTeam}
                          onChange={(e) => setSalesTeam(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 block text-[11px] font-semibold mb-1">Effective Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 block text-[11px] font-semibold mb-1">Quotation Valid Until</label>
                        <input
                          type="date"
                          value={validUntilDate}
                          onChange={(e) => setValidUntilDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">
                      Select an existing Client organization from the dropdown above to load their subscription terms.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Business Requirement Checklist (16 options) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">BUSINESS REQUIREMENT — What does the customer need?</h4>
                  <p className="text-xs text-slate-500">
                    Captures operational needs. The next stage converts these into appropriate commercial plan and modules.
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  {Object.values(requirements).filter(Boolean).length} / 16 Selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {[
                  { key: 'core_hr', label: 'Core HR' },
                  { key: 'ess', label: 'Employee Self Service' },
                  { key: 'attendance', label: 'Attendance' },
                  { key: 'leave', label: 'Leave' },
                  { key: 'payroll', label: 'Payroll' },
                  { key: 'biometric', label: 'Biometric' },
                  { key: 'recruitment', label: 'Recruitment' },
                  { key: 'performance', label: 'Performance' },
                  { key: 'lms', label: 'LMS' },
                  { key: 'expense', label: 'Expense' },
                  { key: 'analytics', label: 'Analytics' },
                  { key: 'vendor_workforce', label: 'Vendor Workforce' },
                  { key: 'vendor_portal', label: 'Vendor Portal' },
                  { key: 'procurement', label: 'Procurement' },
                  { key: 'invoice_settlement', label: 'Invoice & Settlement' },
                  { key: 'client_billing', label: 'Client Billing' },
                ].map((item) => {
                  const checked = requirements[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleReq(item.key)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all select-none ${
                        checked
                          ? 'border-emerald-500 bg-emerald-50/70 text-slate-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs">{item.label}</span>
                      <div className={`h-4 w-4 rounded flex items-center justify-center ${
                        checked ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                      }`}>
                        {checked && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: HRMS MODULES CONFIGURATOR ───────────────────────────────── */}
        {currentStep === 2 && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-xl font-bold text-slate-900">Select HRMS Modules</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose and configure the specific modules required for this customer's workforce.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Core HR */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-sm">CORE HR</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Included in All Plans
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>• Employee master & custom fields</div>
                  <div>• Organization structure & reporting hierarchies</div>
                  <div>• Employee lifecycle & document vault</div>
                  <div>• Onboarding, transfers, promotions & exit clearances</div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedFeatureModule(expandedFeatureModule === 'core' ? null : 'core')}
                  className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer block pt-1"
                >
                  {expandedFeatureModule === 'core' ? '▲ Hide Features' : 'View Features (9 capabilities) →'}
                </button>
                {expandedFeatureModule === 'core' && (
                  <div className="p-3 rounded-xl bg-slate-50 border text-[11px] text-slate-700 grid grid-cols-2 gap-1.5 animate-in fade-in">
                    <div>✓ Employee Master</div>
                    <div>✓ Organization Structure</div>
                    <div>✓ Employee Lifecycle</div>
                    <div>✓ Onboarding</div>
                    <div>✓ Employee Documents</div>
                    <div>✓ Digital Letters</div>
                    <div>✓ E-Signature</div>
                    <div>✓ HR Workflows</div>
                    <div>✓ Exit Management</div>
                  </div>
                )}
              </div>

              {/* Employee Self Service */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-sm">EMPLOYEE SELF SERVICE (ESS)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Included in All Plans
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>• Employee Profile, ID Card & Document Downloads</div>
                  <div>• Attendance History, Regularization & Shift View</div>
                  <div>• Digital Payslips, Tax Simulator & Form 16</div>
                  <div>• Mobile ESS App & Push Notification Center</div>
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg">
                  ✓ Mobile & Desktop Web ESS Portal Enabled
                </div>
              </div>

              {/* Attendance & Time */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-sm">ATTENDANCE & TIME</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Advanced Tier
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-50 border">
                    <strong className="block text-slate-800 font-bold">Basic</strong>
                    <span className="text-slate-500">Web/Mobile punch, manual log, history</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border">
                    <strong className="block text-slate-800 font-bold">Advanced</strong>
                    <span className="text-slate-500">Rosters, rotational shifts, OT rules</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border">
                    <strong className="block text-slate-800 font-bold">Premium</strong>
                    <span className="text-slate-500">GPS attendance, geofencing, kiosk</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t">
                  <span>GPS Geofencing: <strong>Included ✓</strong></span>
                  <span className="text-emerald-700 font-bold">Shift Roster Active</span>
                </div>
              </div>

              {/* Biometric & Device Management */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-slate-900 text-sm">BIOMETRIC HARDWARE GATEWAY</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRequirements({ ...requirements, biometric: false })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        !requirements.biometric ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Not Required
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequirements({ ...requirements, biometric: true })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        requirements.biometric ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      ● Required
                    </button>
                  </div>
                </div>

                {requirements.biometric && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-slate-500 block font-semibold mb-1">Number of Devices</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={biometricDevicesCount}
                          onChange={(e) => setBiometricDevicesCount(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 block font-semibold mb-1">Supported Hardware Protocol</label>
                        <select
                          value={biometricIntegration}
                          onChange={(e) => setBiometricIntegration(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium bg-white"
                        >
                          <option value="ZKTeco">ZKTeco Push Protocol</option>
                          <option value="eSSL ADMS">eSSL ADMS Cloud Gateway</option>
                          <option value="Realtime Push">Realtime Push Daemon</option>
                          <option value="Matrix COSEC">Matrix COSEC</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex justify-between items-center text-blue-900 font-medium">
                      <span>{biometricDevicesCount} Devices × ₹500/device/month</span>
                      <strong className="text-sm font-bold">₹{(biometricDevicesCount * 500).toLocaleString('en-IN')}/mo</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* India Statutory Payroll */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-sm">INDIA STATUTORY PAYROLL</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Compliant India Edition
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-500 block font-semibold mb-1">Frequency</label>
                    <div className="flex gap-2">
                      {(['Monthly', 'Weekly', 'Bi-weekly'] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setPayrollFrequency(freq)}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                            payrollFrequency === freq ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-500 block font-semibold mb-1">Country Jurisdiction</label>
                    <input type="text" value="India" disabled className="w-full px-2.5 py-1 rounded bg-slate-100 font-bold" />
                  </div>
                </div>

                <div className="pt-2 border-t text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Statutory Deductions & Filings</span>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">✓ PF (Provident Fund)</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">✓ ESI (State Insurance)</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">✓ PT (Professional Tax)</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">✓ TDS / Form 16</span>
                  </div>
                </div>
              </div>

              {/* Workforce Operations: Vendor + Procurement + 3-Way Match */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-400" />
                    <div>
                      <span className="font-bold text-white text-sm block">WORKFORCE OPERATIONS & INDUSTRIAL SUITE</span>
                      <span className="text-[10px] text-slate-400">Vendor Contractors, Procurement Requisitions & 3-Way Match Settlement</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Enterprise Tier Exclusive
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                    <strong className="text-emerald-400 block font-bold">Vendor Workforce</strong>
                    <p className="text-slate-300 text-[11px]">
                      Contractor master, vendor onboarding, site deployment, shift attendance, and statutory PF/ESI compliance tracking.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                    <strong className="text-blue-400 block font-bold">Procurement</strong>
                    <p className="text-slate-300 text-[11px]">
                      Purchase requisitions, vendor quotation comparison statements, purchase orders (PO), and multi-tier approval chains.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                    <strong className="text-purple-400 block font-bold">Invoice & 3-Way Match</strong>
                    <p className="text-slate-300 text-[11px]">
                      Vendor invoice capture, 3-way matching (PO vs Attendance/GRN vs Invoice), GST/TDS deductions, and settlement ledger.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── STEP 3: PLAN & WORKFORCE SCOPE ─────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-xl font-bold text-slate-900">Plan & Workforce Scope</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review employee volume and let the intelligent engine recommend the appropriate commercial SaaS tier.
              </p>
            </div>

            {/* Scope Inputs */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-3 gap-4">
              <div>
                <label className="text-slate-500 block text-xs font-semibold mb-1">Total Workforce Headcount</label>
                <input
                  type="number"
                  min={10}
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(parseInt(e.target.value) || 10)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-base text-slate-900"
                />
              </div>
              <div>
                <label className="text-slate-500 block text-xs font-semibold mb-1">Operating Locations / Plants</label>
                <input
                  type="number"
                  min={1}
                  value={locationsCount}
                  onChange={(e) => setLocationsCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-base text-slate-900"
                />
              </div>
              <div>
                <label className="text-slate-500 block text-xs font-semibold mb-1">Legal Companies / Entities</label>
                <input
                  type="number"
                  min={1}
                  value={companiesCount}
                  onChange={(e) => setCompaniesCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-base text-slate-900"
                />
              </div>
            </div>

            {/* Recommendation Engine Banner */}
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-800">RECOMMENDED COMMERCIAL PLAN</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900">{recommendedPlan.code} PLAN</h4>
                <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                  {recommendedPlan.reason.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setSelectedPlanCode(recommendedPlan.code)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-xs"
              >
                Use Recommended Plan ({recommendedPlan.code}) →
              </Button>
            </div>

            {/* Plan Tier Selection Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {allPlans.map((p) => {
                const isSelected = selectedPlanCode === p.code;
                const isRec = recommendedPlan.code === p.code;
                const liveTierMonthly = p.baseMonthlyPrice > 0
                  ? p.baseMonthlyPrice + Math.max(0, employeeCount - p.includedEmployees) * p.additionalEmployeePrice
                  : employeeCount * p.additionalEmployeePrice;

                return (
                  <div
                    key={p.code}
                    onClick={() => setSelectedPlanCode(p.code)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {isRec && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider">
                          Recommended
                        </span>
                      )}
                      <h5 className="font-bold text-slate-900 text-sm">{p.name}</h5>
                      <div className="text-base font-black text-emerald-700 mt-1">
                        {p.baseMonthlyPrice > 0 ? (
                          <>₹{p.baseMonthlyPrice.toLocaleString('en-IN')}<span className="text-xs font-normal text-slate-500">/mo base</span></>
                        ) : (
                          <>₹{p.additionalEmployeePrice}<span className="text-xs font-normal text-slate-500">/emp/mo</span></>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {p.baseMonthlyPrice > 0
                          ? `Includes ${p.includedEmployees} employees`
                          : `Pure PEPM (₹${p.additionalEmployeePrice} per seat)`}
                      </p>

                      <div className="mt-2.5 px-2 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-medium">Est. for {employeeCount} seats:</span>
                        <strong className="text-emerald-800 font-bold">₹{liveTierMonthly.toLocaleString('en-IN')}/mo</strong>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                      <div>PEPM Rate: <strong>₹{p.additionalEmployeePrice}/emp</strong></div>
                      <div>Locations: <strong>{p.quotas.maxLocations}</strong></div>
                      <div>Support: <strong>{p.quotas.supportSla}</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comprehensive Plan Matrix Comparison Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-xs">
              <div className="p-3 bg-slate-100 font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                Full Plan Capability Matrix
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-slate-500 font-semibold text-[11px]">
                    <th className="p-2.5 pl-4">Functional Capability</th>
                    <th className={`p-2.5 text-center ${selectedPlanCode === 'STARTER' ? 'bg-emerald-50 text-emerald-900 font-bold' : ''}`}>Starter {selectedPlanCode === 'STARTER' ? '(Selected)' : ''}</th>
                    <th className={`p-2.5 text-center ${selectedPlanCode === 'PREMIUM' ? 'bg-emerald-50 text-emerald-900 font-bold' : ''}`}>Professional {selectedPlanCode === 'PREMIUM' ? '(Selected)' : ''}</th>
                    <th className={`p-2.5 text-center ${selectedPlanCode === 'BUSINESS' ? 'bg-emerald-50 text-emerald-900 font-bold' : ''}`}>Business {selectedPlanCode === 'BUSINESS' ? '(Selected)' : ''}</th>
                    <th className={`p-2.5 text-center ${selectedPlanCode === 'ENTERPRISE' ? 'bg-emerald-50 text-emerald-900 font-bold' : ''}`}>Enterprise {selectedPlanCode === 'ENTERPRISE' ? '(Selected)' : ''}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-[11.5px]">
                  <tr><td className="p-2 pl-4">Core HR & Lifecycle</td><td className={`text-center ${selectedPlanCode === 'STARTER' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td><td className={`text-center ${selectedPlanCode === 'PREMIUM' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td><td className={`text-center ${selectedPlanCode === 'BUSINESS' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td><td className={`text-center ${selectedPlanCode === 'ENTERPRISE' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td></tr>
                  <tr><td className="p-2 pl-4">Employee Self Service</td><td className={`text-center ${selectedPlanCode === 'STARTER' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td><td className={`text-center ${selectedPlanCode === 'PREMIUM' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td><td className={`text-center ${selectedPlanCode === 'BUSINESS' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td><td className={`text-center ${selectedPlanCode === 'ENTERPRISE' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td></tr>
                  <tr><td className="p-2 pl-4">Attendance & Shift Rosters</td><td className={`text-center ${selectedPlanCode === 'STARTER' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>Basic</td><td className={`text-center ${selectedPlanCode === 'PREMIUM' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>Advanced</td><td className={`text-center ${selectedPlanCode === 'BUSINESS' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>Advanced</td><td className={`text-center ${selectedPlanCode === 'ENTERPRISE' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>Advanced</td></tr>
                  <tr><td className="p-2 pl-4">India Statutory Payroll (PF/ESI/TDS)</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'STARTER' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center ${selectedPlanCode === 'PREMIUM' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td><td className={`text-center ${selectedPlanCode === 'BUSINESS' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td><td className={`text-center ${selectedPlanCode === 'ENTERPRISE' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td></tr>
                  <tr><td className="p-2 pl-4">Recruitment / Candidate ATS</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'STARTER' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'PREMIUM' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center ${selectedPlanCode === 'BUSINESS' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td><td className={`text-center ${selectedPlanCode === 'ENTERPRISE' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td></tr>
                  <tr><td className="p-2 pl-4">Performance Appraisals & KRAs</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'STARTER' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'PREMIUM' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center ${selectedPlanCode === 'BUSINESS' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td><td className={`text-center ${selectedPlanCode === 'ENTERPRISE' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td></tr>
                  <tr><td className="p-2 pl-4">Vendor Workforce Management</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'STARTER' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'PREMIUM' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'BUSINESS' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center ${selectedPlanCode === 'ENTERPRISE' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td></tr>
                  <tr><td className="p-2 pl-4">Procurement Requisitions & POs</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'STARTER' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'PREMIUM' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'BUSINESS' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center ${selectedPlanCode === 'ENTERPRISE' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td></tr>
                  <tr><td className="p-2 pl-4">Invoice & 3-Way Match Settlement</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'STARTER' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'PREMIUM' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'BUSINESS' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center ${selectedPlanCode === 'ENTERPRISE' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td></tr>
                  <tr><td className="p-2 pl-4">Enterprise SSO & Dedicated SLA</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'STARTER' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'PREMIUM' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center text-slate-300 ${selectedPlanCode === 'BUSINESS' ? 'bg-emerald-50/30' : ''}`}>—</td><td className={`text-center ${selectedPlanCode === 'ENTERPRISE' ? 'font-bold text-emerald-700 bg-emerald-50/30' : ''}`}>✓</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── STEP 4: ADD-ONS & SERVICES ─────────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-xl font-bold text-slate-900">Add-ons & Professional Services</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure optional modular extensions and one-time implementation services.
              </p>
            </div>

            {/* Plan Included Notice */}
            <div className="bg-slate-100 p-4 rounded-xl text-xs text-slate-700 flex items-center justify-between">
              <div>
                <strong>Included in {selectedPlanCode} Tier:</strong>
                <p className="text-slate-500 mt-0.5">Core HR, ESS, Leave, Attendance, Indian Payroll, Vendor Workforce, Procurement, 3-Way Match.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[11px] shrink-0">
                No Double Billing
              </span>
            </div>

            {/* Modular Add-ons (Only non-included items) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Chargeable Modular Add-ons</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    key: 'biometric_device_gateway',
                    name: 'Biometric Hardware Push Gateways (5 Devices)',
                    price: 2500,
                    desc: 'eSSL ADMS / ZKTeco device daemon synchronization',
                  },
                  {
                    key: 'sso_saml_auth',
                    name: 'SSO / SAML Enterprise Identity',
                    price: 1999,
                    desc: 'Azure AD, Okta, and Google Workspace federated authentication',
                  },
                  {
                    key: 'whatsapp_meter_bundle',
                    name: 'WhatsApp HR Bot & Automated Payslip Delivery (5K Bundle)',
                    price: 1499,
                    desc: 'Self-service bot for payslip delivery, leaves, and attendance notifications',
                  },
                  {
                    key: 'ai_copilot_resume_screener',
                    name: 'AI HR Copilot & Smart Resume Screener',
                    price: 3500,
                    desc: 'GPT-powered candidate matching, interview questions, and automated HR policies',
                  },
                  {
                    key: 'premium_support_sla',
                    name: 'Dedicated 24/7 SLA & Named Support Engineer',
                    price: 4999,
                    desc: '1-Hour critical response SLA with assigned Technical Account Manager',
                  },
                  {
                    key: 'extra_storage_100gb',
                    name: 'Additional 100 GB Document Vault Storage',
                    price: 1000,
                    desc: 'High-availability S3 encrypted file storage for KYC and records',
                  },
                ].map((addon) => {
                  const isChecked = selectedAddonKeys.includes(addon.key);
                  return (
                    <div
                      key={addon.key}
                      onClick={() => {
                        setSelectedAddonKeys((prev) =>
                          prev.includes(addon.key) ? prev.filter((k) => k !== addon.key) : [...prev, addon.key]
                        );
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        isChecked ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{addon.name}</div>
                        <div className="text-[11px] text-slate-500">{addon.desc}</div>
                      </div>
                      <div className="text-right pl-3 shrink-0">
                        <span className="font-bold text-slate-900 text-xs">+₹{addon.price.toLocaleString('en-IN')}/mo</span>
                        <div className={`mt-1 h-4 w-4 rounded ml-auto flex items-center justify-center ${
                          isChecked ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                        }`}>
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* One-Time Implementation Services */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">ONE-TIME IMPLEMENTATION SERVICES</h4>
                  <p className="text-xs text-slate-500">Delivered by Joy Professional Services within 4–6 weeks.</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-semibold">Total One-Time Fee:</span>
                  <span className="text-sm font-black text-slate-900">₹{calculatedPricing.oneTimeTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {oneTimeServices.map((service, idx) => (
                  <div
                    key={service.key}
                    onClick={() => {
                      const updated = [...oneTimeServices];
                      updated[idx].selected = !updated[idx].selected;
                      setOneTimeServices(updated);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                      service.selected ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-4 w-4 rounded flex items-center justify-center ${
                        service.selected ? 'bg-slate-900 text-white' : 'border border-slate-300'
                      }`}>
                        {service.selected && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{service.name}</div>
                        <div className="text-[11px] text-slate-500">{service.description}</div>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">₹{service.rate.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dual Summary Pill */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Recurring SaaS</span>
                <span className="text-xl font-black">₹{calculatedPricing.quoteResult.grossMonthlyTotal.toLocaleString('en-IN')}<span className="text-xs font-medium text-slate-600">/month</span></span>
              </div>
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-900">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">One-Time Implementation</span>
                <span className="text-xl font-black">₹{calculatedPricing.oneTimeTotal.toLocaleString('en-IN')}<span className="text-xs font-medium text-slate-500"> fixed</span></span>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: COMMERCIAL PRICING ─────────────────────────────────────── */}
        {currentStep === 5 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-xl font-bold text-slate-900">Commercial Summary & Pricing</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authoritative single source of truth calculation generated directly from the SaaS pricing engine.
              </p>
            </div>

            {/* Visually Separated Dual Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Recurring SaaS Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">RECURRING SAAS SUBSCRIPTION</span>
                  <span className="text-[11px] font-mono text-slate-400">12 Months</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Monthly Run Rate:</span>
                    <strong className="text-slate-900">₹{calculatedPricing.quoteResult.grossMonthlyTotal.toLocaleString('en-IN')}/mo</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Annual Gross (12x):</span>
                    <strong className="text-slate-900">₹{(calculatedPricing.quoteResult.grossMonthlyTotal * 12).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Term & Negotiated Discount:</span>
                    <span>-₹{calculatedPricing.quoteResult.cycleDiscountAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black border-t pt-2 text-sm">
                    <span>Net Recurring SaaS:</span>
                    <span>₹{calculatedPricing.recurringAnnualPreTax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1">
                    Renewal Date: <strong>01-Nov-2027</strong>
                  </div>
                </div>
              </div>

              {/* One-Time Services Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-700">ONE-TIME PROFESSIONAL SERVICES</span>
                  <span className="text-[11px] font-mono text-slate-400">Setup & Migration</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Workspace Implementation:</span>
                    <strong>₹50,000</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Master Data Migration:</span>
                    <strong>₹25,000</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Payroll Statutory Setup:</span>
                    <strong>₹30,000</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Biometric Gateway Setup:</span>
                    <strong>₹20,000</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Admin Team Training:</span>
                    <strong>₹15,000</strong>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black border-t pt-2 text-sm">
                    <span>Total One-Time Services:</span>
                    <span>₹{calculatedPricing.oneTimeTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Commercial Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Itemized Commercial Breakdown</h4>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b">
                    <th className="p-2.5">Component</th>
                    <th className="p-2.5 text-center">Basis</th>
                    <th className="p-2.5 text-center">Unit Rate</th>
                    <th className="p-2.5 text-right">Annual Pre-Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="p-2.5 font-medium">{selectedPlanCode} Base Platform</td>
                    <td className="p-2.5 text-center">1 Instance ({calculatedPricing.quoteResult.includedEmployees} incl.)</td>
                    <td className="p-2.5 text-center">₹{calculatedPricing.quoteResult.baseMonthlyPrice.toLocaleString('en-IN')}/mo</td>
                    <td className="p-2.5 text-right font-semibold">₹{(calculatedPricing.quoteResult.baseMonthlyPrice * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Workforce Seats ({calculatedPricing.quoteResult.additionalEmployeesCount} Additional)</td>
                    <td className="p-2.5 text-center">{employeeCount} Total Seats</td>
                    <td className="p-2.5 text-center">₹{calculatedPricing.quoteResult.appliedPepmRate} PEPM</td>
                    <td className="p-2.5 text-right font-semibold">₹{(calculatedPricing.quoteResult.employeeOverageMonthly * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Modular Extensions & Hardware Gateways</td>
                    <td className="p-2.5 text-center">{selectedAddonKeys.length} Add-ons</td>
                    <td className="p-2.5 text-center">₹{calculatedPricing.quoteResult.addonsMonthlyTotal.toLocaleString('en-IN')}/mo</td>
                    <td className="p-2.5 text-right font-semibold">₹{(calculatedPricing.quoteResult.addonsMonthlyTotal * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">One-Time Professional Services</td>
                    <td className="p-2.5 text-center">Fixed Scope</td>
                    <td className="p-2.5 text-center">One-time</td>
                    <td className="p-2.5 text-right font-semibold">₹{calculatedPricing.oneTimeTotal.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={3} className="p-2.5 text-right">Net Taxable Value (SAC 998313):</td>
                    <td className="p-2.5 text-right font-black">₹{calculatedPricing.taxableSubtotal.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right text-slate-500">Statutory Goods & Services Tax (18% GST):</td>
                    <td className="p-2.5 text-right font-semibold text-slate-700">+₹{calculatedPricing.gstAmount.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-950 font-black text-sm">
                    <td colSpan={3} className="p-3 text-right">TOTAL FIRST-YEAR CONTRACT VALUE (TCV):</td>
                    <td className="p-3 text-right text-base text-emerald-700 font-mono">₹{calculatedPricing.totalContractValue.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── STEP 6: COMMERCIAL TERMS & APPROVAL ─────────────────────────────── */}
        {currentStep === 6 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-xl font-bold text-slate-900">Commercial Terms & Governance</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Establish the contractual parameters, payment milestones, and enterprise discount approvals.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contractual Parameters</h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-500 block font-semibold mb-1">Contract Duration</label>
                  <select
                    value={contractDurationMonths}
                    onChange={(e) => setContractDurationMonths(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value={12}>12 Months (1 Year)</option>
                    <option value={24}>24 Months (2 Years)</option>
                    <option value={36}>36 Months (3 Years)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block font-semibold mb-1">Billing Frequency</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="Annual">Annual in Advance (10% Disc.)</option>
                    <option value="Two-Year">Two-Year Upfront (15% Disc.)</option>
                    <option value="Monthly">Monthly Recurring</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block font-semibold mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="15 Days">Net 15 Days</option>
                    <option value="30 Days">Net 30 Days</option>
                    <option value="Immediate">Immediate on Invoice</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block font-semibold mb-1">Annual Price Escalation</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={annualPriceEscalation}
                      onChange={(e) => setAnnualPriceEscalation(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                    />
                    <span className="font-bold text-slate-600">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t text-xs">
                <div>
                  <label className="text-slate-500 block font-semibold mb-1">Subscription Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block font-semibold mb-1">Proposal Validity Period</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[7, 15, 30, 45, 60].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => handleValidityDaysChange(days)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          validityDays === days
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {days}d {days === 15 ? '★' : ''}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-slate-500 block font-semibold mb-1">Valid Until (Expiry Date)</label>
                  <input
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => {
                      setValidUntilDate(e.target.value);
                      const diff = Math.max(1, Math.round((new Date(e.target.value).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
                      setValidityDays(diff);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold bg-white text-emerald-800"
                  />
                </div>
              </div>

              {/* Implementation timeline */}
              <div className="pt-2 border-t text-xs">
                <label className="text-slate-500 block font-semibold mb-1">Implementation Timeline</label>
                <input
                  type="text"
                  value={implementationTimeline}
                  onChange={(e) => setImplementationTimeline(e.target.value)}
                  className="w-full sm:w-1/2 px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
            </div>

            {/* Razorpay Online Settlement Configuration Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                    ₹
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Razorpay Online Payment & Instant UPI Checkout
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Generate automated payment link and dynamic UPI QR code for immediate invoice clearance.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableRazorpay}
                    onChange={(e) => setEnableRazorpay(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {enableRazorpay && (
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-blue-900 block">Gateway Configuration</span>
                      <span className="text-[11px] text-blue-700">Test API Key: <code className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">rzp_test_TqReUSPk2WMRmD</code></span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Instant QR & Payment Link Ready
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-blue-200/60">
                    <div>• Client can pay via <strong>UPI (GPay, PhonePe, Paytm, BHIM)</strong> by scanning QR code directly from proposal document.</div>
                    <div>• Supports NetBanking (50+ Indian banks), Debit/Credit Cards, and Corporate Credit Cards.</div>
                    <div>• Automatic transition to <strong>ACCEPTED</strong> state upon successful transaction signature.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Discount & Governance Limits */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Discount Governance & Approval Tier</h4>

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border">
                  <span className="text-slate-500 block text-[10px] font-semibold uppercase">Standard Term Discount</span>
                  <span className="text-lg font-bold text-slate-800">10%</span>
                  <span className="text-[10px] text-slate-400 block">Annual contract commitment</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-300">
                  <span className="text-slate-500 block text-[10px] font-semibold uppercase">Negotiated Enterprise Discount</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={negotiatedDiscountPct}
                      onChange={(e) => setNegotiatedDiscountPct(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 rounded border border-slate-300 font-bold text-base text-slate-900"
                    />
                    <span className="font-bold text-slate-700">%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-800 block text-[10px] font-semibold uppercase">Total Combined Discount</span>
                  <span className="text-lg font-black text-emerald-700">{10 + negotiatedDiscountPct}%</span>
                  <span className="text-[10px] text-emerald-800 block">Effective savings on contract</span>
                </div>
              </div>

              {/* Approval Tier Notice */}
              {negotiatedDiscountPct > 10 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <strong>Approval Required: Discount Exceeds Sales Discretion</strong>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Negotiated discount of {negotiatedDiscountPct}% exceeds standard 10% limit. Requires Commercial Head sign-off before contract issue.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 font-bold text-[11px] shrink-0">
                    Tier: Commercial Head
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Within Sales Lead delegation authority. Self-approved without escalation.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 7: REVIEW & GENERATE PROPOSAL ──────────────────────────────── */}
        {currentStep === 7 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-xl font-bold text-slate-900">Review & Generate Formal Proposal</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect the configured HRMS solution and commercial proposal before saving or publishing.
              </p>
            </div>

            {/* Proposal Overview Banner */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-4">
                  {(clientLogoUrl || selectedClient?.logoUrl) ? (
                    <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                      <img
                        src={clientLogoUrl || selectedClient?.logoUrl}
                        alt={companyName || selectedClient?.legalName}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-xl flex items-center justify-center shrink-0">
                      {(companyName || selectedClient?.legalName || 'CO').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">CLIENT ORGANIZATION</span>
                    <h4 className="text-xl font-bold text-slate-900">{companyName || selectedClient?.legalName}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{employeeCount} Employees</span>
                      <span>•</span>
                      <span>{locationsCount} Operating Locations</span>
                      <span>•</span>
                      <span>{companiesCount} Companies</span>
                      <span>•</span>
                      <span className="font-mono">GSTIN: {selectedClient?.gstin || 'Pending Verification'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">COMMERCIAL TIER</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm block mt-1">
                    {selectedPlanCode} PLAN
                  </span>
                </div>
              </div>

              {/* Solution Modules Included */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Confirmed Solution Modules</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {Object.keys(requirements).filter((k) => requirements[k]).map((reqKey) => (
                    <div key={reqKey} className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 border text-slate-800 font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="capitalize">{reqKey.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commercial Summary Table */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Recurring SaaS Subtotal ({billingCycle}):</span>
                  <strong className="text-slate-900">₹{calculatedPricing.recurringAnnualPreTax.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>One-Time Implementation & Migration Services:</span>
                  <strong className="text-slate-900">₹{calculatedPricing.oneTimeTotal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-sm">
                  <span>Taxable Value (SAC 998313):</span>
                  <span>₹{calculatedPricing.taxableSubtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Statutory GST (18%):</span>
                  <span>+₹{calculatedPricing.gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-3 text-base font-black text-slate-900 bg-white p-3 rounded-lg border">
                  <span>Total First-Year Contract Value (TCV):</span>
                  <span className="text-emerald-700">₹{calculatedPricing.totalContractValue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Proposal Validity & Expiration Notice */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-slate-600 font-medium">
                    Proposal Validity: <strong className="text-slate-900">{validityDays} Days</strong> (Expires on <strong className="text-emerald-800 font-mono">{validUntilDate}</strong>)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border">
                  SaaS rates guaranteed through expiry date
                </span>
              </div>

              {/* Razorpay Online Settlement Preview */}
              {enableRazorpay && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-blue-700" />
                      <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">
                        Razorpay Instant Settlement Enabled
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                      Standard Gateway (Test Active)
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-blue-100">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Hosted Client Checkout URL</span>
                      <code className="text-[11px] text-blue-800 font-mono break-all font-semibold">
                        {razorpayOrderService.generatePaymentLink(`QT-PREVIEW`, calculatedPricing.totalContractValue)}
                      </code>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = razorpayOrderService.generatePaymentLink(`QT-PREVIEW`, calculatedPricing.totalContractValue);
                          navigator.clipboard.writeText(link);
                          alert('Payment link copied to clipboard!');
                        }}
                        className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Link
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          razorpayOrderService.openCheckout({
                            quoteNumber: 'QT-2026-TEST',
                            amount: calculatedPricing.totalContractValue,
                            clientName: companyName || 'Client Organization',
                            clientEmail: contactEmail || 'billing@client.com',
                            clientPhone: contactPhone || '9876543210',
                            onSuccess: (paymentId) => {
                              alert(`Test Payment Successful! Payment ID: ${paymentId}`);
                            },
                          });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                      >
                        Test Checkout →
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Generation Actions */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Save as Draft Quotation
                  </Button>

                  {negotiatedDiscountPct > 10 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendForApproval}
                      className="border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold"
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Send for Internal Approval
                    </Button>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={handleGenerateProposal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  <span>Generate Formal Proposal (PDF / Print View) →</span>
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Bottom Stepper Action Bar (Active only when origin is selected) ──── */}
      {originType && (
        <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="text-xs font-semibold flex items-center gap-1.5 text-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Previous Step</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOriginType(null)}
                className="text-xs border-slate-300 text-slate-600"
              >
                ← Back to Origin Selection
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Step {currentStep} of 7: {stepsList[currentStep - 1]?.label}
            </span>

            {currentStep < 7 ? (
              <Button
                size="sm"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <span>Continue to {stepsList[currentStep]?.label}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleGenerateProposal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <FileText className="h-4 w-4" />
                <span>Generate Commercial Proposal (PDF / Print View) →</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── CRM Lead / Opportunity Inspection Drawer ─────────────────────────── */}
      {activeDrawer && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CRM Entity Record</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {activeDrawer === 'OPPORTUNITY' ? 'Sales Opportunity Details' : 'Origin Lead Profile'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            {activeDrawer === 'OPPORTUNITY' && selectedOpp && (
              <div className="mt-4 space-y-4 text-xs">
                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-400 font-bold">{selectedOpp.opportunityNumber}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {selectedOpp.stage}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{selectedOpp.dealName}</h4>
                  <div className="text-[11px] text-slate-300">{selectedOpp.companyName}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Estimated ARR</span>
                    <span className="font-bold text-slate-900 text-sm">₹{selectedOpp.estimatedArr?.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Win Probability</span>
                    <span className="font-bold text-blue-600 text-sm">{selectedOpp.probability}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Expected Close</span>
                    <span className="font-bold text-slate-900">{selectedOpp.expectedCloseDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sales Owner</span>
                    <span className="font-bold text-slate-900">{selectedOpp.salesOwner}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-slate-500 font-semibold block text-[11px]">Primary Contact</span>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900">{selectedOpp.contactPerson} ({selectedOpp.designation})</div>
                    <div className="text-slate-600">{selectedOpp.email}</div>
                    <div className="text-slate-600">{selectedOpp.phone}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-slate-500 font-semibold block text-[11px]">Imported Requirements</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOpp.capturedRequirements.map((req) => (
                      <span key={req} className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-medium text-[11px] border border-emerald-200">
                        ✓ {req.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDrawer === 'LEAD' && (selectedOppLead || leads[0]) && (
              <div className="mt-4 space-y-4 text-xs">
                {(() => {
                  const lead = selectedOppLead || leads[0];
                  return (
                    <>
                      <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-blue-300 font-bold">{lead.leadNumber}</span>
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                            Stage: {lead.stage}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-sm">{lead.companyName}</h4>
                        <div className="text-[11px] text-slate-300">Industry: {lead.industry} | {lead.estimatedEmployees} Employees</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Lead Source</span>
                          <span className="font-bold text-slate-900">{lead.source}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Owner</span>
                          <span className="font-bold text-slate-900">{lead.salesOwner}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Estimated Employees</span>
                          <span className="font-bold text-emerald-700">{lead.estimatedEmployees}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Location Count</span>
                          <span className="font-bold text-slate-900">{lead.locationsCount || 1}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-slate-500 font-semibold block text-[11px]">Contact Information</span>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                          <div className="font-bold text-slate-900">{lead.contactPerson} ({lead.designation})</div>
                          <div className="text-slate-600">{lead.email}</div>
                          <div className="text-slate-600">{lead.phone}</div>
                          {lead.website && <div className="text-blue-600 underline">{lead.website}</div>}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="mt-auto pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDrawer(null)}
                className="w-full text-xs"
              >
                Close CRM Record
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
