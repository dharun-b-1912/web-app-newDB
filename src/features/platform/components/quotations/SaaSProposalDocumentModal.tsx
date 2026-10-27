// src/features/platform/components/quotations/SaaSProposalDocumentModal.tsx
// ============================================================================
// Joy PeopleHR — Enterprise HRMS SaaS Commercial Proposal & Quotation Document
// Authoritative 8-Page Executive Proposal Document with Printable Styles
// ============================================================================

import React, { useRef, useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Building2,
  Users,
  ShieldCheck,
  Check,
  Calendar,
  Layers,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  Globe,
  DollarSign,
  Briefcase,
  X,
  Clock,
  ArrowRight,
  MessageSquare,
  Settings,
  CreditCard,
  QrCode,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { CommercialQuotation } from '../../../../types/saasCommercial';
import { saasCommercialService } from '../../../../services/platform/saasCommercialService';
import { razorpayOrderService } from '../../../../services/platform/razorpayOrderService';
import { EditSupplierCompanyModal } from './EditSupplierCompanyModal';
import { api } from '../../../../services/api';

interface SaaSProposalDocumentModalProps {
  quote: CommercialQuotation;
  isOpen: boolean;
  onClose: () => void;
  onAcceptQuote?: (quoteId: string) => void;
  onConvertToSubscription?: (quoteId: string) => void;
}

export const SaaSProposalDocumentModal: React.FC<SaaSProposalDocumentModalProps> = ({
  quote,
  isOpen,
  onClose,
  onAcceptQuote,
  onConvertToSubscription,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [supplier, setSupplier] = useState(() => saasCommercialService.getSupplierDetails());

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const text = `*JOY PEOPLEHR — COMMERCIAL PROPOSAL & QUOTATION*
--------------------------------------------
📄 *Quotation No:* ${quote.quotationNumber} (v${quote.version})
🏢 *Client:* ${quote.clientName}
👥 *Workforce:* ${quote.employeeCount} seats (${quote.planName} Plan, ${quote.billingCycle})
💰 *Contract Value:* ₹${quote.pricingSnapshot.totalFirstYearValue.toLocaleString('en-IN')} (incl. GST & Onboarding)
📅 *Valid Until:* ${quote.validUntil}
👤 *Account Lead:* ${quote.salesOwner}

Dear ${quote.clientName},
Thank you for your interest in ${supplier.tradeName} Workforce Cloud. We are pleased to submit our comprehensive 8-page HRMS SaaS proposal.

To review the full commercial schedule, solution architecture, and digitally sign:
🔗 https://joypeoplehr.com/proposals/${quote.quotationNumber.toLowerCase()}

${supplier.legalName} | ${supplier.email}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendEmail = () => {
    const subject = `Commercial Proposal & HRMS Quotation [${quote.quotationNumber}] - ${supplier.tradeName}`;
    const body = `Dear ${quote.clientName} Team,

We are pleased to present our official commercial quotation for ${supplier.tradeName} Enterprise Workforce Cloud.

QUOTATION SUMMARY:
--------------------------------------------
Quotation Number: ${quote.quotationNumber} (v${quote.version})
Plan & Billing: ${quote.planName} Plan (${quote.billingCycle} Contract)
Workforce Scale: ${quote.employeeCount} Seats
Recurring Net Value: ₹${quote.pricingSnapshot.recurringPreTax.toLocaleString('en-IN')}
One-Time Implementation: ₹${quote.pricingSnapshot.oneTimePreTax.toLocaleString('en-IN')}
Statutory GST (18%): ₹${quote.pricingSnapshot.gstAmount.toLocaleString('en-IN')}
Grand Total First Year: ₹${quote.pricingSnapshot.totalFirstYearValue.toLocaleString('en-IN')}
Quotation Validity: Until ${quote.validUntil}

The complete 8-page proposal detailing solution architecture, SLA guarantees, data residency (India ap-south-1), and digital acceptance terms is available for your review.

Warm regards,
${supplier.signatoryName || 'Commercial Sales Desk'}
${supplier.legalName}
${supplier.address}
${supplier.email} | ${supplier.phone}`;

    window.location.href = `mailto:${quote.clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const req = quote.requirements || {
    employees: quote.employeeCount,
    companies: 2,
    locations: 12,
    modulesRequested: [],
    ssoRequired: false,
    apiTier: 'Standard',
  };

  const terms = quote.terms || {
    contractDurationMonths: 12,
    billingFrequency: quote.billingCycle,
    paymentTerms: 'Net 15 Days',
    subscriptionStartDate: quote.createdAt,
    renewalTerm: 'Annual Automatic Renewal',
    quotationValidityDays: 30,
    annualEscalationPct: 5,
    implementationTimelineWeeks: '4–6 Weeks',
  };

  const solutionConfig = quote.solutionConfig || {
    requirements: [
      'Core HR',
      'Employee Self Service',
      'Attendance',
      'Leave',
      'Payroll',
      'Biometric',
      'Recruitment',
      'Performance',
      'Expense',
      'Analytics',
      'Vendor Workforce',
      'Procurement',
      'Invoice & Settlement',
    ],
    biometricRequired: true,
    biometricDevicesCount: 5,
    biometricIntegration: 'ZKTeco / eSSL ADMS Push Gateway',
    payrollFrequency: 'Monthly',
    payrollStatutory: ['PF', 'ESI', 'PT', 'TDS'],
    analyticsTiers: ['Standard Analytics', 'Advanced Analytics'],
    vendorWorkforceRequired: true,
    vendorPortalRequired: false,
    procurementRequired: true,
    invoiceSettlementRequired: true,
    clientBillingRequired: false,
  };

  const snapshot = quote.pricingSnapshot;
  const isAccepted = quote.status === 'ACCEPTED' || quote.status === 'CONVERTED';

  return (
    <div className="proposal-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:block print:inset-auto">
      <div className="proposal-modal-card bg-slate-100 rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-300 flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:w-full print:block print:overflow-visible">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="bg-white px-6 py-3.5 rounded-t-2xl border-b border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{quote.quotationNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  quote.status === 'ACCEPTED' || quote.status === 'CONVERTED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : quote.status === 'SENT'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {quote.status}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">8-Page Formal HRMS SaaS Proposal</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{quote.clientName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditCompanyOpen(true)}
              className="text-xs font-semibold flex items-center gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100"
              title="Customize SaaS Brand Name, Legal Entity, GSTIN, Address & Bank Details"
            >
              <Building2 className="h-3.5 w-3.5 text-emerald-700" />
              <span>Company / GST</span>
            </Button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xs transition-colors cursor-pointer"
              title="Share Proposal via WhatsApp"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Send Proposal via Email"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </button>

            <Button
              size="sm"
              onClick={() => {
                razorpayOrderService.openCheckout({
                  quoteNumber: quote.quotationNumber,
                  amount: quote.pricingSnapshot.totalFirstYearValue,
                  clientName: quote.clientName,
                  clientEmail: quote.clientEmail || 'billing@client.com',
                  clientPhone: quote.clientPhone || '9876543210',
                  description: `Joy PeopleHR Proposal: ${quote.planName} (${quote.quotationNumber})`,
                  onSuccess: (paymentId) => {
                    alert(`Payment of ₹${quote.pricingSnapshot.totalFirstYearValue.toLocaleString('en-IN')} successfully settled! Payment ID: ${paymentId}`);
                    if (onAcceptQuote) onAcceptQuote(quote.id);
                  },
                });
              }}
              className="text-xs font-bold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Pay via Razorpay</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-semibold flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Download PDF</span>
            </Button>

            {!isAccepted && onAcceptQuote && (
              <Button
                size="sm"
                onClick={() => onAcceptQuote(quote.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Simulate Digital Acceptance ✓</span>
              </Button>
            )}

            {isAccepted && quote.status !== 'CONVERTED' && onConvertToSubscription && (
              <Button
                size="sm"
                onClick={() => onConvertToSubscription(quote.id)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Convert to Active Subscription ›</span>
              </Button>
            )}

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div ref={printRef} className="overflow-y-auto p-4 sm:p-8 space-y-8 bg-slate-200/70 print:bg-white print:p-0 print:space-y-0 print:overflow-visible">
          
          {/* ===================================================================
              PAGE 1 — EXECUTIVE COVER PAGE
              =================================================================== */}
          <div className="bg-white p-10 sm:p-14 rounded-xl shadow-md border border-slate-300 min-h-[1050px] flex flex-col justify-between print:min-h-screen print:shadow-none print:border-none print:rounded-none print:break-after-page">
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                    JP
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">{supplier.tradeName?.toUpperCase() || 'JOY PEOPLEHR'}</h1>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">{supplier.tagline || 'Enterprise Workforce Cloud'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono font-bold text-slate-400 block">COMMERCIAL PROPOSAL</span>
                  <span className="text-sm font-mono font-bold text-slate-900">{quote.quotationNumber}</span>
                </div>
              </div>

              {/* Main Proposal Title */}
              <div className="mt-16 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>SaaS Commercial Proposal & Solution Architecture</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  HR & Workforce Management Platform
                </h2>
                <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                  A unified digital platform for complete Employee Lifecycle, Real-time Attendance, Indian Statutory Payroll, Talent Suite, and Industrial Workforce Operations.
                </p>
              </div>

              {/* Prepared For Box */}
              <div className="mt-12 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase font-bold tracking-wider text-slate-400">Prepared Exclusively For</div>
                  {quote.clientLogoUrl && (
                    <div className="h-10 px-3 py-1 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-2xs">
                      <img src={quote.clientLogoUrl} alt={quote.clientName} className="h-8 max-w-[140px] object-contain" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{quote.clientName}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-emerald-600" />
                      <strong>{quote.employeeCount}</strong> Employees Covered
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      <strong>{req.locations}</strong> Operating Locations
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                      <strong>{req.companies}</strong> Legal Entities
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-500">GSTIN: {quote.clientGstin}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Primary Contact</span>
                    <span className="font-bold text-slate-800">Rajesh Kumar</span>
                    <span className="text-[11px] text-slate-500 block">HR Head</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Proposal Date</span>
                    <span className="font-bold text-slate-800">{quote.createdAt}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Valid Until</span>
                    <span className="font-bold text-slate-800">{quote.validUntil}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sales Lead</span>
                    <span className="font-bold text-slate-800">{quote.salesOwner}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Proposal Footer */}
            <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
              <div>
                <strong>{supplier.legalName}</strong>
                <p className="text-[10px] text-slate-400">{supplier.address}</p>
              </div>
              <div className="text-right text-[11px]">
                <span className="font-bold text-slate-700">Strictly Confidential</span>
                <p className="text-[10px] text-slate-400">Page 1 of 8</p>
              </div>
            </div>
          </div>


          {/* ===================================================================
              PAGE 2 — EXECUTIVE SOLUTION & CUSTOMER REQUIREMENT
              =================================================================== */}
          <div className="bg-white p-10 sm:p-14 rounded-xl shadow-md border border-slate-300 min-h-[1050px] flex flex-col justify-between print:min-h-screen print:shadow-none print:border-none print:rounded-none print:break-after-page">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Executive Summary & Scope</span>
                <span className="text-xs font-mono text-slate-400">{quote.quotationNumber}</span>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">PROPOSED SOLUTION ARCHITECTURE</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Joy PeopleHR provides an integrated SaaS platform engineered to replace fragmented spreadsheets, multiple point tools, and hardware silos with a secure, cloud-native operational backbone.
                  </p>
                </div>

                {/* 3 Core Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">01</div>
                    <h4 className="font-bold text-slate-900 text-sm">Core HR & Lifecycle</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Complete employee master data, multi-entity organization hierarchies, onboarding, self-service ESS, leave policies, and exit clearances.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">02</div>
                    <h4 className="font-bold text-slate-900 text-sm">Attendance & Indian Payroll</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Real-time biometric sync with eSSL/ZKTeco push gateways, geofenced mobile check-ins, rotational shifts, and automated 100% compliant Indian payroll (PF/ESI/PT/TDS).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">03</div>
                    <h4 className="font-bold text-slate-900 text-sm">Industrial Workforce Ops</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Contractor and vendor workforce tracking, procurement requisitions, purchase orders, vendor invoices, and automated 3-way match settlement.
                    </p>
                  </div>
                </div>

                {/* Customer Specific Requirements Mapping */}
                <div className="mt-8 space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    CUSTOMER OPERATIONAL REQUIREMENTS
                  </h4>
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold">Scope of Workforce</span>
                      <strong className="text-slate-900 text-sm">{quote.employeeCount} Total Employees</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold">Operating Units</span>
                      <strong className="text-slate-900 text-sm">{req.locations} Factory & Office Locations</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold">Corporate Structure</span>
                      <strong className="text-slate-900 text-sm">{req.companies} Legal Entities</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold">Payroll Cycle</span>
                      <strong className="text-slate-900 text-sm">{solutionConfig.payrollFrequency} Payroll Processing</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold">Biometric Capture</span>
                      <strong className="text-slate-900 text-sm">{solutionConfig.biometricDevicesCount} Devices ({solutionConfig.biometricIntegration})</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold">Contractor / Vendor Ops</span>
                      <strong className="text-emerald-700 text-sm">Vendor Workforce & 3-Way Match Included</strong>
                    </div>
                  </div>
                </div>

                {/* Scope Confirmation Checklist */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Confirmed Solution Scope</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {[
                      'Core HR Master & Lifecycle',
                      'Employee Self Service (ESS)',
                      'Rotational Shift & Attendance',
                      'Leave & Compensatory Offs',
                      'PF / ESI / PT / TDS Statutory Payroll',
                      'Direct Bank Disbursement File',
                      'Biometric Push Gateway (ADMS)',
                      'Recruitment & Candidate ATS',
                      'Performance Appraisals & KRAs',
                      'Expense Claims & Approvals',
                      'Workforce Analytics & Reporting',
                      'Vendor Workforce & 3-Way Match',
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-slate-800">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
              <span>Joy PeopleHR Commercial Proposal</span>
              <span>Page 2 of 8</span>
            </div>
          </div>


          {/* ===================================================================
              PAGE 3 — HRMS MODULE SCOPE MATRIX
              =================================================================== */}
          <div className="bg-white p-10 sm:p-14 rounded-xl shadow-md border border-slate-300 min-h-[1050px] flex flex-col justify-between print:min-h-screen print:shadow-none print:border-none print:rounded-none print:break-after-page">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Detailed Scope Matrix</span>
                <span className="text-xs font-mono text-slate-400">{quote.quotationNumber}</span>
              </div>

              <div className="mt-8 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">HRMS MODULE SCOPE BREAKDOWN</h3>
                  <p className="text-xs text-slate-600">
                    Commercial deliverables and functional scope included within the {quote.planName} tier for {quote.clientName}.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="p-3 w-40">Module Name</th>
                        <th className="p-3 w-24 text-center">Status</th>
                        <th className="p-3">Functional Deliverables & Capabilities</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-bold text-slate-900">01. Core HR</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Included ✓</span></td>
                        <td className="p-3 text-slate-600">Employee Master, Org Structure, Lifecycle, Onboarding, Transfers, Promotions, Exit & Document Vault</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">02. Employee Self Service</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Included ✓</span></td>
                        <td className="p-3 text-slate-600">Mobile & Web ESS, Payslip downloads, IT declarations, leave requests, attendance view & notification center</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">03. Attendance & Time</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Included ✓</span></td>
                        <td className="p-3 text-slate-600">Web/Mobile punch, Geofencing, Shift Rosters, Rotational Night shifts, OT calculation & Regularization flows</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">04. Leave Management</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Included ✓</span></td>
                        <td className="p-3 text-slate-600">Accruals, Carry forward, Encashment, Multi-level approvals, Holiday calendar & Statutory leave policies</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">05. India Payroll</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Included ✓</span></td>
                        <td className="p-3 text-slate-600">Multi-component salary structures, PF/ESI/PT/TDS calculation, Form 16 generator, Bank payout files & payslips</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">06. Recruitment / ATS</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Included ✓</span></td>
                        <td className="p-3 text-slate-600">Requisitions, Job boards, Resume database, Interview pipelines, Scorecards, Offer letters & Pre-onboarding</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">07. Performance</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Included ✓</span></td>
                        <td className="p-3 text-slate-600">OKRs, KRAs, KPIs, 360° Review cycles, Manager ratings, Normalization curve calibration & increment letters</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">08. Expense & Travel</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Included ✓</span></td>
                        <td className="p-3 text-slate-600">Receipt scanning, Travel advances, Mileage tracking, Multi-tier approvals & Direct payroll reimbursement</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">09. Vendor Workforce</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">Enterprise ✓</span></td>
                        <td className="p-3 text-slate-600">Contractor onboarding, Factory site deployment, Attendance verification, Statutory PF/ESI compliance checks</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">10. Procurement</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">Enterprise ✓</span></td>
                        <td className="p-3 text-slate-600">Purchase requisitions, Vendor quotes, Comparative statements, PO generation & Approval hierarchies</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">11. 3-Way Match & Invoice</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">Enterprise ✓</span></td>
                        <td className="p-3 text-slate-600">Vendor invoice validation, Automated 3-way reconciliation (PO vs GRN vs Invoice), GST/TDS deduction & Settlements</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-900">12. Biometric Gateway</td>
                        <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">Configured ✓</span></td>
                        <td className="p-3 text-slate-600">{solutionConfig.biometricDevicesCount} Biometric Hardware units connected via eSSL ADMS / ZKTeco Push Daemon</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
              <span>Joy PeopleHR Commercial Proposal</span>
              <span>Page 3 of 8</span>
            </div>
          </div>


          {/* ===================================================================
              PAGE 4 — DETAILED FEATURE BREAKDOWN BY MODULE
              =================================================================== */}
          <div className="bg-white p-10 sm:p-14 rounded-xl shadow-md border border-slate-300 min-h-[1050px] flex flex-col justify-between print:min-h-screen print:shadow-none print:border-none print:rounded-none print:break-after-page">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Feature Deliverables</span>
                <span className="text-xs font-mono text-slate-400">{quote.quotationNumber}</span>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">COMPREHENSIVE FEATURE BREAKDOWN</h3>
                  <p className="text-xs text-slate-600">
                    High-level inventory of capabilities configured for the enterprise deployment.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Core HR Card */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">CORE HR & ONBOARDING</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">18 Features Included</span>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4">
                      <li>Centralized employee master database with multi-tier custom fields</li>
                      <li>Multi-entity company & business unit structural hierarchy</li>
                      <li>Digital offer letter generation with automated document collection</li>
                      <li>Probation tracking, confirmation workflows & appraisal triggers</li>
                      <li>Transfers, promotions, departmental transitions & increment letters</li>
                      <li>Clearance checklists, asset return verification & automated F&F settlement</li>
                    </ul>
                  </div>

                  {/* Attendance Card */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">ATTENDANCE & TIME TRACKING</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">24 Features Included</span>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4">
                      <li>Biometric device push gateway with instant punch synchronization</li>
                      <li>Geofenced and GPS mobile attendance for field / multi-site personnel</li>
                      <li>Rotational, split, and multi-shift roster allocation engines</li>
                      <li>Automated late-coming, early-leaving & grace period policy enforcement</li>
                      <li>Overtime computation mapped to statutory factory rate formulas</li>
                      <li>Supervisor attendance regularization workflows & leave mapping</li>
                    </ul>
                  </div>

                  {/* Payroll Card */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">INDIA STATUTORY PAYROLL</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">28 Features Included</span>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4">
                      <li>Configurable CTC pay templates with variable bonuses & allowances</li>
                      <li>Statutory PF, ESI, Professional Tax (all state slabs) & LWF calculations</li>
                      <li>TDS projections under Old and New tax regimes with 12BB proofs</li>
                      <li>Automated Form 16 Part A/B and digital payslip delivery (Email/WhatsApp)</li>
                      <li>Direct bank payment text files for HDFC, ICICI, SBI, and Axis Bank</li>
                      <li>Monthly payroll variance, journal vouchers, and audit reconciliation sheets</li>
                    </ul>
                  </div>

                  {/* Workforce Operations Card */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">WORKFORCE OPERATIONS & 3-WAY MATCH</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">22 Features Included</span>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4">
                      <li>Contractor / manpower vendor onboarding with agreement validity dates</li>
                      <li>Vendor employee biometric registration and site badge generation</li>
                      <li>Purchase requisition, RFQ quotation comparisons & PO approvals</li>
                      <li>Vendor attendance certification with wage rate cards & overtime rules</li>
                      <li>3-Way matching (Purchase Order + GRN Attendance + Vendor Invoice)</li>
                      <li>GST TDS 2% and Income Tax TDS deduction reports with payment scheduling</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
              <span>Joy PeopleHR Commercial Proposal</span>
              <span>Page 4 of 8</span>
            </div>
          </div>


          {/* ===================================================================
              PAGE 5 — COMMERCIAL SCHEDULE & PRICING
              =================================================================== */}
          <div className="bg-white p-10 sm:p-14 rounded-xl shadow-md border border-slate-300 min-h-[1050px] flex flex-col justify-between print:min-h-screen print:shadow-none print:border-none print:rounded-none print:break-after-page">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Commercial Schedule</span>
                <span className="text-xs font-mono text-slate-400">{quote.quotationNumber}</span>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">COMMERCIAL PRICING SCHEDULE</h3>
                  <p className="text-xs text-slate-600">
                    Transparent investment overview with separate Recurring SaaS and One-Time Implementation schedules.
                  </p>
                </div>

                {/* Section A: Recurring SaaS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      PART A: RECURRING SAAS SUBSCRIPTION ({terms.billingFrequency.toUpperCase()} BILLING)
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">SAC Code: 998313 (IT SaaS Services)</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                          <th className="p-3">Item Description</th>
                          <th className="p-3 text-center">Volume / Units</th>
                          <th className="p-3 text-center">Unit Rate</th>
                          <th className="p-3 text-right">Annual Gross Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-3">
                            <span className="font-bold text-slate-900">{quote.planName} SaaS Platform Base Tier</span>
                            <span className="text-[10px] text-slate-500 block">Includes core platform infrastructure, multi-entity setup & {quote.includedEmployees} employee seats</span>
                          </td>
                          <td className="p-3 text-center font-medium">1 Instance</td>
                          <td className="p-3 text-center">₹{snapshot.basePlanMonthly.toLocaleString('en-IN')}/mo</td>
                          <td className="p-3 text-right font-semibold">₹{(snapshot.basePlanMonthly * 12).toLocaleString('en-IN')}</td>
                        </tr>

                        {quote.additionalEmployeesCount > 0 && (
                          <tr>
                            <td className="p-3">
                              <span className="font-bold text-slate-900">Additional Workforce Licenses</span>
                              <span className="text-[10px] text-slate-500 block">Volume Tier Rate for {quote.additionalEmployeesCount} seats above {quote.includedEmployees} base</span>
                            </td>
                            <td className="p-3 text-center font-medium">{quote.additionalEmployeesCount} Seats</td>
                            <td className="p-3 text-center">₹{quote.pepmRate} PEPM</td>
                            <td className="p-3 text-right font-semibold">₹{(snapshot.overageMonthly * 12).toLocaleString('en-IN')}</td>
                          </tr>
                        )}

                        {snapshot.addonsMonthly > 0 && (
                          <tr>
                            <td className="p-3">
                              <span className="font-bold text-slate-900">Configured Modular Add-ons</span>
                              <span className="text-[10px] text-slate-500 block">Biometric Hardware Gateways, Identity & Specialized Modules</span>
                            </td>
                            <td className="p-3 text-center font-medium">{quote.selectedAddonKeys.length} Add-ons</td>
                            <td className="p-3 text-center">₹{snapshot.addonsMonthly.toLocaleString('en-IN')}/mo</td>
                            <td className="p-3 text-right font-semibold">₹{(snapshot.addonsMonthly * 12).toLocaleString('en-IN')}</td>
                          </tr>
                        )}

                        <tr className="bg-slate-50 font-semibold">
                          <td colSpan={3} className="p-3 text-slate-700 text-right">Recurring SaaS Gross Subtotal (12 Months):</td>
                          <td className="p-3 text-right text-slate-900 font-bold">₹{(snapshot.grossMonthlyRunRate * 12).toLocaleString('en-IN')}</td>
                        </tr>

                        {snapshot.totalDiscountPercent > 0 && (
                          <tr className="bg-emerald-50 text-emerald-800">
                            <td colSpan={3} className="p-3 text-right font-bold">
                              Term & Enterprise Negotiated Discount ({snapshot.totalDiscountPercent}%):
                            </td>
                            <td className="p-3 text-right font-bold">-₹{snapshot.discountAmount.toLocaleString('en-IN')}</td>
                          </tr>
                        )}

                        <tr className="bg-white font-bold border-t border-slate-200">
                          <td colSpan={3} className="p-3 text-slate-900 text-right">Net Annual Recurring SaaS (Pre-Tax):</td>
                          <td className="p-3 text-right text-slate-900 font-black">₹{snapshot.recurringPreTax.toLocaleString('en-IN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section B: One-Time Implementation */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    PART B: ONE-TIME ONBOARDING & IMPLEMENTATION SERVICES
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                          <th className="p-2.5">Service Deliverable</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5 text-right">Fixed Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {quote.oneTimeServices.map((srv) => (
                          <tr key={srv.key}>
                            <td className="p-2.5 font-bold text-slate-900">{srv.name}</td>
                            <td className="p-2.5 text-slate-500 text-[11px]">{srv.description}</td>
                            <td className="p-2.5 text-right font-semibold text-slate-800">₹{srv.rate.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold">
                          <td colSpan={2} className="p-2.5 text-right text-slate-700">One-Time Services Subtotal (Pre-Tax):</td>
                          <td className="p-2.5 text-right text-slate-900">₹{snapshot.oneTimePreTax.toLocaleString('en-IN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grand Summary Box */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Total Taxable Value (Recurring + One-Time Services):</span>
                    <span className="font-mono font-bold text-white text-sm">₹{snapshot.taxableSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Statutory Goods & Services Tax (18% GST):</span>
                    <span className="font-mono text-emerald-400 font-semibold">+₹{snapshot.gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-bold text-slate-300 block">TOTAL FIRST-YEAR CONTRACT VALUE (TCV)</span>
                      <span className="text-[11px] text-emerald-400">Includes all recurring licenses, modules, hardware gateways & setup</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                        ₹{snapshot.totalFirstYearValue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
              <span>Joy PeopleHR Commercial Proposal</span>
              <span>Page 5 of 8</span>
            </div>
          </div>


          {/* ===================================================================
              PAGE 6 — IMPLEMENTATION & ONBOARDING ROADMAP
              =================================================================== */}
          <div className="bg-white p-10 sm:p-14 rounded-xl shadow-md border border-slate-300 min-h-[1050px] flex flex-col justify-between print:min-h-screen print:shadow-none print:border-none print:rounded-none print:break-after-page">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Deployment Roadmap</span>
                <span className="text-xs font-mono text-slate-400">{quote.quotationNumber}</span>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">IMPLEMENTATION & ONBOARDING ROADMAP</h3>
                  <p className="text-xs text-slate-600">
                    Structured 4 to 6-week rollout methodology managed by a dedicated Implementation Manager.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      phase: 'Phase 1: Discovery & Provisioning',
                      time: 'Week 1',
                      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
                      items: [
                        'Tenant provisioning, custom domain & SSL setup',
                        'Kickoff meeting with HR, IT and Finance stakeholders',
                        'Data migration template handover & legacy data assessment',
                      ],
                    },
                    {
                      phase: 'Phase 2: Master Data & Org Structure',
                      time: 'Week 2',
                      color: 'bg-blue-50 border-blue-200 text-blue-800',
                      items: [
                        'Import of employee masters, historical profiles, and departments',
                        'Multi-entity hierarchy and reporting manager workflows setup',
                        'Leave policy configuration, holiday calendars & balance migration',
                      ],
                    },
                    {
                      phase: 'Phase 3: Attendance, Hardware & Payroll Rules',
                      time: 'Weeks 3–4',
                      color: 'bg-purple-50 border-purple-200 text-purple-800',
                      items: [
                        'ADMS biometric push gateway setup & device sync testing',
                        'Shift roster rules, night shift allowance & OT formulas validation',
                        'CTC pay components, statutory slabs & parallel payroll dry-run',
                      ],
                    },
                    {
                      phase: 'Phase 4: Training & User Acceptance (UAT)',
                      time: 'Week 5',
                      color: 'bg-amber-50 border-amber-200 text-amber-800',
                      items: [
                        'Admin training for HR operations and Payroll teams',
                        'Supervisory workflow training for shift managers and HODs',
                        'ESS roll-out communications and mobile app onboarding collateral',
                      ],
                    },
                    {
                      phase: 'Phase 5: Production Go-Live & Hypercare',
                      time: 'Week 6',
                      color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
                      items: [
                        'First live payroll processing and payslip generation',
                        'Live biometric punch reconciliation and attendance lock',
                        'Dedicated 30-day hypercare support engineer assigned',
                      ],
                    },
                  ].map((p, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border ${p.color} space-y-2`}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-900">{p.phase}</h4>
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border shadow-2xs">
                          {p.time}
                        </span>
                      </div>
                      <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                        {p.items.map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
              <span>Joy PeopleHR Commercial Proposal</span>
              <span>Page 6 of 8</span>
            </div>
          </div>


          {/* ===================================================================
              PAGE 7 — COMMERCIAL TERMS & SLA
              =================================================================== */}
          <div className="bg-white p-10 sm:p-14 rounded-xl shadow-md border border-slate-300 min-h-[1050px] flex flex-col justify-between print:min-h-screen print:shadow-none print:border-none print:rounded-none print:break-after-page">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Commercial Terms</span>
                <span className="text-xs font-mono text-slate-400">{quote.quotationNumber}</span>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">COMMERCIAL TERMS & GOVERNANCE</h3>
                  <p className="text-xs text-slate-600">
                    Standard terms governing subscription access, service level agreements (SLA), and enterprise security.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-bold text-slate-900">1. Subscription & Payment Terms</h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Subscription fees are billed annually in advance. Invoices are payable within {terms.paymentTerms} from the invoice date. All statutory taxes including 18% GST are billed in accordance with prevailing Indian tax laws.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-bold text-slate-900">2. Service Level Agreement (99.9% Uptime)</h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Joy PeopleHR guarantees 99.9% production availability excluding scheduled maintenance windows. High-availability multi-region active database failover ensures continuous operation.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-bold text-slate-900">3. Information Security & Compliance</h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Data is stored in Indian AWS cloud regions (Mumbai/Hyderabad) with AES-256 encryption at rest and TLS 1.3 in transit. Platform adheres strictly to ISO 27001, SOC-2 Type II standards, and DPDP Act 2023.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-bold text-slate-900">4. Annual Price Escalation Protection</h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      To protect enterprise budgets, annual renewal price increases are capped at maximum {terms.annualEscalationPct}% per annum for contract renewals.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-bold text-slate-900">5. Data Ownership & Portability</h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      The customer retains 100% exclusive ownership of all tenant data. Complete data exports (SQL/JSON/CSV) can be triggered on demand at any time without punitive exit penalties.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-bold text-slate-900">6. Technical Support Channels</h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Priority email, web helpdesk, and dedicated phone support during standard business hours (9:00 AM – 7:00 PM IST Monday to Saturday). Critical incident response SLA within 1 hour.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
              <span>Joy PeopleHR Commercial Proposal</span>
              <span>Page 7 of 8</span>
            </div>
          </div>


          {/* ===================================================================
              PAGE 8 — ACCEPTANCE & DUAL AUTHORIZATION
              =================================================================== */}
          <div className="bg-white p-10 sm:p-14 rounded-xl shadow-md border border-slate-300 min-h-[1050px] flex flex-col justify-between print:min-h-screen print:shadow-none print:border-none print:rounded-none print:break-after-page">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Proposal Acceptance</span>
                <span className="text-xs font-mono text-slate-400">{quote.quotationNumber}</span>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">FORMAL PROPOSAL ACCEPTANCE</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    By signing below, the Client accepts the proposed Joy PeopleHR SaaS solution scope, modules, and commercial terms set forth in this proposal (Quotation Ref: <strong>{quote.quotationNumber}</strong>).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <p className="font-medium">
                    "We confirm our intention to proceed with the subscription and onboarding of the Joy PeopleHR platform for <strong>{quote.clientName}</strong> covering <strong>{quote.employeeCount} employees</strong> across <strong>{req.locations} operating locations</strong> under the <strong>{quote.planName} Tier</strong>."
                  </p>
                </div>

                {/* Instant Online Settlement & Razorpay QR */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-slate-50 border border-blue-200 text-xs text-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-700" />
                      <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">
                        Instant Commercial Settlement (Razorpay / UPI)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Proposal Valid Until: {quote.validUntil}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* UPI QR Canvas */}
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs shrink-0 text-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                          quote.razorpayQrPayload ||
                            razorpayOrderService.generateUpiQrPayload(
                              quote.quotationNumber,
                              quote.pricingSnapshot.totalFirstYearValue,
                              quote.clientName
                            )
                        )}`}
                        alt="UPI Payment QR"
                        className="h-28 w-28 object-contain mx-auto"
                      />
                      <span className="text-[9px] font-bold text-slate-500 block mt-1">Scan via UPI App</span>
                    </div>

                    {/* Settlement details & link */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">Total First-Year Value:</span>
                        <strong className="text-sm font-black text-slate-900">
                          ₹{quote.pricingSnapshot.totalFirstYearValue.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Payment link: <code className="font-mono text-blue-700 break-all select-all">{quote.paymentLink || razorpayOrderService.generatePaymentLink(quote.quotationNumber, quote.pricingSnapshot.totalFirstYearValue)}</code>
                      </div>
                      <p className="text-[10.5px] text-slate-500 pt-1">
                        Supported methods: <strong>UPI (GPay, PhonePe, Paytm), NetBanking (50+ Banks), Corporate Credit Cards</strong>. Transaction generates immediate digital receipt and tax invoice.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dual Signature Blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                  {/* Customer Signatory */}
                  <div className="border border-slate-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">FOR CUSTOMER:</span>
                      {quote.clientLogoUrl && (
                        <div className="h-8 px-2.5 py-0.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-center">
                          <img src={quote.clientLogoUrl} alt={quote.clientName} className="h-6 max-w-[100px] object-contain" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{quote.clientName}</h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">GSTIN: {quote.clientGstin}</p>
                    </div>

                    <div className="pt-6 border-b border-dashed border-slate-300">
                      {isAccepted ? (
                        <div className="py-2 text-emerald-700 font-bold text-sm flex items-center gap-1.5 font-mono">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Digitally Accepted by Customer</span>
                        </div>
                      ) : (
                        <div className="h-10 flex items-end text-slate-300 text-xs italic">
                          Authorized Signature & Corporate Stamp
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div>Name: <strong>Rajesh Kumar</strong></div>
                      <div>Designation: <strong>HR Head</strong></div>
                      <div>Date: <strong>{isAccepted ? quote.updatedAt : '________________________'}</strong></div>
                    </div>
                  </div>

                  {/* Supplier Signatory */}
                  <div className="border border-slate-200 rounded-2xl p-6 space-y-4">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">FOR {supplier.legalName.toUpperCase()}:</span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{supplier.legalName}</h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">GSTIN: {supplier.gstin}</p>
                    </div>

                    <div className="pt-6 border-b border-dashed border-slate-300">
                      <div className="py-2 text-emerald-800 font-bold text-sm flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>{supplier.signatoryName || api.getCurrentUser()?.name || 'Authorized Signatory'} ({supplier.signatoryDesignation || 'Commercial Lead'})</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div>Name: <strong>{supplier.signatoryName || api.getCurrentUser()?.name || 'Authorized Signatory'}</strong></div>
                      <div>Designation: <strong>{supplier.signatoryDesignation || 'Commercial Lead & Enterprise Solutions'}</strong></div>
                      <div>Date: <strong>{quote.createdAt}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Digital Transition Callout */}
                {isAccepted && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <strong>Quotation Officially Accepted</strong>
                        <p className="text-[11px] text-emerald-700">This quotation is legally binding and ready to be converted into an Active Subscription and Tax Invoice.</p>
                      </div>
                    </div>
                    {quote.status !== 'CONVERTED' && onConvertToSubscription && (
                      <Button
                        size="sm"
                        onClick={() => onConvertToSubscription(quote.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold shrink-0"
                      >
                        Convert to Subscription ›
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
              <span>Joy PeopleHR Commercial Proposal</span>
              <span>Page 8 of 8</span>
            </div>
          </div>

        </div>
      </div>

      {/* Edit Supplier Company / GST Credentials Modal */}
      <EditSupplierCompanyModal
        isOpen={isEditCompanyOpen}
        onClose={() => setIsEditCompanyOpen(false)}
        onSaved={(updated) => setSupplier(updated)}
      />
    </div>
  );
};
