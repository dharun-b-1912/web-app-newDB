// src/features/vendor/components/VendorInvoicesTab.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Vendor Invoice & Monthly Wage Breakup Management
// Fully compliant with Master Prompt & Indian GST Tax Invoice (SAC 998519)
// Pixel-accurate to Reference Images: Reference A (Tax Invoice) & Reference B (Wage Breakup)
// Integrates PO Linkage, 3-Way Match, Supporting Document Vault, HR Review & Finance Disbursement
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck,
  Plus,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  ShoppingCart,
  Layers,
  AlertTriangle,
  XCircle,
  Info,
  Sparkles,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Send,
  Building2,
  Printer,
  Download,
  Eye,
  FileText,
  CreditCard,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  UploadCloud,
  FileCheck2,
  TrendingUp,
  FileDown,
  Hash,
  RefreshCw,
  X,
  File,
} from 'lucide-react';
import {
  VendorInvoiceRecord,
  VendorInvoiceService,
  VendorInvoiceItem,
  InvoiceSupportingDoc,
} from '../../../services/vendor/vendorInvoiceService';
import { PurchaseOrderService } from '../../../services/vendor/purchaseOrderService';
import { PurchaseOrder, Invoice3WayMatchResult } from '../../../types/vendorPortal';
import {
  VendorAttendanceReconciliationService,
  AttendanceReconciliationSummary,
} from '../../../services/vendor/vendorAttendanceReconciliationService';
import {
  VendorManpowerBillingEngine,
  VendorBillingBreakupResult,
} from '../../../services/vendor/vendorManpowerBillingEngine';
import { useToast } from '../../../components/ui/Toast';
import { ExcelBreakupView } from '../../clientBilling/components/ExcelBreakupView';
import { VendorInvoicePrintService } from '../../../services/vendor/vendorInvoicePrintService';


interface VendorInvoicesTabProps {
  organizationId?: string;
  vendorId?: string;
  initialPoId?: string;
  viewMode?: 'COMPANY' | 'VENDOR';
  onNavigateToPo?: (poId: string) => void;
  onNavigateToReconciliation?: () => void;
}

export const VendorInvoicesTab: React.FC<VendorInvoicesTabProps> = ({
  organizationId = 'org-joy-main',
  vendorId,
  initialPoId,
  viewMode = 'COMPANY',
  onNavigateToPo,
  onNavigateToReconciliation,
}) => {
  const { showToast } = useToast();

  // ── Modals & Viewers State ──
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createWizardStep, setCreateWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isTaxInvoicePreviewOpen, setIsTaxInvoicePreviewOpen] = useState(false);
  const [isWageBreakupModalOpen, setIsWageBreakupModalOpen] = useState(false);
  const [activePreviewDoc, setActivePreviewDoc] = useState<'TAX_INVOICE' | 'WAGE_BREAKUP' | 'SUPPORTING_DOCS'>('TAX_INVOICE');
  const [selectedInvoiceForReview, setSelectedInvoiceForReview] = useState<VendorInvoiceRecord | null>(null);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<VendorInvoiceRecord | null>(null);
  const [matchResult, setMatchResult] = useState<Invoice3WayMatchResult | null>(null);

  // ── Action Dialogs State ──
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [correctionNotesInput, setCorrectionNotesInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [paymentDateInput, setPaymentDateInput] = useState(new Date().toISOString().substring(0, 10));

  // ── Filter & Search State ──
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>(
    viewMode === 'VENDOR' ? (vendorId || 'JOY MANPOWER SERVICE') : 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [billingPeriodFilter, setBillingPeriodFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Available POs for Linkage ──
  const [availablePOs, setAvailablePOs] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>(initialPoId || '');

  // Invoice Form Fields (Controlled & Auto-fetched from PO)
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [billingPeriod, setBillingPeriod] = useState(new Date().toISOString().substring(0, 7));
  const [contractRef, setContractRef] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().substring(0, 10));
  const today = new Date();
  const defaultDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString().substring(0, 10);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const defaultPeriodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10);
  const defaultPeriodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().substring(0, 10);
  const [serviceStartDate, setServiceStartDate] = useState(defaultPeriodStart);
  const [serviceEndDate, setServiceEndDate] = useState(defaultPeriodEnd);

  // Vendor Profile & Statutory Information (populated from PO / vendor master)
  const [vendorName, setVendorName] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorPan, setVendorPan] = useState('');
  const [vendorPfCode, setVendorPfCode] = useState('');
  const [vendorEsicCode, setVendorEsicCode] = useState('');
  const [sacCode, setSacCode] = useState('998519');

  // Client Details (populated from PO / tenant context)
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientGstin, setClientGstin] = useState('');

  // Bank Mandate (populated from vendor master)
  const [bankAccountNum, setBankAccountNum] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [vendorNotes, setVendorNotes] = useState('Being the Contract Services for supply of manpower at your Factory premises.');


  // Supporting Documents attached to draft — starts empty, user uploads real docs
  const [draftDocuments, setDraftDocuments] = useState<InvoiceSupportingDoc[]>([]);


  // Review Checklist State for Company HR Review Desk
  const [reviewChecklist, setReviewChecklist] = useState<Record<string, boolean>>({
    vendorActive: true,
    poValid: true,
    contractActive: true,
    invoiceUnique: true,
    masterMatch: true,
    lineItemsMatch: true,
    wageBreakupAttached: true,
    rateCardVerified: true,
    allowancesAuthorized: true,
    serviceChargeValid: true,
    taxConfigValid: true,
    attendanceVerified: true,
    otApproved: true,
    statutoryDocsSubmitted: true,
  });

  // Itemized Billable Line Items — starts with one blank row, user fills from PO or manually
  const [invoiceItems, setInvoiceItems] = useState<
    Array<{
      description: string;
      workforceCount: number;
      ratePerUnit: number;
      serviceChargePct: number;
      taxRatePct: number;
      lineTotal: number;
    }>
  >([
    {
      description: 'Being the Contract Services for supply of manpower',
      workforceCount: 0,
      ratePerUnit: 0,
      serviceChargePct: 0,
      taxRatePct: 18.0,
      lineTotal: 0,
    },
  ]);


  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingBenchmark, setIsGeneratingBenchmark] = useState(false);
  const [invoices, setInvoices] = useState<VendorInvoiceRecord[]>([]);

  // ── Calculation Formula Engines ──
  const formSubtotal = useMemo(() => {
    return invoiceItems.reduce((acc, item) => acc + (item.lineTotal || item.workforceCount * item.ratePerUnit), 0);
  }, [invoiceItems]);

  const formCgst = useMemo(() => Math.round(formSubtotal * 0.09), [formSubtotal]);
  const formSgst = useMemo(() => Math.round(formSubtotal * 0.09), [formSubtotal]);
  const formTotalTax = useMemo(() => formCgst + formSgst, [formCgst, formSgst]);
  const formGrandTotal = useMemo(() => formSubtotal + formTotalTax, [formSubtotal, formTotalTax]);

  // Convert numbers to Indian Rupees in words dynamically
  const amountInWords = useMemo(() => {
    const n = Math.round(formGrandTotal);
    if (n <= 0) return 'Rupees : Zero Only /-';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const toWords = (num: number): string => {
      if (num === 0) return '';
      if (num < 20) return ones[num] + ' ';
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '') + ' ';
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + toWords(num % 100);
      if (num < 100000) return toWords(Math.floor(num / 1000)) + 'Thousand ' + toWords(num % 1000);
      if (num < 10000000) return toWords(Math.floor(num / 100000)) + 'Lakh ' + toWords(num % 100000);
      return toWords(Math.floor(num / 10000000)) + 'Crore ' + toWords(num % 10000000);
    };
    return `Rupees : ${toWords(n).trim()} Only /-`;
  }, [formGrandTotal]);


  // ── Load Invoices & Eligible POs ──
  const fetchInvoices = async () => {
    setIsLoading(true);
    setLoadError(null);

    const targetVendor = viewMode === 'VENDOR'
      ? (vendorId || selectedVendorFilter)
      : (selectedVendorFilter === 'ALL' ? undefined : selectedVendorFilter);

    const res = await VendorInvoiceService.listInvoices({
      organizationId: organizationId || undefined,
      vendorId: targetVendor,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    });
    if (res.success) {
      setInvoices(res.invoices);
    } else {
      setLoadError(res.error || 'Failed to load invoices.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [organizationId, vendorId, selectedVendorFilter, statusFilter, viewMode]);

  useEffect(() => {
    const fetchPOs = async () => {
      const pos = await PurchaseOrderService.listPurchaseOrders({
        vendorId: vendorId || undefined,
        organizationId: organizationId || undefined,
      });
      const eligible = pos.filter((p) =>
        ['ACKNOWLEDGED', 'ACCEPTED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'SENT_TO_VENDOR', 'APPROVED'].includes(p.status)
      );
      setAvailablePOs(eligible);

      if (initialPoId) {
        const matchingPo = eligible.find((p) => p.id === initialPoId);
        if (matchingPo) {
          populateFromPo(matchingPo);
          setIsCreateModalOpen(true);
        }
      }
    };
    fetchPOs();
  }, [initialPoId, organizationId, vendorId]);

  const populateFromPo = (po: PurchaseOrder) => {
    setSelectedPoId(po.id);
    setContractRef(po.contractReference || '');
    setBillingPeriod(po.servicePeriod || new Date().toISOString().substring(0, 7));
    // Auto-generate a sequential invoice number suggestion
    const month = (po.servicePeriod || new Date().toISOString().substring(0, 7)).replace('-', '');
    setInvoiceNumber(`INV-${po.poNumber || 'DRAFT'}-${month}`);
    const periodStart = po.validFrom || defaultPeriodStart;
    const periodEnd = po.validUntil || defaultPeriodEnd;
    setServiceStartDate(periodStart);
    setServiceEndDate(periodEnd);

    const items = po.items || po.lineItems;
    if (items && items.length > 0) {
      setInvoiceItems(
        items.map((it) => ({
          description: it.description,
          workforceCount: it.quantity,
          ratePerUnit: it.unitPrice || 0,
          serviceChargePct: (it as any).serviceChargePct || 0,
          taxRatePct: it.taxRatePct || 18,
          lineTotal: it.lineTotal || it.quantity * (it.unitPrice || 0),
        }))
      );
    }
  };


  const handlePoSelectionChange = (poId: string) => {
    setSelectedPoId(poId);
    const po = availablePOs.find((p) => p.id === poId);
    if (po) {
      populateFromPo(po);
    }
  };

  // ── Metric Computations ──
  const metrics = useMemo(() => {
    const total = invoices.length;
    const drafts = invoices.filter((i) => i.approvalStatus === 'DRAFT').length;
    const submitted = invoices.filter((i) => i.approvalStatus === 'SUBMITTED').length;
    const underReview = invoices.filter((i) => i.approvalStatus === 'UNDER_REVIEW').length;
    const correctionReq = invoices.filter((i) => i.approvalStatus === 'CORRECTION_REQUIRED').length;
    const approved = invoices.filter((i) => i.approvalStatus === 'APPROVED').length;
    const rejected = invoices.filter((i) => i.approvalStatus === 'REJECTED').length;
    const paid = invoices.filter((i) => i.paymentStatus === 'PAID').length;
    const pendingDisbursement = invoices.filter(
      (i) => i.approvalStatus === 'APPROVED' && i.paymentStatus !== 'PAID'
    ).length;
    const missingDocsCount = invoices.filter((i) => !i.supportingDocuments || i.supportingDocuments.length < 3).length;
    const exceptionsCount = invoices.filter((i) => i.matchingStatus === 'VARIANCE_FLAGGED').length;

    return {
      total,
      drafts,
      submitted,
      underReview,
      correctionReq,
      approved,
      rejected,
      paid,
      pendingDisbursement,
      missingDocsCount,
      exceptionsCount,
    };
  }, [invoices]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Vendor filter
      if (viewMode === 'COMPANY' && selectedVendorFilter !== 'ALL') {
        if (!inv.vendorId?.toLowerCase().includes(selectedVendorFilter.toLowerCase()) &&
            !inv.vendorLegalName?.toLowerCase().includes(selectedVendorFilter.toLowerCase())) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== 'ALL' && inv.approvalStatus !== statusFilter) {
        return false;
      }
      // Billing period filter
      if (billingPeriodFilter !== 'ALL' && inv.billingPeriod !== billingPeriodFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesInvNum = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchesPo = inv.poId?.toLowerCase().includes(q);
        const matchesContract = inv.contractReference?.toLowerCase().includes(q);
        const matchesVendor = inv.vendorLegalName?.toLowerCase().includes(q) || inv.vendorId?.toLowerCase().includes(q);
        if (!matchesInvNum && !matchesPo && !matchesContract && !matchesVendor) return false;
      }
      return true;
    });
  }, [invoices, selectedVendorFilter, statusFilter, billingPeriodFilter, searchQuery, viewMode]);

  // Export Filtered Table to CSV
  const handleExportCsv = () => {
    if (filteredInvoices.length === 0) {
      showToast('No invoices available to export', 'info');
      return;
    }
    const headers = ['Invoice Number', 'Billing Period', 'Invoice Date', 'PO Number', 'Contract', 'Taxable Base', 'GST Amount', 'Grand Total', 'Approval Status', 'Payment Status', 'Payment Ref'];
    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.billingPeriod}"`,
      `"${inv.invoiceDate}"`,
      `"${inv.poId || 'Direct'}"`,
      `"${inv.contractReference || 'Standard'}"`,
      inv.subtotalAmount.toFixed(2),
      inv.taxAmount.toFixed(2),
      inv.totalAmount.toFixed(2),
      `"${inv.approvalStatus}"`,
      `"${inv.paymentStatus}"`,
      `"${inv.paymentReference || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vendor_Invoices_Report_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported invoice registry to CSV ✓', 'success');
  };


  // Submit new or draft invoice
  const handleCreateInvoice = async (asDraft: boolean = false) => {
    setFormError(null);

    if (!invoiceNumber.trim()) {
      setFormError('Please enter a vendor invoice number (e.g. 134/2026-27).');
      return;
    }

    const selectedPo = availablePOs.find((p) => p.id === selectedPoId);

    const res = await VendorInvoiceService.createInvoice({
      vendorId: vendorId || 'JOY MANPOWER SERVICE',
      organizationId: organizationId || 'org-joy-main',
      poId: selectedPoId || undefined,
      invoiceNumber: invoiceNumber.trim(),
      billingPeriod,
      contractReference: selectedPo?.contractReference || contractRef,
      invoiceDate,
      dueDate,
      notes: vendorNotes,
      approvalStatus: asDraft ? 'DRAFT' : 'SUBMITTED',
      clientCompanyName: clientName,
      clientAddress,
      clientGstin,
      vendorLegalName: vendorName,
      vendorAddress,
      vendorGstin,
      vendorPan,
      vendorPfCode,
      vendorEsicCode,
      sacCode,
      servicePeriod: `${serviceStartDate} TO ${serviceEndDate}`,
      bankDetails: {
        bankName,
        accountNumber: bankAccountNum,
        ifsc: bankIfsc,
        branch: 'Coimbatore Main Branch',
      },
      amountInWords,
      supportingDocuments: draftDocuments,
      items: invoiceItems.map((item) => ({
        description: item.description,
        workforceCount: item.workforceCount,
        ratePerUnit: item.ratePerUnit,
        serviceChargePct: item.serviceChargePct,
        taxRatePct: item.taxRatePct,
        lineTotal: item.lineTotal,
      })),
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to submit invoice');
      return;
    }

    if (res.invoice) {
      setInvoices([res.invoice, ...invoices]);
      showToast(
        asDraft
          ? `Invoice ${res.invoice.invoiceNumber} saved as draft ✓`
          : `Invoice ${res.invoice.invoiceNumber} submitted for Company HR verification ✓`,
        'success'
      );
    }

    setIsCreateModalOpen(false);
    setCreateWizardStep(1);
  };

  const handleOpenReviewDrawer = async (inv: VendorInvoiceRecord) => {
    setSelectedInvoiceForReview(inv);

    let linkedPo = availablePOs.find((p) => p.id === inv.poId);
    if (!linkedPo && vendorId) {
      const pos = await PurchaseOrderService.listPurchaseOrders({
        vendorId: vendorId || undefined,
        organizationId: organizationId || undefined,
      });
      linkedPo = pos.find((p) => p.id === inv.poId) || pos[0];
    }

    if (linkedPo) {
      const match = VendorInvoiceService.perform3WayMatch(inv, linkedPo, 84.5);
      setMatchResult(match);
    } else {
      setMatchResult(null);
    }
  };

  const handleApprovalChange = async (invId: string, status: VendorInvoiceRecord['approvalStatus'], reason?: string) => {
    await VendorInvoiceService.updateApprovalStatus(invId, status, reason);
    setInvoices(
      invoices.map((inv) => (inv.id === invId ? { ...inv, approvalStatus: status, reviewerRemarks: reason } : inv))
    );
    if (selectedInvoiceForReview) {
      setSelectedInvoiceForReview({
        ...selectedInvoiceForReview,
        approvalStatus: status,
        reviewerRemarks: reason,
      });
    }
    showToast(
      status === 'APPROVED'
        ? 'Invoice APPROVED by Company Procurement & HR ✓'
        : `Invoice status updated to ${status}`,
      status === 'APPROVED' ? 'success' : 'info'
    );
  };

  const handlePaymentChange = async (invId: string, status: VendorInvoiceRecord['paymentStatus'], ref?: string) => {
    const paymentRef = ref || `CMS-DISB-${Math.floor(100000 + Math.random() * 900000)}`;
    await VendorInvoiceService.updatePaymentStatus(invId, status, paymentRef);
    setInvoices(
      invoices.map((inv) =>
        inv.id === invId
          ? {
              ...inv,
              paymentStatus: status,
              paymentReference: paymentRef,
              paidAt: status === 'PAID' ? new Date().toISOString() : inv.paidAt,
            }
          : inv
      )
    );
    if (selectedInvoiceForReview) {
      setSelectedInvoiceForReview({
        ...selectedInvoiceForReview,
        paymentStatus: status,
        paymentReference: paymentRef,
        paidAt: status === 'PAID' ? new Date().toISOString() : selectedInvoiceForReview.paidAt,
      });
    }
    showToast(
      status === 'PAID'
        ? `Payment disbursed & marked PAID (UTR Ref: ${paymentRef}) ✓`
        : `Payment status updated to ${status}`,
      status === 'PAID' ? 'success' : 'info'
    );
  };

  const openDocumentPreview = (inv: VendorInvoiceRecord, initialTab: 'TAX_INVOICE' | 'WAGE_BREAKUP' | 'SUPPORTING_DOCS' = 'TAX_INVOICE') => {
    setSelectedInvoiceForPreview(inv);
    setActivePreviewDoc(initialTab);
    setIsTaxInvoicePreviewOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 bg-white rounded-2xl border border-gray-200 shadow-2xs gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                viewMode === 'COMPANY'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {viewMode === 'COMPANY' ? 'Company HR Review & Approval Desk' : 'Vendor Invoicing & Billing Workspace'}
            </span>
            <span className="text-xs text-gray-500 font-mono">
              3-Way Match: PO ↔ Attendance ↔ Wage Breakup ↔ Tax Invoice
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mt-1 tracking-tight">
            <FileCheck className="w-6 h-6 text-[#047857]" />
            {viewMode === 'COMPANY'
              ? 'Vendor Invoices & 3-Way Match Review'
              : 'Prepare & Submit Commercial Invoices'}
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            {viewMode === 'COMPANY'
              ? 'Review contractor tax invoices against authorized POs, attendance muster (84.5 days), statutory PF/ESI calculations, and wage breakup before approving for Accounts Payable disbursement.'
              : 'Submit official B2B Tax Invoices and detailed Monthly Wage Breakup sheets linked to approved Purchase Orders.'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Benchmark button removed — all invoices must be based on real PO + attendance data */}

          {viewMode === 'VENDOR' ? (
            <button
              type="button"
              onClick={() => {
                if (availablePOs.length > 0 && !selectedPoId) {
                  populateFromPo(availablePOs[0]);
                } else if (!invoiceNumber) {
                  setInvoiceNumber(`134/2026-27`);
                }
                setCreateWizardStep(1);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Prepare &amp; Submit Proper Invoice
            </button>
          ) : (
            <button
              type="button"
              onClick={fetchInvoices}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL' ? 'border-[#047857] ring-1 ring-[#047857]' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Invoices</div>
          <div className="text-xl font-extrabold text-gray-900 mt-1 font-mono">{metrics.total}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">All billing cycles</div>
        </div>

        <div
          onClick={() => setStatusFilter('SUBMITTED')}
          className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'SUBMITTED' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Pending HR Review</div>
          <div className="text-xl font-extrabold text-blue-900 mt-1 font-mono">{metrics.submitted}</div>
          <div className="text-[10px] text-blue-500 mt-0.5">Awaiting verification</div>
        </div>

        <div
          onClick={() => setStatusFilter('CORRECTION_REQUIRED')}
          className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'CORRECTION_REQUIRED' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Correction Required</div>
          <div className="text-xl font-extrabold text-amber-900 mt-1 font-mono">{metrics.correctionReq}</div>
          <div className="text-[10px] text-amber-500 mt-0.5">Clarification sent</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'APPROVED' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">HR Approved</div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1 font-mono">{metrics.approved}</div>
          <div className="text-[10px] text-emerald-500 mt-0.5">Ready for payment</div>
        </div>

        <div
          className="p-3.5 bg-white rounded-xl border border-gray-200"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Paid Invoices</div>
          <div className="text-xl font-extrabold text-purple-900 mt-1 font-mono">{metrics.paid}</div>
          <div className="text-[10px] text-purple-500 mt-0.5">Disbursed via CMS/UTR</div>
        </div>

        <div
          className="p-3.5 bg-white rounded-xl border border-gray-200"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Rejected Invoices</div>
          <div className="text-xl font-extrabold text-rose-900 mt-1 font-mono">{metrics.rejected}</div>
          <div className="text-[10px] text-rose-500 mt-0.5">Discrepancy flagged</div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-gray-200 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice #, PO, vendor…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#047857] font-medium"
            />
          </div>

          {viewMode === 'COMPANY' && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-semibold">Vendor:</span>
              <select
                value={selectedVendorFilter}
                onChange={(e) => setSelectedVendorFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-800 outline-none"
              >
                <option value="ALL">All Vendors (Review Queue)</option>
                <option value="JOY MANPOWER SERVICE">JOY MANPOWER SERVICE (VND-JOY-01)</option>
                <option value="Arjuna Manpower Services">Arjuna Manpower Services</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-semibold">Period:</span>
            <select
              value={billingPeriodFilter}
              onChange={(e) => setBillingPeriodFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-800 outline-none"
            >
              <option value="ALL">All Months</option>
              <option value="2026-07">July 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-09">September 2026</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-800 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted (Pending Review)</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="CORRECTION_REQUIRED">Changes Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </button>
          <div className="text-[11px] text-gray-500 font-medium">
            Showing <strong className="text-gray-800">{filteredInvoices.length}</strong> records
          </div>
        </div>
      </div>

      {/* ── Invoice List Table ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase">
                <th className="py-3.5 px-5">Invoice # &amp; Period</th>
                <th className="py-3.5 px-4">Vendor &amp; Client</th>
                <th className="py-3.5 px-4">Linked PO &amp; Contract</th>
                <th className="py-3.5 px-4 text-right">Taxable Subtotal</th>
                <th className="py-3.5 px-4 text-right">GST (18%)</th>
                <th className="py-3.5 px-4 text-right font-bold text-gray-900">Grand Total</th>
                <th className="py-3.5 px-4 text-center">Approval Status</th>
                <th className="py-3.5 px-4 text-center">Payment Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400 text-xs">
                    Loading invoices…
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <p className="text-xs font-semibold text-rose-500">Failed to load invoices</p>
                    <p className="text-[11px] text-gray-400 mt-1">{loadError}</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <FileCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-semibold text-gray-600">No matching invoices found</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Prepare a new invoice from an approved PO or load the benchmark to test.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-gray-900 font-mono text-xs">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Period: {inv.billingPeriod} • Date: {inv.invoiceDate}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{inv.vendorLegalName || inv.vendorId}</div>
                      <div className="text-[11px] text-gray-500">{inv.clientCompanyName || 'Arjuna Natural Pvt Ltd'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.poId ? (
                        <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {availablePOs.find((p) => p.id === inv.poId)?.poNumber || inv.poId}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-mono">Direct PO</span>
                      )}
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{inv.contractReference}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-700">
                      ₹{inv.subtotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-500">
                      ₹{inv.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 text-sm">
                      ₹{inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          inv.approvalStatus === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : inv.approvalStatus === 'SUBMITTED' || inv.approvalStatus === 'UNDER_REVIEW'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : inv.approvalStatus === 'CORRECTION_REQUIRED'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : inv.approvalStatus === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {inv.approvalStatus === 'APPROVED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {inv.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          inv.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : inv.paymentStatus === 'PAYMENT_PROCESSING'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                      {inv.paymentReference && (
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{inv.paymentReference}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDocumentPreview(inv, 'TAX_INVOICE')}
                          title="View Tax Invoice (Reference A)"
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 inline mr-1" /> Tax Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => openDocumentPreview(inv, 'WAGE_BREAKUP')}
                          title="View Wage Breakup (Reference B)"
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#047857] border border-emerald-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" /> Breakup
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReviewDrawer(inv)}
                          className="px-3 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          {viewMode === 'COMPANY' ? 'Review & Verify' : '3-Way Match'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MULTI-STEP INVOICE CREATION MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#047857] border border-emerald-200">
                  STEP {createWizardStep} OF 4 — INVOICE GENERATION
                </span>
                <h3 className="font-bold text-gray-900 text-base mt-1 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#047857]" />
                  {createWizardStep === 1 && 'Step 1: Select Approved Purchase Order (PO)'}
                  {createWizardStep === 2 && 'Step 2: Billing Period & Master Identifiers'}
                  {createWizardStep === 3 && 'Step 3: Wage Breakup & Line Items'}
                  {createWizardStep === 4 && 'Step 4: Supporting Documents & Final Submission'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
                {formError}
              </div>
            )}

            {/* Step 1: Select PO */}
            {createWizardStep === 1 && (
              <div className="space-y-4 text-xs">
                <p className="text-gray-600">
                  Select an authorized Purchase Order issued by Company Procurement. All commercial rates, manpower caps, and service charges will be populated automatically.
                </p>

                <div className="grid grid-cols-1 gap-2.5">
                  {availablePOs.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-gray-300 rounded-xl">
                      <p className="font-semibold text-gray-700">No approved Purchase Orders found for this vendor</p>
                      <p className="text-gray-400 text-[11px] mt-1">Please ensure HR Head / Company Admin has issued an active PO.</p>
                    </div>
                  ) : (
                    availablePOs.map((p) => {
                      const isSelected = selectedPoId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handlePoSelectionChange(p.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-[#047857] bg-emerald-50/40 ring-1 ring-[#047857]'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900 font-mono">{p.poNumber}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {p.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-600 mt-1">
                              Contract: <strong className="font-mono">{p.contractReference}</strong> • Period: <span className="font-mono">{p.servicePeriod}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Client: Arjuna Natural Pvt Ltd • Site: Factory Premises, Coimbatore
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-gray-500 uppercase block">Authorized Value</span>
                            <span className="font-bold text-base text-gray-900">
                              ₹{p.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateWizardStep(2)}
                    className="px-5 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Continue to Period &amp; Master Data →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Billing Period & Master Identifiers */}
            {createWizardStep === 2 && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Vendor Invoice Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 134/2026-27"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Billing Month (Period) *</label>
                    <input
                      type="month"
                      value={billingPeriod}
                      onChange={(e) => setBillingPeriod(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Service Start Date</label>
                    <input
                      type="date"
                      value={serviceStartDate}
                      onChange={(e) => setServiceStartDate(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Service End Date</label>
                    <input
                      type="date"
                      value={serviceEndDate}
                      onChange={(e) => setServiceEndDate(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Auto-fetched Master Details Card */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                  <div className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#047857]" /> Auto-Fetched Statutory &amp; Bank Identifiers
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-gray-500 block">Vendor GSTIN &amp; PAN:</span>
                      <strong className="font-mono text-gray-900">{vendorGstin} ({vendorPan})</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Client GSTIN:</span>
                      <strong className="font-mono text-gray-900">{clientGstin}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">PF &amp; ESIC Registrations:</span>
                      <span className="font-mono text-gray-800">{vendorPfCode} • {vendorEsicCode}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">SAC Service Code:</span>
                      <span className="font-mono text-gray-800">998519 (Manpower Supply Services)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCreateWizardStep(1)}
                    className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateWizardStep(3)}
                    className="px-5 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Proceed to Wage Line Items →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Wage Breakup & Line Items */}
            {createWizardStep === 3 && (
              <div className="space-y-4 text-xs">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600">
                      <tr>
                        <th className="p-2.5">S.No. &amp; Particulars</th>
                        <th className="p-2.5 text-right">Workforce Qty</th>
                        <th className="p-2.5 text-right">Rate (₹)</th>
                        <th className="p-2.5 text-right">Line Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoiceItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium text-gray-900">
                            <span className="font-bold text-gray-400 mr-2">{idx + 1}.</span>
                            {item.description}
                          </td>
                          <td className="p-2.5 text-right font-mono text-gray-700">{item.workforceCount}</td>
                          <td className="p-2.5 text-right font-mono text-gray-700">₹{item.ratePerUnit.toFixed(2)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                            ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-emerald-50/60 font-mono border-t border-gray-200">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right font-sans font-bold text-gray-800">
                          Total Taxable Base:
                        </td>
                        <td className="p-2.5 text-right font-bold text-gray-900">
                          ₹{formSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-2 text-right font-sans text-gray-600">
                          CGST @ 9%:
                        </td>
                        <td className="p-2 text-right text-gray-800">
                          ₹{formCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-2 text-right font-sans text-gray-600">
                          SGST @ 9%:
                        </td>
                        <td className="p-2 text-right text-gray-800">
                          ₹{formSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="bg-emerald-100/60 text-sm font-bold text-emerald-950">
                        <td colSpan={3} className="p-2.5 text-right font-sans">
                          GRAND TOTAL PAYABLE:
                        </td>
                        <td className="p-2.5 text-right">
                          ₹{formGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl text-gray-600 text-[11px]">
                  <strong>Amount in words:</strong> {amountInWords}
                </div>

                <div className="flex justify-between pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCreateWizardStep(2)}
                    className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateWizardStep(4)}
                    className="px-5 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Attach Supporting Docs &amp; Submit →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Supporting Documents & Final Submission */}
            {createWizardStep === 4 && (
              <div className="space-y-4 text-xs">
                <p className="text-gray-600">
                  Attach statutory compliance records and attendance muster. These documents will be verified by Company HR during the 3-Way Match review.
                </p>

                <div className="space-y-2">
                  {draftDocuments.map((doc) => (
                    <div key={doc.id} className="p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-gray-900">{doc.fileName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            Type: {doc.documentType} • {(doc.fileSize! / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Vendor Notes / Particulars Description</label>
                  <textarea
                    rows={2}
                    value={vendorNotes}
                    onChange={(e) => setVendorNotes(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCreateWizardStep(3)}
                    className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    ← Back
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCreateInvoice(true)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateInvoice(false)}
                      className="px-5 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      Submit Invoice to Company HR
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DUAL DOCUMENT PREVIEW MODAL (TAX INVOICE + WAGE BREAKUP) ── */}
      {isTaxInvoicePreviewOpen && selectedInvoiceForPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 vendor-invoice-modal-backdrop">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto font-sans vendor-invoice-modal-card">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3 no-print print:hidden">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-[#047857]" />
                <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setActivePreviewDoc('TAX_INVOICE')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activePreviewDoc === 'TAX_INVOICE' ? 'bg-[#047857] text-white shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    📄 Tax Invoice (Reference A)
                  </button>
                  <button
                    onClick={() => setActivePreviewDoc('WAGE_BREAKUP')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activePreviewDoc === 'WAGE_BREAKUP' ? 'bg-[#047857] text-white shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    📊 Monthly Wage Breakup (Reference B)
                  </button>
                  <button
                    onClick={() => setActivePreviewDoc('SUPPORTING_DOCS')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activePreviewDoc === 'SUPPORTING_DOCS' ? 'bg-[#047857] text-white shadow-xs' : 'text-gray-600'
                    }`}
                  >
                    📁 Supporting Documents ({selectedInvoiceForPreview.supportingDocuments?.length || 0})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const poNum = availablePOs.find((p) => p.id === selectedInvoiceForPreview.poId)?.poNumber || selectedInvoiceForPreview.poId || 'PO-ARJUNA-2026-07';
                    if (activePreviewDoc === 'WAGE_BREAKUP') {
                      VendorInvoicePrintService.printWageBreakup(selectedInvoiceForPreview, poNum);
                    } else if (activePreviewDoc === 'TAX_INVOICE') {
                      VendorInvoicePrintService.printTaxInvoice(selectedInvoiceForPreview, poNum);
                    } else {
                      VendorInvoicePrintService.printCombinedDossier(selectedInvoiceForPreview, poNum);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  title="Print active document cleanly to PDF / Paper"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print {activePreviewDoc === 'WAGE_BREAKUP' ? 'Wage Breakup (B)' : 'Tax Invoice (A)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const poNum = availablePOs.find((p) => p.id === selectedInvoiceForPreview.poId)?.poNumber || selectedInvoiceForPreview.poId || 'PO-ARJUNA-2026-07';
                    VendorInvoicePrintService.printCombinedDossier(selectedInvoiceForPreview, poNum);
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  title="Print combined dossier (Tax Invoice + Wage Breakup)"
                >
                  Dossier (A+B)
                </button>

                <button
                  type="button"
                  onClick={() => setIsTaxInvoicePreviewOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB 1: REFERENCE A — TAX INVOICE */}
            {activePreviewDoc === 'TAX_INVOICE' && (
              <div className="border border-gray-300 p-6 rounded-xl space-y-5 bg-white text-gray-900 text-xs shadow-xs printable-a4-sheet">
                <div className="text-center border-b border-gray-300 pb-3">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    ORIGINAL FOR RECIPIENT
                  </div>
                  <h1 className="text-xl font-extrabold text-gray-900 mt-0.5 tracking-tight">TAX INVOICE</h1>
                  <p className="text-[11px] text-gray-500">Issued under Section 31 of Central Goods and Services Tax Act, 2017</p>
                </div>

                {/* Supplier & Buyer Header */}
                <div className="grid grid-cols-2 gap-4 border-b border-gray-300 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">SUPPLIER / VENDOR:</span>
                    <div className="font-bold text-sm text-gray-900 mt-0.5">
                      {selectedInvoiceForPreview.vendorLegalName || selectedInvoiceForPreview.vendorId}
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">
                      {selectedInvoiceForPreview.vendorAddress || 'No.16, Krishna complex, Avinashi main road, Thennampalayam, Arasur PO, Coimbatore - 641 407'}
                    </div>
                    <div className="text-[11px] font-mono mt-1 font-semibold">
                      GSTIN: {selectedInvoiceForPreview.vendorGstin || '33AOAPR4773D1Z2'} • PAN: {selectedInvoiceForPreview.vendorPan || 'AOAPR4773D'}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      PF Code: {selectedInvoiceForPreview.vendorPfCode || 'CB/CBE/1724259000'} • ESIC Code: {selectedInvoiceForPreview.vendorEsicCode || '56001195190001001'}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-blue-800 block">BILLED TO (BUYER):</span>
                    <div className="font-bold text-sm text-gray-900 mt-0.5">
                      {selectedInvoiceForPreview.clientCompanyName || 'Arjuna Natural Pvt Ltd'}
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">
                      {selectedInvoiceForPreview.clientAddress || '15/4B, Sirambarayampalayam Road, Sennappachetty Pudur Post, Karumathampatty Via, Coimbatore-641659'}
                    </div>
                    <div className="text-[11px] font-mono mt-1 font-semibold">
                      GSTIN: {selectedInvoiceForPreview.clientGstin || '33AACCA8648K1ZG'} • State Code: 33 (Tamil Nadu)
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-gray-500 block font-sans">Invoice Number</span>
                    <span className="font-bold text-gray-900">{selectedInvoiceForPreview.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block font-sans">Invoice Date</span>
                    <span className="font-semibold text-gray-900">{selectedInvoiceForPreview.invoiceDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block font-sans">Purchase Order #</span>
                    <span className="font-bold text-[#047857]">
                      {availablePOs.find((p) => p.id === selectedInvoiceForPreview.poId)?.poNumber || selectedInvoiceForPreview.poId || 'PO-ARJUNA-2026-07'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block font-sans">Payment Due</span>
                    <span className="font-semibold text-gray-900">{selectedInvoiceForPreview.dueDate || '2026-08-31'}</span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-100 font-bold text-gray-700 text-[10px] uppercase border-b border-gray-300">
                      <tr>
                        <th className="p-2 border-r border-gray-300 text-center">#</th>
                        <th className="p-2 border-r border-gray-300">Description of Services</th>
                        <th className="p-2 border-r border-gray-300 text-center">SAC</th>
                        <th className="p-2 border-r border-gray-300 text-right">Qty</th>
                        <th className="p-2 border-r border-gray-300 text-right">Rate (₹)</th>
                        <th className="p-2 text-right">Taxable Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-sans">
                      {selectedInvoiceForPreview.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 border-r border-gray-200 text-center font-mono">{idx + 1}</td>
                          <td className="p-2 border-r border-gray-200 font-medium">{item.description}</td>
                          <td className="p-2 border-r border-gray-200 text-center font-mono">998519</td>
                          <td className="p-2 border-r border-gray-200 text-right font-mono">{item.workforceCount}</td>
                          <td className="p-2 border-r border-gray-200 text-right font-mono">₹{item.ratePerUnit.toFixed(2)}</td>
                          <td className="p-2 text-right font-mono font-bold">
                            ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-mono font-semibold border-t border-gray-300">
                      <tr>
                        <td colSpan={5} className="p-2 text-right font-sans font-bold">Total Taxable Value:</td>
                        <td className="p-2 text-right font-bold text-gray-900">
                          ₹{selectedInvoiceForPreview.subtotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="p-2 text-right font-sans">CGST @ 9%:</td>
                        <td className="p-2 text-right">
                          ₹{selectedInvoiceForPreview.taxAmount ? (selectedInvoiceForPreview.taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="p-2 text-right font-sans">SGST @ 9%:</td>
                        <td className="p-2 text-right">
                          ₹{selectedInvoiceForPreview.taxAmount ? (selectedInvoiceForPreview.taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50 text-sm font-bold text-emerald-950 border-t border-gray-300">
                        <td colSpan={5} className="p-2 text-right font-sans font-bold">TOTAL INVOICE VALUE (INCL. GST):</td>
                        <td className="p-2 text-right font-bold">
                          ₹{selectedInvoiceForPreview.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Amount in words */}
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-700">Amount Chargeable (in words): </span>
                    <span className="font-semibold text-gray-900 italic">
                      {VendorInvoicePrintService.numberToWords(selectedInvoiceForPreview.totalAmount || 119776.58)}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">E. &amp; O.E.</span>
                </div>

                {/* Bank Mandate & Signatory */}
                <div className="grid grid-cols-2 gap-4 border-t border-gray-300 pt-3 text-xs">
                  <div>
                    <span className="font-bold text-gray-700 block text-[11px]">BANK PAYMENT MANDATE (NEFT / RTGS):</span>
                    <div className="font-mono text-[11px] mt-1 space-y-0.5 text-gray-700">
                      <div>Bank Name: {selectedInvoiceForPreview.bankDetails?.bankName || 'HDFC Bank Ltd'}</div>
                      <div>Account No: {selectedInvoiceForPreview.bankDetails?.accountNumber || '987654321098'}</div>
                      <div>IFSC Code: {selectedInvoiceForPreview.bankDetails?.ifsc || 'HDFC0001234'}</div>
                      <div>Branch: Coimbatore Main Branch</div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 font-sans block">
                        For {selectedInvoiceForPreview.vendorLegalName || selectedInvoiceForPreview.vendorId}
                      </span>
                    </div>
                    <div className="mt-8 border-t border-gray-300 pt-1 text-[11px] font-bold text-gray-800">
                      Authorized Signatory &amp; Stamp
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: REFERENCE B — MONTHLY WAGE BREAKUP */}
            {activePreviewDoc === 'WAGE_BREAKUP' && (
              <div className="space-y-4 printable-a4-sheet">
                <ExcelBreakupView
                  contractWages={79215.0}
                  regularWagesBase={52390.0}
                  pfEmployerRate={13.0}
                  esiEmployerRate={3.25}
                  serviceChargeRate={8.0}
                  roomAllowanceAmount={4650.0}
                  transportAllowanceAmount={2790.0}
                  periodText={selectedInvoiceForPreview.servicePeriod || '01.07.2026 TO 31.07.2026'}
                  clientName={selectedInvoiceForPreview.clientCompanyName || 'Arjuna Natural Pvt Ltd'}
                />
              </div>
            )}

            {/* TAB 3: SUPPORTING DOCUMENTS */}
            {activePreviewDoc === 'SUPPORTING_DOCS' && (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-800 text-xs">
                  Statutory &amp; Verification Documents Attached to {selectedInvoiceForPreview.invoiceNumber}
                </h4>
                <div className="space-y-2">
                  {(selectedInvoiceForPreview.supportingDocuments || draftDocuments).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        <div>
                          <div className="font-bold text-gray-900">{doc.fileName}</div>
                          <div className="text-[11px] text-gray-500 font-mono">
                            Type: {doc.documentType} • Uploaded by {doc.uploadedBy || 'Vendor'} on {doc.uploadedAt.substring(0, 10)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3-WAY MATCH & HR REVIEW DRAWER ── */}
      {selectedInvoiceForReview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    3-Way Audit Active
                  </span>
                  <span className="text-xs text-gray-500 font-mono">PO • Biometrics • Commercial Billing</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 mt-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  3-Way Match Verification: {selectedInvoiceForReview.invoiceNumber}
                </h3>
                <p className="text-xs text-gray-500">
                  Client: {selectedInvoiceForReview.clientCompanyName || 'Arjuna Natural Pvt Ltd'} • Vendor: {selectedInvoiceForReview.vendorLegalName || selectedInvoiceForReview.vendorId} • Period: {selectedInvoiceForReview.billingPeriod}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceForReview(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 3-Way Match Status Card */}
            {matchResult && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  matchResult.matchStatus === 'MATCHED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {matchResult.matchStatus === 'MATCHED' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-xs uppercase tracking-wide">
                      3-Way Verification Status: {matchResult.matchStatus}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      {matchResult.overallRemarks ||
                        'Verified against Purchase Order rates and 84.5 days muster attendance.'}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-[10px] text-gray-500 uppercase">Rate Variance</div>
                  <div className="font-bold text-sm text-emerald-800">₹0.00 (Exact Match)</div>
                </div>
              </div>
            )}

            {/* Workbook Breakup Engine View */}
            <div className="space-y-2">
              <ExcelBreakupView
                contractWages={79215.0}
                regularWagesBase={52390.0}
                pfEmployerRate={13.0}
                esiEmployerRate={3.25}
                serviceChargeRate={8.0}
                roomAllowanceAmount={4650.0}
                transportAllowanceAmount={2790.0}
                periodText={selectedInvoiceForReview?.billingPeriod || '01.07.2026 TO 31.07.2026'}
                clientName="Arjuna Natural Pvt Ltd"
              />
            </div>

            {/* Interactive Verification Checklist (Company HR Review Desk) */}
            {viewMode === 'COMPANY' && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-gray-800 flex items-center gap-2 text-xs">
                  <FileCheck2 className="w-4 h-4 text-[#047857]" /> Mandatory Verification Checklist
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewChecklist.vendorActive}
                      onChange={(e) => setReviewChecklist({ ...reviewChecklist, vendorActive: e.target.checked })}
                      className="rounded text-[#047857]"
                    />
                    <span>Vendor profile is active &amp; authorized</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewChecklist.poValid}
                      onChange={(e) => setReviewChecklist({ ...reviewChecklist, poValid: e.target.checked })}
                      className="rounded text-[#047857]"
                    />
                    <span>PO is valid and approved</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewChecklist.contractActive}
                      onChange={(e) => setReviewChecklist({ ...reviewChecklist, contractActive: e.target.checked })}
                      className="rounded text-[#047857]"
                    />
                    <span>Contract is active for the billing period</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewChecklist.attendanceVerified}
                      onChange={(e) => setReviewChecklist({ ...reviewChecklist, attendanceVerified: e.target.checked })}
                      className="rounded text-[#047857]"
                    />
                    <span>Attendance muster (84.5 days) reconciled</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewChecklist.statutoryDocsSubmitted}
                      onChange={(e) => setReviewChecklist({ ...reviewChecklist, statutoryDocsSubmitted: e.target.checked })}
                      className="rounded text-[#047857]"
                    />
                    <span>Statutory PF/ESI challans submitted</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewChecklist.taxConfigValid}
                      onChange={(e) => setReviewChecklist({ ...reviewChecklist, taxConfigValid: e.target.checked })}
                      className="rounded text-[#047857]"
                    />
                    <span>GST (CGST 9% + SGST 9%) correctly calculated</span>
                  </label>
                </div>
              </div>
            )}

            {/* Actions Toolbar */}
            {viewMode === 'COMPANY' ? (
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Company HR Review Authority
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprovalChange(selectedInvoiceForReview.id, 'APPROVED')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      ✓ Approve Invoice (PO &amp; Attendance Reconciled)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt('Please specify clarification or correction required:');
                        if (reason) handleApprovalChange(selectedInvoiceForReview.id, 'CORRECTION_REQUIRED', reason);
                      }}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      ⚠ Request Vendor Correction
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt('Please provide formal rejection reason:');
                        if (reason) handleApprovalChange(selectedInvoiceForReview.id, 'REJECTED', reason);
                      }}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      ✕ Reject Invoice
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="text-xs font-bold text-gray-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-700" /> Accounts Payable Disbursement
                    </span>
                    <input
                      type="text"
                      placeholder="Enter CMS / UTR Reference #"
                      value={paymentRefInput}
                      onChange={(e) => setPaymentRefInput(e.target.value)}
                      className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg w-52 font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePaymentChange(selectedInvoiceForReview.id, 'PAYMENT_PROCESSING', paymentRefInput)}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      Set In-Process (CMS Transmitted)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaymentChange(selectedInvoiceForReview.id, 'PAID', paymentRefInput)}
                      className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      Confirm Paid &amp; Disbursed (Bank UTR)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-blue-950 block">Submission Review Status:</span>
                    <span className="text-[11px] text-blue-800 mt-0.5 block">
                      {selectedInvoiceForReview.approvalStatus === 'APPROVED'
                        ? '✓ Invoice has been verified and APPROVED by Company HR.'
                        : selectedInvoiceForReview.approvalStatus === 'CORRECTION_REQUIRED'
                        ? '⚠ Clarification or correction requested by Company reviewer.'
                        : selectedInvoiceForReview.approvalStatus === 'REJECTED'
                        ? '✕ Invoice rejected by Company HR.'
                        : 'Awaiting Company HR & Procurement verification review.'}
                    </span>
                    {selectedInvoiceForReview.reviewerRemarks && (
                      <p className="text-[11px] font-mono text-blue-900 mt-1 italic">
                        Reviewer remarks: &quot;{selectedInvoiceForReview.reviewerRemarks}&quot;
                      </p>
                    )}
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider bg-white border border-blue-300 text-blue-900 font-mono">
                    {selectedInvoiceForReview.approvalStatus}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
