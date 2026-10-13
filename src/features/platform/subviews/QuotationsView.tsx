// src/features/platform/subviews/QuotationsView.tsx
// ============================================================================
// Joy PeopleHR — SaaS Quotations & Enterprise Proposal Maker Console
// Single Source of Truth linking Pricing Engine -> Quotation -> Subscription
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Download,
  Share2,
  Copy,
  Building2,
  Users,
  Eye,
  Edit2,
  X,
  Layers,
  DollarSign,
  ShieldCheck,
  Check,
  Briefcase,
  ChevronRight,
  Calendar,
  Send,
  Zap,
  Printer,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import {
  CommercialQuotation,
  CommercialClient,
  QuotationStatus,
  OneTimeServiceItem,
} from '../../../types/saasCommercial';
import { PlanTierCode, BillingCycle } from '../../../types/saasCatalogue';
import {
  saasCommercialService,
  DEFAULT_ONE_TIME_SERVICES,
  SUPPLIER_COMPANY_DETAILS,
} from '../../../services/platform/saasCommercialService';
import { saasPricingEngine } from '../../../services/platform/saasPricingEngine';
import { saasCatalogueService } from '../../../services/platform/saasCatalogueService';
import { SaaSQuotationBuilderWorkspace } from '../components/quotations/SaaSQuotationBuilderWorkspace';
import { SaaSProposalDocumentModal } from '../components/quotations/SaaSProposalDocumentModal';
import { EditSupplierCompanyModal } from '../components/quotations/EditSupplierCompanyModal';

interface QuotationsViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({ onNavigateTab }) => {
  const [quotations, setQuotations] = useState<CommercialQuotation[]>(() =>
    saasCommercialService.getQuotations()
  );
  const [clients, setClients] = useState<CommercialClient[]>(() =>
    saasCommercialService.getClients()
  );
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [supplier, setSupplier] = useState(() => saasCommercialService.getSupplierDetails());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');

  // Preview Drawer & Full 8-Page Document Modal
  const [previewQuote, setPreviewQuote] = useState<CommercialQuotation | null>(null);
  const [selectedDocumentQuote, setSelectedDocumentQuote] = useState<CommercialQuotation | null>(null);

  // Create Quotation Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Wizard Form Fields
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [formPlanCode, setFormPlanCode] = useState<PlanTierCode>('PROFESSIONAL');
  const [formBillingCycle, setFormBillingCycle] = useState<BillingCycle>('Annual');
  const [formEmployeeCount, setFormEmployeeCount] = useState<number>(350);
  const [formSelectedAddons, setFormSelectedAddons] = useState<string[]>([
    'recruitment_suite',
    'performance_management',
  ]);
  const [formOneTimeServices, setFormOneTimeServices] = useState<OneTimeServiceItem[]>(
    DEFAULT_ONE_TIME_SERVICES
  );
  const [formNegotiatedDiscount, setFormNegotiatedDiscount] = useState<number>(5);
  const [formSalesOwner, setFormSalesOwner] = useState('Arun K (Commercial Lead)');
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);

  const allPlans = useMemo(() => saasPricingEngine.getPlans(), []);
  const allAddons = useMemo(() => saasCatalogueService.getAddons(), []);

  // Compute Live Quotation Totals inside wizard
  const calculatedQuote = useMemo(() => {
    const quoteResult = saasPricingEngine.calculateQuote({
      planCode: formPlanCode,
      employeeCount: formEmployeeCount,
      billingCycle: formBillingCycle,
      selectedAddonKeys: formSelectedAddons,
      customDiscountPercent: formBillingCycle === 'Annual' ? 10 + formNegotiatedDiscount : formNegotiatedDiscount,
    });

    const oneTimeTotal = formOneTimeServices
      .filter((s) => s.selected)
      .reduce((sum, s) => sum + s.rate, 0);

    const recurringPreTax = quoteResult.netPreTaxAmount;
    const taxableSubtotal = recurringPreTax + oneTimeTotal;
    const gstAmount = Math.round(taxableSubtotal * 0.18);
    const totalFirstYear = taxableSubtotal + gstAmount;

    return {
      quoteResult,
      oneTimeTotal,
      taxableSubtotal,
      gstAmount,
      totalFirstYear,
    };
  }, [formPlanCode, formEmployeeCount, formBillingCycle, formSelectedAddons, formOneTimeServices, formNegotiatedDiscount]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
      if (planFilter !== 'ALL' && q.planCode !== planFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.quotationNumber.toLowerCase().includes(query) ||
          q.clientName.toLowerCase().includes(query) ||
          q.salesOwner.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [quotations, statusFilter, planFilter, searchQuery]);

  const handleCreateQuotation = () => {
    const client = clients.find((c) => c.id === selectedClientId) || clients[0];
    const plan = allPlans.find((p) => p.code === formPlanCode) || allPlans[1];

    const newQuote: CommercialQuotation = {
      id: `qt-${Date.now()}`,
      quotationNumber: `QT-2026-00${quotations.length + 125}`,
      version: 1,
      originType: 'EXISTING_CUSTOMER',
      purpose: 'NEW_SUBSCRIPTION',
      clientId: client.id,
      clientName: client.legalName,
      clientGstin: client.gstin,
      clientEmail: client.email,
      clientState: client.billingAddress.state,
      salesOwner: formSalesOwner,
      planCode: formPlanCode,
      planName: plan.name,
      billingCycle: formBillingCycle,
      employeeCount: formEmployeeCount,
      includedEmployees: plan.includedEmployees,
      additionalEmployeesCount: Math.max(0, formEmployeeCount - plan.includedEmployees),
      pepmRate: calculatedQuote.quoteResult.appliedPepmRate,
      selectedAddonKeys: formSelectedAddons,
      requirements: {
        employees: formEmployeeCount,
        companies: 2,
        locations: 8,
        modulesRequested: plan.includedModules,
        ssoRequired: formSelectedAddons.includes('sso_saml_auth'),
        apiTier: 'Standard',
      },
      lineItems: [],
      oneTimeServices: formOneTimeServices.filter((s) => s.selected),
      pricingSnapshot: {
        pricingVersionId: 'pv-2026-q4',
        basePlanMonthly: calculatedQuote.quoteResult.baseMonthlyPrice,
        overageMonthly: calculatedQuote.quoteResult.employeeOverageMonthly,
        addonsMonthly: calculatedQuote.quoteResult.addonsMonthlyTotal,
        grossMonthlyRunRate: calculatedQuote.quoteResult.grossMonthlyTotal,
        cycleMultiplier: calculatedQuote.quoteResult.cycleMultiplier,
        termDiscountPercent: formBillingCycle === 'Annual' ? 10 : 0,
        negotiatedDiscountPercent: formNegotiatedDiscount,
        totalDiscountPercent: calculatedQuote.quoteResult.cycleDiscountPercent,
        discountAmount: calculatedQuote.quoteResult.cycleDiscountAmount,
        recurringPreTax: calculatedQuote.quoteResult.netPreTaxAmount,
        oneTimePreTax: calculatedQuote.oneTimeTotal,
        taxableSubtotal: calculatedQuote.taxableSubtotal,
        gstRatePercent: 18,
        gstAmount: calculatedQuote.gstAmount,
        totalFirstYearValue: calculatedQuote.totalFirstYear,
      },
      approval: {
        required: formNegotiatedDiscount > 10,
        tier: formNegotiatedDiscount > 20 ? 'Commercial Head' : formNegotiatedDiscount > 10 ? 'Sales Manager' : 'Sales',
        approvedBy: formNegotiatedDiscount <= 10 ? 'Auto-Approved (Sales Policy)' : undefined,
        approvedAt: formNegotiatedDiscount <= 10 ? new Date().toISOString() : undefined,
      },
      status: formNegotiatedDiscount <= 10 ? 'SENT' : 'INTERNAL_REVIEW',
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      versions: [
        {
          versionNumber: 1,
          createdAt: new Date().toISOString().slice(0, 10),
          createdBy: formSalesOwner,
          grossAnnualValue: calculatedQuote.quoteResult.grossMonthlyTotal * 12,
          discountPercentage: calculatedQuote.quoteResult.cycleDiscountPercent,
          discountAmount: calculatedQuote.quoteResult.cycleDiscountAmount,
          netAnnualValue: calculatedQuote.quoteResult.netPreTaxAmount,
          oneTimeServicesTotal: calculatedQuote.oneTimeTotal,
          gstAmount: calculatedQuote.gstAmount,
          totalContractValue: calculatedQuote.totalFirstYear,
          status: formNegotiatedDiscount <= 10 ? 'SENT' : 'INTERNAL_REVIEW',
        },
      ],
    };

    saasCommercialService.saveQuotation(newQuote);
    setQuotations([...saasCommercialService.getQuotations()]);
    setIsWizardOpen(false);
    setPreviewQuote(newQuote);
  };

  // Client Conversion Wizard State
  const [convertingQuote, setConvertingQuote] = useState<CommercialQuotation | null>(null);
  const [conversionLegalName, setConversionLegalName] = useState('');
  const [conversionTradeName, setConversionTradeName] = useState('');
  const [conversionGstin, setConversionGstin] = useState('');
  const [conversionPan, setConversionPan] = useState('');
  const [conversionCin, setConversionCin] = useState('');
  const [conversionAdminName, setConversionAdminName] = useState('');
  const [conversionAdminEmail, setConversionAdminEmail] = useState('');
  const [conversionAdminPhone, setConversionAdminPhone] = useState('');
  const [conversionAddressLine1, setConversionAddressLine1] = useState('Level 4, Industrial Tech Park');
  const [conversionCity, setConversionCity] = useState('Chennai');
  const [conversionState, setConversionState] = useState('Tamil Nadu');
  const [conversionPinCode, setConversionPinCode] = useState('600096');
  const [isSubmittingConversion, setIsSubmittingConversion] = useState(false);
  const [conversionSuccessResult, setConversionSuccessResult] = useState<{
    clientCode: string;
    orgId: string;
    subscriptionId: string;
    invoiceNumber: string;
  } | null>(null);

  const openConversionModal = (quote: CommercialQuotation) => {
    setConvertingQuote(quote);
    setConversionLegalName(quote.clientName);
    setConversionTradeName(quote.clientName);
    const gstinVal = quote.clientGstin && quote.clientGstin !== 'Pending Verification' ? quote.clientGstin : '33AABCA4589E1Z2';
    setConversionGstin(gstinVal);
    setConversionPan(gstinVal.length >= 12 ? gstinVal.slice(2, 12) : 'AABCA4589E');
    setConversionCin('U72200TN2026PTC154231');
    setConversionAdminName('Rajesh Kumar');
    setConversionAdminEmail(quote.clientEmail || 'admin@customer.com');
    setConversionAdminPhone(quote.clientPhone || '+91 98401 23456');
    setConversionState(quote.clientState || 'Tamil Nadu');
    setConversionSuccessResult(null);
  };

  const handleExecuteConversion = async () => {
    if (!convertingQuote) return;
    setIsSubmittingConversion(true);
    try {
      const res = await saasCommercialService.convertAcceptedQuotationToClient(convertingQuote.id, {
        legalName: conversionLegalName,
        tradeName: conversionTradeName,
        gstin: conversionGstin,
        pan: conversionPan,
        cin: conversionCin,
        adminName: conversionAdminName,
        adminEmail: conversionAdminEmail,
        adminPhone: conversionAdminPhone,
        billingAddress: {
          line1: conversionAddressLine1,
          city: conversionCity,
          state: conversionState,
          country: 'India',
          pinCode: conversionPinCode,
        },
      });

      setQuotations([...saasCommercialService.getQuotations()]);
      if (previewQuote && previewQuote.id === convertingQuote.id) {
        setPreviewQuote({ ...previewQuote, status: 'CONVERTED' });
      }

      setConversionSuccessResult({
        clientCode: res.client.clientCode,
        orgId: res.organizationId,
        subscriptionId: res.subscriptionId,
        invoiceNumber: res.invoice.invoiceNumber,
      });
    } catch (e: any) {
      alert(`Conversion error: ${e.message}`);
    } finally {
      setIsSubmittingConversion(false);
    }
  };

  const handleConvertToSubscription = async (quoteId: string) => {
    const q = quotations.find((quote) => quote.id === quoteId);
    if (q) {
      openConversionModal(q);
    }
  };

  const handleSendWhatsAppQuote = (q: CommercialQuotation) => {
    const text = `*JOY PEOPLEHR — COMMERCIAL PROPOSAL & QUOTATION*
--------------------------------------------
📄 *Quotation No:* ${q.quotationNumber} (v${q.version})
🏢 *Client:* ${q.clientName}
👥 *Workforce:* ${q.employeeCount} seats (${q.planName} Plan, ${q.billingCycle})
💰 *Contract Value:* ₹${q.pricingSnapshot.totalFirstYearValue.toLocaleString('en-IN')} (incl. GST & Services)
📅 *Valid Until:* ${q.validUntil}
👤 *Account Lead:* ${q.salesOwner}

Dear ${q.clientName},
Thank you for your interest in ${supplier.tradeName} Workforce Cloud. We are pleased to submit our comprehensive HRMS SaaS proposal.

To review the full commercial schedule, solution architecture, and digitally sign:
🔗 https://joypeoplehr.com/proposals/${q.quotationNumber.toLowerCase()}

${supplier.legalName} | ${supplier.email}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendEmailQuote = (q: CommercialQuotation) => {
    const subject = `Commercial Proposal & HRMS Quotation [${q.quotationNumber}] - ${supplier.tradeName}`;
    const body = `Dear ${q.clientName} Team,

We are pleased to present our official commercial quotation for ${supplier.tradeName} Enterprise Workforce Cloud.

QUOTATION SUMMARY:
--------------------------------------------
Quotation Number: ${q.quotationNumber} (v${q.version})
Plan & Billing: ${q.planName} Plan (${q.billingCycle} Prepayment)
Workforce Scale: ${q.employeeCount} Seats
Recurring Net Value: ₹${q.pricingSnapshot.recurringPreTax.toLocaleString('en-IN')}
One-Time Implementation: ₹${q.pricingSnapshot.oneTimePreTax.toLocaleString('en-IN')}
Statutory GST (18%): ₹${q.pricingSnapshot.gstAmount.toLocaleString('en-IN')}
Grand Total First Year: ₹${q.pricingSnapshot.totalFirstYearValue.toLocaleString('en-IN')}
Quotation Validity: Until ${q.validUntil}

The complete 8-page proposal detailing solution architecture, SLA guarantees, data residency (India ap-south-1), and digital acceptance terms is available for your review.

Please reply to this email or contact your commercial lead ${q.salesOwner} if you have any questions or require custom terms.

Warm regards,
${supplier.signatoryName || 'Commercial Sales Desk'}
${supplier.legalName}
${supplier.address}
${supplier.email} | ${supplier.phone}`;

    window.location.href = `mailto:${q.clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const renderStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 text-slate-700">Draft</span>;
      case 'INTERNAL_REVIEW':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">In Review</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Approved</span>;
      case 'SENT':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Sent to Client</span>;
      case 'ACCEPTED':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">Accepted ✓</span>;
      case 'CONVERTED':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-purple-50 text-purple-800 border border-purple-300 font-bold">Converted to Sub</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  // Dynamic Live KPIs calculated strictly from actual stored quotations
  const dynamicKpis = useMemo(() => {
    const totalCount = quotations.length;
    let openPipeline = 0;
    let openCount = 0;
    let acceptedValue = 0;
    let acceptedCount = 0;
    let expiringSoonCount = 0;

    const tenDaysLater = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);

    for (const q of quotations) {
      const val = q.pricingSnapshot?.totalFirstYearValue || 0;
      if (['DRAFT', 'INTERNAL_REVIEW', 'SENT', 'APPROVED'].includes(q.status)) {
        openPipeline += val;
        openCount++;
      }
      if (['ACCEPTED', 'CONVERTED'].includes(q.status)) {
        acceptedValue += val;
        acceptedCount++;
      }
      if (['DRAFT', 'SENT', 'INTERNAL_REVIEW', 'APPROVED'].includes(q.status) && q.validUntil) {
        if (q.validUntil <= tenDaysLater) {
          expiringSoonCount++;
        }
      }
    }

    const conversionRate = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;

    const formatLakhs = (amt: number) => {
      if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)}Cr`;
      if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
      return `₹${amt.toLocaleString('en-IN')}`;
    };

    return {
      openPipelineFormatted: formatLakhs(openPipeline),
      openCount,
      acceptedValueFormatted: formatLakhs(acceptedValue),
      acceptedCount,
      conversionRate,
      expiringSoonCount,
      totalCount,
    };
  }, [quotations]);

  return (
    <div className="space-y-6 pb-20 font-sans pt-1">
      {/* ── 1. Top Header & Metrics ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">SaaS Commercial Quotations & Proposals</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Direct Pricing Engine Sync
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Create authoritative enterprise quotes from master catalogue rates. Generates immutable snapshots ensuring billing cannot drift from approved sales proposals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditCompanyOpen(true)}
            className="flex items-center gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 font-semibold"
            title="Customize SaaS Brand, Legal Entity, GSTIN, Address & Bank Details"
          >
            <Building2 className="h-4 w-4 text-emerald-700" />
            Company & GST Setup
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateTab) onNavigateTab('platform-pricing-calculator');
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-slate-50"
          >
            <DollarSign className="h-4 w-4 text-[#64748B]" />
            Pricing Calculator
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setWizardStep(1);
              setIsWizardOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#0F172B] text-white hover:bg-slate-800 border-none shadow-xs"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            + Create Quotation
          </Button>
        </div>
      </div>

      {/* ── 2. Dynamic KPI Metrics Bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Pipeline</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{dynamicKpis.openPipelineFormatted}</div>
          <p className="text-[11.5px] text-blue-600 font-medium mt-1">
            {dynamicKpis.openCount} Active Proposal{dynamicKpis.openCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accepted Value</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{dynamicKpis.acceptedValueFormatted}</div>
          <p className="text-[11.5px] text-emerald-700 font-medium mt-1">
            {dynamicKpis.acceptedCount} Ready for Invoicing
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversion Ratio</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{dynamicKpis.conversionRate}%</div>
          <p className="text-[11.5px] text-slate-500 mt-1">Proposal to Acceptance</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiring Soon</span>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {dynamicKpis.expiringSoonCount} Quote{dynamicKpis.expiringSoonCount === 1 ? '' : 's'}
          </div>
          <p className="text-[11.5px] text-amber-700 font-medium mt-1">Within next 10 days</p>
        </div>
      </div>

      {/* ── 3. Search & Filter Bar ──────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotation number, client name, or sales owner..."
            className="w-full pl-10 pr-4 py-2 text-[13.5px] rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="INTERNAL_REVIEW">In Review</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="CONVERTED">Converted</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Plans</option>
            <option value="STARTER">Starter</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="BUSINESS">Business</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
      </div>

      {/* ── 4. Quotation Table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10.5px] border-b border-slate-200">
                <th className="py-3 px-4 whitespace-nowrap">Quotation No</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 whitespace-nowrap">Plan & Term</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Workforce</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Contract Value</th>
                <th className="py-3 px-4 whitespace-nowrap">Valid Until</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Owner</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No matching quotations found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Try clearing your search query or status filter, or create a new quotation using the button above.
                    </p>
                    {(searchQuery || statusFilter !== 'ALL' || planFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('ALL');
                          setPlanFilter('ALL');
                        }}
                        className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {q.quotationNumber}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">v{q.version}</span>
                    </td>

                    <td className="py-3.5 px-4 min-w-[200px]">
                      <div className="font-bold text-slate-900 text-xs truncate max-w-[220px]" title={q.clientName}>
                        {q.clientName}
                      </div>
                      <div className="text-[10.5px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">{q.clientGstin}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{q.planName}</div>
                      <div className="text-[11px] text-emerald-700 font-medium">{q.billingCycle} Contract</div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 whitespace-nowrap">
                      {q.employeeCount} seats
                      <div className="text-[10.5px] text-slate-500 font-normal">₹{q.pepmRate} PEPM</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                      ₹{q.pricingSnapshot.totalFirstYearValue.toLocaleString('en-IN')}
                      <div className="text-[10.5px] text-slate-500 font-normal">Incl. GST & Onboarding</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap font-mono text-[11.5px]">
                      {q.validUntil}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {renderStatusBadge(q.status)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {q.salesOwner}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedDocumentQuote(q)}
                        className="text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded inline-flex items-center gap-1"
                        title="Open 8-Page Formal Proposal Document (PDF / Print)"
                      >
                        <FileText className="h-3 w-3" />
                        Formal PDF
                      </button>

                      <button
                        onClick={() => handleSendWhatsAppQuote(q)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded inline-flex items-center gap-1 border border-emerald-200"
                        title="Share Proposal on WhatsApp"
                      >
                        <MessageSquare className="h-3 w-3 text-emerald-600" />
                        WhatsApp
                      </button>

                      <button
                        onClick={() => handleSendEmailQuote(q)}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded inline-flex items-center gap-1 border border-blue-200"
                        title="Email Proposal to Client"
                      >
                        <Mail className="h-3 w-3 text-blue-600" />
                        Email
                      </button>

                      <button
                        onClick={() => setPreviewQuote(q)}
                        className="text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded inline-flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Review
                      </button>

                      {q.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleConvertToSubscription(q.id)}
                          className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded shadow-xs inline-flex items-center gap-1"
                        >
                          <Zap className="h-3 w-3" />
                          Convert to Sub
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Enterprise Proposal View Drawer ───────────────────────────────── */}
      {previewQuote && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200 text-slate-800">
            {/* Proposal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">
                  Enterprise Proposal & Quotation
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {previewQuote.quotationNumber} (v{previewQuote.version})
                </h3>
              </div>
              <button
                onClick={() => setPreviewQuote(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            {/* Proposal Body */}
            <div className="mt-5 space-y-5 text-xs">
              {/* Supplier & Client Cards */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500">From / Solution Provider</span>
                    <button
                      type="button"
                      onClick={() => setIsEditCompanyOpen(true)}
                      className="text-[10px] text-emerald-700 hover:underline font-semibold"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="font-bold text-slate-900 mt-1">{supplier.legalName}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{supplier.address}</div>
                  <div className="text-[11px] font-mono text-emerald-800 mt-1">GSTIN: {supplier.gstin}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">To / Client</span>
                  <div className="font-bold text-slate-900 mt-1">{previewQuote.clientName}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{previewQuote.clientEmail}</div>
                  <div className="text-[11px] font-mono text-blue-800 mt-1">GSTIN: {previewQuote.clientGstin}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Place of Supply: {previewQuote.clientState}</div>
                </div>
              </div>

              {/* Solution Scope Overview */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">Recommended SaaS Solution Scope</h4>
                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 space-y-1.5 text-[11.5px]">
                  <div className="flex justify-between">
                    <span>Base Tier:</span>
                    <strong className="text-slate-900">{previewQuote.planName} Plan ({previewQuote.billingCycle})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Workforce Scale:</span>
                    <strong className="text-slate-900">{previewQuote.employeeCount} Employees ({previewQuote.includedEmployees} Included + {previewQuote.additionalEmployeesCount} Additional)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Configured Add-ons:</span>
                    <strong className="text-slate-900">{previewQuote.selectedAddonKeys.join(', ') || 'None'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Valid Until:</span>
                    <strong className="text-slate-900">{previewQuote.validUntil}</strong>
                  </div>
                </div>
              </div>

              {/* Commercial Breakdown Table */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">Commercial Itemization</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center">Unit Rate</th>
                        <th className="p-2.5 text-center">Period</th>
                        <th className="p-2.5 text-right">Annual Gross</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2.5 font-medium">{previewQuote.planName} Plan Base Subscription</td>
                        <td className="p-2.5 text-center">₹{previewQuote.pricingSnapshot.basePlanMonthly}/mo</td>
                        <td className="p-2.5 text-center">12 mos</td>
                        <td className="p-2.5 text-right font-semibold">₹{(previewQuote.pricingSnapshot.basePlanMonthly * 12).toLocaleString('en-IN')}</td>
                      </tr>
                      {previewQuote.additionalEmployeesCount > 0 && (
                        <tr>
                          <td className="p-2.5 font-medium">Workforce Seats ({previewQuote.additionalEmployeesCount} Additional @ ₹{previewQuote.pepmRate} PEPM)</td>
                          <td className="p-2.5 text-center">₹{previewQuote.pricingSnapshot.overageMonthly}/mo</td>
                          <td className="p-2.5 text-center">12 mos</td>
                          <td className="p-2.5 text-right font-semibold">₹{(previewQuote.pricingSnapshot.overageMonthly * 12).toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      {previewQuote.pricingSnapshot.addonsMonthly > 0 && (
                        <tr>
                          <td className="p-2.5 font-medium">Configured Modular Add-ons</td>
                          <td className="p-2.5 text-center">₹{previewQuote.pricingSnapshot.addonsMonthly}/mo</td>
                          <td className="p-2.5 text-center">12 mos</td>
                          <td className="p-2.5 text-right font-semibold">₹{(previewQuote.pricingSnapshot.addonsMonthly * 12).toLocaleString('en-IN')}</td>
                        </tr>
                      )}
                      {previewQuote.oneTimeServices.map((s) => (
                        <tr key={s.key} className="bg-slate-50/50">
                          <td className="p-2.5 font-medium text-slate-700">• [One-Time] {s.name}</td>
                          <td className="p-2.5 text-center">One-time</td>
                          <td className="p-2.5 text-center">—</td>
                          <td className="p-2.5 text-right font-semibold">₹{s.rate.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Recurring SaaS Subtotal (12 months):</span>
                  <span className="font-semibold text-slate-800">₹{(previewQuote.pricingSnapshot.grossMonthlyRunRate * 12).toLocaleString('en-IN')}</span>
                </div>

                {previewQuote.pricingSnapshot.totalDiscountPercent > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Combined Term & Enterprise Discount ({previewQuote.pricingSnapshot.totalDiscountPercent}%):</span>
                    <span>-₹{previewQuote.pricingSnapshot.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>One-Time Implementation & Migration Services:</span>
                  <span className="font-semibold text-slate-800">₹{previewQuote.pricingSnapshot.oneTimePreTax.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-sm">
                  <span>Net Taxable Value:</span>
                  <span>₹{previewQuote.pricingSnapshot.taxableSubtotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Statutory GST (18%):</span>
                  <span>+₹{previewQuote.pricingSnapshot.gstAmount.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-black text-slate-900 bg-white p-3 rounded-lg border">
                  <span>Grand Total Contract Value:</span>
                  <span className="text-emerald-700">₹{previewQuote.pricingSnapshot.totalFirstYearValue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Proposal Dispatch & PDF Toolbar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                  Proposal Dispatch & Export
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppQuote(previewQuote)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Send via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendEmailQuote(previewQuote)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Send via Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDocumentQuote(previewQuote)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-emerald-400" />
                    <span>Formal PDF / Print</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {previewQuote.status === 'SENT' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        saasCommercialService.updateQuotationStatus(previewQuote.id, 'ACCEPTED');
                        setQuotations([...saasCommercialService.getQuotations()]);
                        setPreviewQuote({ ...previewQuote, status: 'ACCEPTED' });
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Simulate Client Acceptance ✓
                    </Button>
                  )}

                  {previewQuote.status === 'ACCEPTED' && (
                    <Button
                      size="sm"
                      onClick={() => openConversionModal(previewQuote)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      Convert to Client & Subscription ›
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewQuote(null)}
                >
                  Close Proposal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. 7-Stage SaaS Quotation Builder Workspace ─────────────────────── */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-5xl w-full my-auto">
            <SaaSQuotationBuilderWorkspace
              clients={clients}
              onCancel={() => setIsWizardOpen(false)}
              onSaveQuote={(newQuote) => {
                setQuotations([...saasCommercialService.getQuotations()]);
                setIsWizardOpen(false);
                setPreviewQuote(newQuote);
              }}
              onOpenPreview={(newQuote) => {
                setQuotations([...saasCommercialService.getQuotations()]);
                setIsWizardOpen(false);
                setSelectedDocumentQuote(newQuote);
              }}
            />
          </div>
        </div>
      )}

      {/* ── 7. 8-Page Formal HRMS Commercial Proposal Document Modal ─────────── */}
      {selectedDocumentQuote && (
        <SaaSProposalDocumentModal
          quote={selectedDocumentQuote}
          isOpen={!!selectedDocumentQuote}
          onClose={() => setSelectedDocumentQuote(null)}
          onAcceptQuote={(quoteId) => {
            saasCommercialService.updateQuotationStatus(quoteId, 'ACCEPTED');
            const updated = saasCommercialService.getQuotations();
            setQuotations([...updated]);
            const found = updated.find((q) => q.id === quoteId);
            if (found) {
              setSelectedDocumentQuote({ ...found });
              if (previewQuote?.id === quoteId) setPreviewQuote({ ...found });
            }
          }}
          onConvertToSubscription={(quoteId) => {
            handleConvertToSubscription(quoteId);
            const updated = saasCommercialService.getQuotations();
            setQuotations([...updated]);
            const found = updated.find((q) => q.id === quoteId);
            if (found) {
              setSelectedDocumentQuote({ ...found });
              if (previewQuote?.id === quoteId) setPreviewQuote({ ...found });
            }
          }}
        />
      )}

      {/* ── 8. Client & Tenant Provisioning Conversion Wizard Modal ───────────── */}
      {convertingQuote && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Commercial Acceptance & Provisioning
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Convert Accepted Quotation to Client & Tenant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConvertingQuote(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Traceability Lineage Banner */}
            <div className="bg-slate-800 text-slate-300 px-6 py-2.5 text-xs flex flex-wrap items-center gap-2 border-b border-slate-700">
              <span className="font-semibold text-slate-400">Traceability:</span>
              <span className="px-2 py-0.5 rounded bg-slate-700 font-mono text-blue-300">
                Lead: {convertingQuote.leadNumber || 'Direct'}
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded bg-slate-700 font-mono text-emerald-300">
                Opp: {convertingQuote.opportunityNumber || 'Direct Deal'}
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded bg-slate-700 font-mono text-purple-300">
                Quote: {convertingQuote.quotationNumber}
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 font-bold">
                {convertingQuote.planName} Plan ({convertingQuote.employeeCount} Seats)
              </span>
            </div>

            <div className="p-6 overflow-y-auto max-h-[75vh]">
              {conversionSuccessResult ? (
                /* Success View */
                <div className="text-center space-y-4 py-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900">Commercial Conversion Complete!</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Client relationship created, tenant organization provisioned, and statutory tax invoice generated without duplicate records.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left max-w-lg mx-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Client Code</span>
                      <span className="font-bold text-slate-800 font-mono text-sm">{conversionSuccessResult.clientCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tenant Organization</span>
                      <span className="font-bold text-slate-800 font-mono text-sm">{conversionSuccessResult.orgId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Live Subscription</span>
                      <span className="font-bold text-emerald-700 font-mono text-sm">{conversionSuccessResult.subscriptionId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tax Invoice Generated</span>
                      <span className="font-bold text-purple-700 font-mono text-sm">{conversionSuccessResult.invoiceNumber}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        setConvertingQuote(null);
                        if (onNavigateTab) onNavigateTab('platform-invoices');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      View Generated Tax Invoice →
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConvertingQuote(null)}
                      className="text-xs"
                    >
                      Done & Close
                    </Button>
                  </div>
                </div>
              ) : (
                /* Verification & Conversion Form */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleExecuteConversion();
                  }}
                  className="space-y-4"
                >
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                    <strong>Pre-Conversion Verification:</strong> Confirm legal company identity and GSTIN details. This provisions the client record, assigns the organization tenant, binds entitlements, and generates the first tax invoice.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 block font-semibold mb-1">Company Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={conversionLegalName}
                        onChange={(e) => setConversionLegalName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block font-semibold mb-1">Trade / Brand Name</label>
                      <input
                        type="text"
                        value={conversionTradeName}
                        onChange={(e) => setConversionTradeName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block font-semibold mb-1">GSTIN (Verified Tax Identifier) *</label>
                      <input
                        type="text"
                        required
                        value={conversionGstin}
                        onChange={(e) => setConversionGstin(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-xs uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block font-semibold mb-1">Permanent Account Number (PAN) *</label>
                      <input
                        type="text"
                        required
                        value={conversionPan}
                        onChange={(e) => setConversionPan(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-xs uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block font-semibold mb-1">Primary Admin Name *</label>
                      <input
                        type="text"
                        required
                        value={conversionAdminName}
                        onChange={(e) => setConversionAdminName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block font-semibold mb-1">Primary Admin Email *</label>
                      <input
                        type="email"
                        required
                        value={conversionAdminEmail}
                        onChange={(e) => setConversionAdminEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-xs"
                      />
                    </div>
                  </div>

                  {/* Registered Billing Address */}
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700 block mb-2">Registered Billing Address</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="col-span-2">
                        <label className="text-slate-500 block text-[10.5px] font-semibold mb-1">Address Line</label>
                        <input
                          type="text"
                          value={conversionAddressLine1}
                          onChange={(e) => setConversionAddressLine1(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 block text-[10.5px] font-semibold mb-1">City</label>
                        <input
                          type="text"
                          value={conversionCity}
                          onChange={(e) => setConversionCity(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 block text-[10.5px] font-semibold mb-1">Pin Code</label>
                        <input
                          type="text"
                          value={conversionPinCode}
                          onChange={(e) => setConversionPinCode(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contract Snapshot Summary */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Accepted Solution</span>
                      <div className="font-bold text-slate-900 mt-0.5">
                        {convertingQuote.planName} Plan ({convertingQuote.employeeCount} Workforce Seats)
                      </div>
                      <div className="text-[11px] text-slate-500">Billing Cycle: {convertingQuote.billingCycle} Prepayment</div>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total First Year Value</span>
                      <div className="text-base font-black text-emerald-700 mt-0.5">
                        ₹{convertingQuote.pricingSnapshot.totalFirstYearValue.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-500">(Tax Invoice Generated Automatically)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConvertingQuote(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmittingConversion}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                    >
                      {isSubmittingConversion ? 'Provisioning Tenant...' : 'Confirm Conversion & Provision Tenant →'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Company / GST Credentials Modal */}
      <EditSupplierCompanyModal
        isOpen={isEditCompanyOpen}
        onClose={() => setIsEditCompanyOpen(false)}
        onSaved={(updated) => setSupplier(updated)}
      />
    </div>
  );
};
