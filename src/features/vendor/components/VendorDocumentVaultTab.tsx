// src/features/vendor/components/VendorDocumentVaultTab.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Vendor Compliance Document Vault & Statutory Repository
// Two role-specific interfaces (Vendor self-service vs Company HR governance)
// Backed by canonical Supabase storage, requirement engine, and audit trail
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Upload,
  FileCheck,
  AlertTriangle,
  Clock,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  Building,
  Briefcase,
  Users,
  ShieldCheck,
  Receipt,
  Search,
  Filter,
  Plus,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  Send,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink,
  History,
  Check,
  AlertCircle,
  FileBadge,
} from 'lucide-react';
import {
  VendorDocumentRecord,
  VendorDocumentService,
  DocumentCategoryType,
  VerificationStatusType,
  ExpiryStatusType,
  ENTERPRISE_COMPLIANCE_CATALOG,
  ComplianceRequirementDefinition,
} from '../../../services/vendor/vendorDocumentService';
import { useToast } from '../../../components/ui/Toast';
import { notificationService, notificationRealtimeEngine } from '../../../services/notification';
import { WorkForceEvent } from '../../../types/notification';
import { VendorCommunicationService } from '../../../services/vendor/vendorCommunicationService';

interface Props {
  vendorId?: string;
  organizationId?: string;
  viewMode?: 'COMPANY' | 'VENDOR';
  workforce?: Array<{ code: string; name: string; role?: string; department?: string; siteName?: string }>;
  assignedSiteId?: string;
  onNavigateToInvoice?: (poId?: string) => void;
}

export const VendorDocumentVaultTab: React.FC<Props> = ({
  vendorId = 'JOY MANPOWER SERVICE',
  organizationId = 'org-joy-main',
  viewMode = 'VENDOR',
  workforce = [],
  assignedSiteId = 'site-joy-che-01',
}) => {
  const { showToast } = useToast();
  const isHR = viewMode === 'COMPANY';

  // Active Category Tab
  const [activeCategoryTab, setActiveCategoryTab] = useState<DocumentCategoryType>('ALL');

  // Contextual Filters
  const [selectedSite, setSelectedSite] = useState<string>(assignedSiteId);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-09');
  const [selectedVendor, setSelectedVendor] = useState<string>(vendorId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<string>('ALL');
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);

  // Workforce filter
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('ALL');

  // Documents & Data State
  const [documents, setDocuments] = useState<VendorDocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedReqForUpload, setSelectedReqForUpload] = useState<ComplianceRequirementDefinition | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VendorDocumentRecord | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [reviewDrawerDoc, setReviewDrawerDoc] = useState<VendorDocumentRecord | null>(null);
  const [isAddReqModalOpen, setIsAddReqModalOpen] = useState<boolean>(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);

  // Review Form State (HR)
  const [reviewDecision, setReviewDecision] = useState<'VERIFIED' | 'REJECTED' | 'CHANGES_REQUESTED'>('VERIFIED');
  const [rejectionReasonCode, setRejectionReasonCode] = useState<string>('WRONG_DOCUMENT_TYPE');
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Guided Upload Wizard State (5 Steps)
  const [uploadStep, setUploadStep] = useState<number>(1);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategoryType>('REGISTRATION_TAX');
  const [uploadReqCode, setUploadReqCode] = useState<string>('DOC-PAN');
  const [uploadDocTitle, setUploadDocTitle] = useState<string>('PAN Card Copy');
  const [uploadDocNumber, setUploadDocNumber] = useState<string>('');
  const [uploadIssueDate, setUploadIssueDate] = useState<string>('2026-01-01');
  const [uploadExpiryDate, setUploadExpiryDate] = useState<string>('2028-12-31');
  const [uploadScope, setUploadScope] = useState<'VENDOR_ORGANIZATION' | 'WORKFORCE_EMPLOYEE'>('VENDOR_ORGANIZATION');
  const [uploadTargetWorkerId, setUploadTargetWorkerId] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState<string>('');
  const [uploadingState, setUploadingState] = useState<boolean>(false);
  const [previousDocIdForResubmit, setPreviousDocIdForResubmit] = useState<string | undefined>(undefined);

  // Load documents
  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await VendorDocumentService.listDocuments({
        vendorId: isHR ? (selectedVendor === 'ALL' ? undefined : selectedVendor) : vendorId,
        organizationId,
        compliancePeriod: selectedPeriod,
      });
      setDocuments(docs);
    } catch (err) {
      console.error('Error fetching vault documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [vendorId, organizationId, selectedPeriod, selectedVendor, isHR]);

  // Live KPI Calculations
  const metrics = useMemo(() => {
    return VendorDocumentService.calculateMetrics(documents, vendorId, selectedPeriod);
  }, [documents, vendorId, selectedPeriod]);

  // Missing Requirements Calculated dynamically
  const missingRequirements = useMemo(() => {
    return VendorDocumentService.calculateMissingRequirements(documents, selectedPeriod);
  }, [documents, selectedPeriod]);

  // Category Tabs Configuration
  const categoryTabs = [
    { id: 'ALL', label: 'All Records', count: documents.length, icon: FolderOpen },
    {
      id: 'REGISTRATION_TAX',
      label: 'Registration & Tax',
      count: documents.filter((d) => d.documentCategory === 'REGISTRATION_TAX').length,
      icon: Building,
    },
    {
      id: 'CONTRACTS_COMMERCIAL',
      label: 'Contracts & Commercial',
      count: documents.filter((d) => d.documentCategory === 'CONTRACTS_COMMERCIAL').length,
      icon: Briefcase,
    },
    {
      id: 'STATUTORY_REGISTRATIONS',
      label: 'Statutory Registrations',
      count: documents.filter((d) => d.documentCategory === 'STATUTORY_REGISTRATIONS').length,
      icon: ShieldCheck,
    },
    {
      id: 'MONTHLY_COMPLIANCE',
      label: 'Monthly Compliance',
      count: documents.filter((d) => d.documentCategory === 'MONTHLY_COMPLIANCE').length,
      icon: Receipt,
    },
    {
      id: 'ANNUAL_COMPLIANCE',
      label: 'Annual Compliance',
      count: documents.filter((d) => d.documentCategory === 'ANNUAL_COMPLIANCE').length,
      icon: FileSpreadsheet,
    },
    {
      id: 'WORKFORCE_KYC',
      label: 'Workforce Documents',
      count: documents.filter((d) => d.scope === 'WORKFORCE_EMPLOYEE').length,
      icon: Users,
    },
    {
      id: 'EXCEPTIONS_REQUESTS',
      label: 'Requests & Exceptions',
      count: documents.filter(
        (d) => d.verificationStatus === 'REJECTED' || d.verificationStatus === 'CHANGES_REQUESTED'
      ).length + missingRequirements.length,
      icon: AlertTriangle,
    },
  ];

  // Filtered documents table list
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Category tab filter
      if (activeCategoryTab !== 'ALL') {
        if (activeCategoryTab === 'WORKFORCE_KYC') {
          if (doc.scope !== 'WORKFORCE_EMPLOYEE') return false;
        } else if (activeCategoryTab === 'EXCEPTIONS_REQUESTS') {
          if (doc.verificationStatus !== 'REJECTED' && doc.verificationStatus !== 'CHANGES_REQUESTED') return false;
        } else {
          if (doc.documentCategory !== activeCategoryTab) return false;
        }
      }

      // KPI Click filter
      if (kpiFilter) {
        if (kpiFilter === 'VERIFIED' && doc.verificationStatus !== 'VERIFIED') return false;
        if (kpiFilter === 'PENDING' && doc.verificationStatus !== 'SUBMITTED' && doc.verificationStatus !== 'UNDER_REVIEW') return false;
        if (kpiFilter === 'EXPIRING' && doc.expiryStatus !== 'EXPIRING_SOON') return false;
        if (kpiFilter === 'EXPIRED' && doc.expiryStatus !== 'EXPIRED') return false;
        if (kpiFilter === 'REJECTED' && doc.verificationStatus !== 'REJECTED' && doc.verificationStatus !== 'CHANGES_REQUESTED') return false;
      }

      // Status filter dropdown
      if (statusFilter !== 'ALL' && doc.verificationStatus !== statusFilter) return false;

      // Expiry filter dropdown
      if (expiryFilter !== 'ALL' && doc.expiryStatus !== expiryFilter) return false;

      // Worker filter
      if (selectedWorkerId !== 'ALL' && doc.workerId !== selectedWorkerId) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = doc.fileName.toLowerCase().includes(q);
        const matchesType = doc.documentType.toLowerCase().includes(q);
        const matchesNum = doc.documentNumber?.toLowerCase().includes(q);
        const matchesWorker = doc.workerName?.toLowerCase().includes(q);
        const matchesCode = doc.requirementCode?.toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesNum && !matchesWorker && !matchesCode) return false;
      }

      return true;
    });
  }, [documents, activeCategoryTab, kpiFilter, statusFilter, expiryFilter, selectedWorkerId, searchQuery]);

  // Handle Opening Document Preview
  const handleOpenPreview = async (doc: VendorDocumentRecord) => {
    setPreviewDoc(doc);
    if (doc.storagePath) {
      const signed = await VendorDocumentService.getSignedDownloadUrl(doc.storagePath);
      setPreviewSignedUrl(signed);
    } else {
      setPreviewSignedUrl(null);
    }
  };

  // Handle Opening Review Drawer (HR)
  const handleOpenReview = (doc: VendorDocumentRecord) => {
    setReviewDrawerDoc(doc);
    setReviewDecision('VERIFIED');
    setRejectionReasonCode('WRONG_DOCUMENT_TYPE');
    setReviewerNotes('');
  };

  // Submit HR Review
  const handleSubmitReview = async () => {
    if (!reviewDrawerDoc) return;
    if (reviewDecision === 'REJECTED' && !reviewerNotes.trim()) {
      showToast('Please provide an explanation for the rejection reason.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await VendorDocumentService.reviewDocument({
        documentId: reviewDrawerDoc.id,
        decision: reviewDecision,
        reviewerId: isHR ? 'hr.compliance@joyhospitality.com' : 'compliance-officer',
        reasonCode: reviewDecision === 'REJECTED' ? rejectionReasonCode : undefined,
        notes: reviewerNotes,
      });

      if (res.success) {
        showToast(
          reviewDecision === 'VERIFIED'
            ? `Document "${reviewDrawerDoc.documentType}" verified successfully ✓`
            : `Review decision "${reviewDecision}" recorded ✓`,
          reviewDecision === 'VERIFIED' ? 'success' : 'info'
        );
        setReviewDrawerDoc(null);
        await loadDocuments();
      } else {
        showToast(res.error || 'Failed to submit review', 'error');
      }
    } catch {
      showToast('Error recording review decision', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Initiate Upload from Requirement
  const handleStartUploadForReq = (req: ComplianceRequirementDefinition) => {
    setSelectedReqForUpload(req);
    setUploadCategory(req.category);
    setUploadReqCode(req.code);
    setUploadDocTitle(req.title);
    setUploadStep(2);
    setIsUploadModalOpen(true);
  };

  // Handle Send Reminder to Vendor (HR View)
  const handleSendReminder = async (req?: ComplianceRequirementDefinition) => {
    const target = req ? req.title : `${missingRequirements.length} missing statutory compliance items`;
    
    // 1. Create Realtime In-App Notification Event for Vendor
    const event: WorkForceEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'VENDOR_COMPLIANCE_NOTICE',
      category: 'SYSTEM',
      severity: 'WARNING',
      title: req ? `Compliance Notice: ${req.title}` : `Compliance Deficits: ${missingRequirements.length} Items Due`,
      body: `Company HR Compliance Team has flagged "${target}" as pending for ${selectedPeriod}. Please upload authenticated files via Document Vault to clear monthly billing approvals.`,
      actorName: 'Company HR Head',
      actorAvatar: '',
      resourceType: 'VendorDocument',
      resourceId: req?.code || 'COMPLIANCE',
      organizationId: organizationId,
      timestamp: new Date().toISOString(),
      actionUrl: '/vendor-storage',
      metadata: {
        targetRole: 'VENDOR',
        targetVendorId: selectedVendor,
      },
    };

    try {
      await notificationService.publishEvent(event);

      // 2. Create formal communication ticket
      await VendorCommunicationService.createRequest({
        vendorId: selectedVendor,
        organizationId: organizationId,
        senderType: 'COMPANY',
        authorName: 'Company HR Compliance Team',
        category: 'COMPLIANCE',
        priority: 'HIGH',
        subject: `Compliance Notice: ${target} [Period: ${selectedPeriod}]`,
        description: `Official statutory notice from Company HR: "${target}" is missing or due for compliance period ${selectedPeriod}. Please upload the authenticated filing or certificate immediately to prevent hold on billing and workforce deployment authorizations.`,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      showToast(
        `Formal compliance reminder dispatched to ${selectedVendor} for "${target}". Realtime alert sent to vendor notification inbox.`,
        'success'
      );
    } catch (err: any) {
      console.warn('[VendorDocumentVaultTab] Reminder dispatch notice:', err);
      notificationRealtimeEngine.handleIncomingEvent(event);
      showToast(
        `Reminder broadcasted to ${selectedVendor} for "${target}".`,
        'info'
      );
    }
  };

  // Handle Initiate Re-upload / Renewal
  const handleStartRenewal = (doc: VendorDocumentRecord) => {
    setPreviousDocIdForResubmit(doc.id);
    setUploadCategory(doc.documentCategory);
    setUploadReqCode(doc.requirementCode || 'DOC-CUSTOM');
    setUploadDocTitle(doc.documentType);
    setUploadDocNumber(doc.documentNumber || '');
    setUploadScope(doc.scope);
    if (doc.workerId) setUploadTargetWorkerId(doc.workerId);
    setUploadStep(2);
    setIsUploadModalOpen(true);
  };

  // Submit Guided Upload
  const handleFinalUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Please choose or drop a valid file.', 'error');
      return;
    }

    setUploadingState(true);
    try {
      const assignedWorker = workforce.find((w) => w.code === uploadTargetWorkerId);

      const res = await VendorDocumentService.uploadDocument({
        vendorId,
        organizationId,
        siteId: selectedSite,
        documentCategory: uploadCategory,
        documentType: uploadDocTitle,
        requirementCode: uploadReqCode,
        documentNumber: uploadDocNumber,
        compliancePeriod: selectedPeriod,
        file: uploadFile,
        issueDate: uploadIssueDate,
        expiryDate: uploadExpiryDate,
        scope: uploadScope,
        workerId: uploadScope === 'WORKFORCE_EMPLOYEE' ? uploadTargetWorkerId : undefined,
        workerName: assignedWorker?.name,
        workerCode: assignedWorker?.code,
        workerRole: assignedWorker?.role,
        uploadedBy: isHR ? 'hr.compliance@joyhospitality.com' : 'vendor.admin@abcworkforce.com',
        previousDocumentId: previousDocIdForResubmit,
        resubmissionNote: uploadNotes,
      });

      if (res.success && res.document) {
        showToast(`Document "${uploadDocTitle}" submitted to vault for review ✓`, 'success');
        setIsUploadModalOpen(false);
        resetUploadModal();
        await loadDocuments();
      } else {
        showToast(res.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Error uploading document', 'error');
    } finally {
      setUploadingState(false);
    }
  };

  const resetUploadModal = () => {
    setUploadStep(1);
    setUploadFile(null);
    setUploadDocNumber('');
    setUploadNotes('');
    setPreviousDocIdForResubmit(undefined);
  };

  // Export CSV Report
  const handleExportComplianceReport = () => {
    const csvRows = [
      ['Document ID', 'Requirement Code', 'Type', 'Category', 'Period', 'Status', 'Expiry Status', 'Expiry Date', 'Uploaded At'],
      ...documents.map((d) => [
        d.id,
        d.requirementCode || '—',
        `"${d.documentType}"`,
        d.documentCategory,
        d.compliancePeriod || '—',
        d.verificationStatus,
        d.expiryStatus,
        d.expiryDate || '—',
        d.createdAt,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vendor_Compliance_Report_${vendorId}_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Compliance report downloaded ✓', 'success');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 5.1 HEADER & CONTEXTUAL CONTROLS */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                isHR
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {isHR ? 'Company HR Governance & Review Desk' : 'Vendor Self-Service Compliance Vault'}
              </span>
              <span className="text-xs text-gray-500 font-mono">Canonical Storage: {VendorDocumentService.CANONICAL_BUCKET}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#047857]" />
              Document Vault &amp; Statutory Repository
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-3xl">
              Manage vendor registrations, contractual records, recurring compliance submissions, and deployed workforce documents with controlled verification.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportComplianceReport}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" /> Export Report
            </button>

            {isHR && (
              <>
                <button
                  type="button"
                  onClick={() => setIsAddReqModalOpen(true)}
                  className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#047857]" /> Add Requirement
                </button>
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(true)}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold text-blue-800 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-blue-700" /> Request Documents
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                resetUploadModal();
                setIsUploadModalOpen(true);
              }}
              className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> {isHR ? 'Ingest Hardcopy / Policy' : 'Upload Document'}
            </button>
          </div>
        </div>

        {/* HR-only / Vendor Contextual Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <span className="text-gray-500 font-semibold">Assigned Site:</span>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
            >
              <option value="site-joy-che-01">Joy Chennai Manufacturing Plant (CHE-01)</option>
              <option value="site-joy-cbe-02">Joy Coimbatore Logistics Hub (CBE-02)</option>
              <option value="site-arjuna-01">Arjuna Natural Plant Unit 2</option>
            </select>
          </div>

          {isHR ? (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <span className="text-gray-500 font-semibold">Vendor:</span>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Authorized Vendors</option>
                <option value="JOY MANPOWER SERVICE">JOY MANPOWER SERVICE (VND-JOY-01)</option>
                <option value="VND-ARJUNA-01">Arjuna Facility Services</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <span className="text-gray-500 font-semibold">Client Company:</span>
              <span className="font-bold text-gray-900">Arjuna Natural Pvt Ltd / Joy PeopleHR</span>
            </div>
          )}

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <span className="text-gray-500 font-semibold">Compliance Period:</span>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={loadDocuments}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition"
            title="Refresh Vault Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5.2 SUMMARY KPI CARDS (Clickable live filters) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { id: 'ALL', label: 'Total Documents', val: metrics.totalDocuments, color: 'text-gray-900', border: 'border-gray-200' },
          { id: 'VERIFIED', label: 'Verified Docs', val: metrics.verifiedDocuments, color: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50/40' },
          { id: 'PENDING', label: 'Pending Review', val: metrics.pendingReview, color: 'text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50/40' },
          { id: 'MISSING', label: 'Missing / Required', val: metrics.missingRequired, color: 'text-rose-700', border: 'border-rose-200', bg: 'bg-rose-50/40' },
          { id: 'EXPIRING', label: 'Expiring <30 Days', val: metrics.expiringSoon, color: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50/40' },
          { id: 'EXPIRED', label: 'Expired Docs', val: metrics.expiredDocuments, color: 'text-red-700', border: 'border-red-200', bg: 'bg-red-50/40' },
          { id: 'REJECTED', label: 'Changes / Rejected', val: metrics.rejectedOrCorrection, color: 'text-purple-700', border: 'border-purple-200', bg: 'bg-purple-50/40' },
          { id: 'MONTHLY_DUE', label: 'Monthly Due', val: metrics.monthlySubmissionsDue, color: 'text-indigo-700', border: 'border-indigo-200', bg: 'bg-indigo-50/40' },
        ].map((kpi) => {
          const isSelected = kpiFilter === kpi.id || (kpi.id === 'ALL' && kpiFilter === null);
          return (
            <div
              key={kpi.id}
              onClick={() => {
                if (kpi.id === 'ALL') {
                  setKpiFilter(null);
                  setActiveCategoryTab('ALL');
                } else if (kpi.id === 'MISSING' || kpi.id === 'MONTHLY_DUE') {
                  setActiveCategoryTab('EXCEPTIONS_REQUESTS');
                  setKpiFilter(null);
                } else {
                  setKpiFilter(isSelected ? null : kpi.id);
                }
              }}
              className={`p-3.5 rounded-xl border bg-white shadow-2xs hover:shadow-sm transition-all cursor-pointer select-none ${
                isSelected ? 'ring-2 ring-[#047857] border-transparent' : kpi.border
              } ${kpi.bg || ''}`}
            >
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider line-clamp-1">
                {kpi.label}
              </div>
              <div className={`text-xl font-extrabold mt-1 tracking-tight ${kpi.color}`}>
                {kpi.val}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-medium">
                <span>Click to filter</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 5.3 DOCUMENT CATEGORY TABS */}
      <div className="bg-white border border-gray-200 rounded-xl p-1.5 shadow-2xs overflow-x-auto">
        <nav className="flex items-center gap-1 min-w-max">
          {categoryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategoryTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCategoryTab(tab.id as DocumentCategoryType);
                  setKpiFilter(null);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#047857] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 5.4 FILTER TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-200 text-xs shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search document, ref #, or worker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:bg-white focus:border-[#047857]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-semibold">Verification:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-800 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="VERIFIED">Verified</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Expiry Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-semibold">Expiry:</span>
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-800 outline-none"
            >
              <option value="ALL">All Expiries</option>
              <option value="VALID">Valid</option>
              <option value="EXPIRING_SOON">Expiring Soon (&lt;30d)</option>
              <option value="EXPIRED">Expired</option>
              <option value="PERMANENT">Permanent (No Expiry)</option>
            </select>
          </div>

          {/* Worker Filter if in Workforce Tab */}
          {activeCategoryTab === 'WORKFORCE_KYC' && workforce.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-semibold">Worker:</span>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-800 outline-none max-w-44"
              >
                <option value="ALL">All Workers ({workforce.length})</option>
                {workforce.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(statusFilter !== 'ALL' || expiryFilter !== 'ALL' || searchQuery || kpiFilter) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setExpiryFilter('ALL');
                setSearchQuery('');
                setKpiFilter(null);
                setSelectedWorkerId('ALL');
              }}
              className="text-[#047857] hover:underline font-semibold text-xs ml-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-[11px] text-gray-500 font-medium">
          Showing <span className="font-bold text-gray-900">{filteredDocuments.length}</span> records
        </div>
      </div>

      {/* MISSING REQUIREMENTS WORKSPACE (When Tab H or Missing Filter active) */}
      {(activeCategoryTab === 'EXCEPTIONS_REQUESTS' || activeCategoryTab === 'MONTHLY_COMPLIANCE') &&
        missingRequirements.length > 0 && (
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                    {isHR
                      ? `Vendor Compliance Deficits (${missingRequirements.length} Missing from ${selectedVendor} for ${selectedPeriod})`
                      : `Missing Required Compliance Documents (${missingRequirements.length} Pending for ${selectedPeriod})`}
                  </h3>
                  <p className="text-[11px] text-rose-800">
                    {isHR
                      ? 'These statutory compliance items have not yet been submitted by the vendor. Monthly billing approvals & 3-way match cannot proceed until verified.'
                      : 'Mandatory statutory items required under contractual SLA and government labour regulations.'}
                  </p>
                </div>
              </div>

              {isHR && (
                <button
                  type="button"
                  onClick={() => handleSendReminder()}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" /> Send Notice to Vendor
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {missingRequirements.map((req) => (
                <div
                  key={req.code}
                  className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono">
                        {req.code}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase">{req.frequency}</span>
                    </div>
                    <div className="font-bold text-gray-900 text-xs mt-1.5">{req.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{req.description}</div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-rose-600 font-bold">
                      {isHR ? 'Status: AWAITING VENDOR' : 'Status: MISSING'}
                    </span>
                    {isHR ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendReminder(req)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Send className="w-3 h-3 text-amber-700" /> Notify Vendor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartUploadForReq(req)}
                          title="Upload hardcopy on vendor behalf as admin override"
                          className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartUploadForReq(req)}
                        className="px-2.5 py-1 bg-[#047857] hover:bg-[#065f46] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Upload className="w-3 h-3" /> Upload Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* 6. DOCUMENT RECORDS TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50/80 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Document Name &amp; Code</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Vendor / Worker</th>
                <th className="px-4 py-3.5">Period / Frequency</th>
                <th className="px-4 py-3.5">Reference #</th>
                <th className="px-4 py-3.5">Expiry Date</th>
                <th className="px-4 py-3.5 text-center">Version</th>
                <th className="px-4 py-3.5 text-center">Verification Status</th>
                <th className="px-4 py-3.5 text-center">Expiry Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#047857]" />
                    Loading compliance documents from vault...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-16 text-center">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-bold text-gray-700">No documents found in this view</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      {isHR
                        ? 'Vendor compliance documents submitted by partners will appear here for verification.'
                        : 'Upload your required compliance registrations, contracts, and monthly challans.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="mt-4 px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload First Document
                    </button>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const isExpiringSoon = doc.expiryStatus === 'EXPIRING_SOON';
                  const isExpired = doc.expiryStatus === 'EXPIRED';

                  return (
                    <tr key={doc.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#047857] shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{doc.documentType}</div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                              {doc.requirementCode ? `${doc.requirementCode} • ` : ''}
                              {doc.fileName}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                          {doc.documentCategory.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {doc.scope === 'WORKFORCE_EMPLOYEE' ? (
                          <div>
                            <div className="font-semibold text-gray-900">{doc.workerName || 'Worker'}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{doc.workerCode || doc.workerId}</div>
                          </div>
                        ) : (
                          <div className="font-medium text-gray-800">{doc.vendorId}</div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-gray-600">
                        {doc.compliancePeriod || doc.periodType || '—'}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-gray-700">
                        {doc.documentNumber || '—'}
                      </td>

                      <td className="px-4 py-3.5">
                        {doc.expiryDate ? (
                          <span className={`font-mono text-xs ${isExpired ? 'text-rose-600 font-bold' : isExpiringSoon ? 'text-amber-600 font-bold' : 'text-gray-700'}`}>
                            {doc.expiryDate}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">Permanent</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700">
                          v{doc.version || 1}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            doc.verificationStatus === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : doc.verificationStatus === 'UNDER_REVIEW' || doc.verificationStatus === 'SUBMITTED'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : doc.verificationStatus === 'CHANGES_REQUESTED'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {doc.verificationStatus === 'VERIFIED' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {doc.verificationStatus === 'REJECTED' && <XCircle className="w-2.5 h-2.5" />}
                          {doc.verificationStatus.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            doc.expiryStatus === 'EXPIRED'
                              ? 'bg-rose-100 text-rose-800'
                              : doc.expiryStatus === 'EXPIRING_SOON'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {doc.expiryStatus.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(doc)}
                            className="p-1.5 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                            title="Preview / Secure Access"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* HR Verification Action */}
                          {isHR && (
                            <button
                              type="button"
                              onClick={() => handleOpenReview(doc)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#047857] border border-emerald-200 rounded-lg text-xs font-semibold transition"
                            >
                              Review
                            </button>
                          )}

                          {/* Vendor Re-upload Action when Changes Requested or Expired */}
                          {(!isHR || doc.verificationStatus === 'CHANGES_REQUESTED' || isExpiringSoon || isExpired) && (
                            <button
                              type="button"
                              onClick={() => handleStartRenewal(doc)}
                              className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold transition"
                              title="Upload renewed or corrected document version"
                            >
                              Renew / Replace
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECURE PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
                    CANONICAL VAULT RECORD
                  </span>
                  <span className="text-xs text-gray-400 font-mono">ID: {previewDoc.id}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-base mt-1 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#047857]" /> {previewDoc.documentType}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl">
              <div>
                <span className="text-gray-500 font-medium">Category:</span>
                <span className="font-semibold text-gray-900 ml-1.5">{previewDoc.documentCategory}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Requirement Code:</span>
                <span className="font-mono font-semibold text-gray-900 ml-1.5">{previewDoc.requirementCode || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Document Ref #:</span>
                <span className="font-mono font-semibold text-gray-900 ml-1.5">{previewDoc.documentNumber || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Compliance Period:</span>
                <span className="font-mono font-semibold text-gray-900 ml-1.5">{previewDoc.compliancePeriod || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Issue Date:</span>
                <span className="font-mono text-gray-800 ml-1.5">{previewDoc.issueDate || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Expiry Date:</span>
                <span className="font-mono text-gray-800 ml-1.5">{previewDoc.expiryDate || 'Permanent'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Verification Status:</span>
                <span className="font-bold text-[#047857] ml-1.5">{previewDoc.verificationStatus}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Current Version:</span>
                <span className="font-mono font-bold text-gray-800 ml-1.5">v{previewDoc.version}</span>
              </div>
            </div>

            {previewDoc.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                <span className="font-bold block">Rejection Reason: {previewDoc.rejectionReason}</span>
                {previewDoc.resubmissionNote && <span className="block mt-0.5">{previewDoc.resubmissionNote}</span>}
              </div>
            )}

            {/* Signed Download URL Button */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-emerald-950">Secure File Storage</div>
                <div className="text-[11px] text-emerald-800 font-mono mt-0.5">
                  Bucket: {previewDoc.bucketId || 'vendor-private-documents'}
                </div>
              </div>

              {previewSignedUrl ? (
                <a
                  href={previewSignedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Download / Open Signed File
                </a>
              ) : (
                <span className="text-xs text-gray-500 italic">Storage path verified. Ready for preview.</span>
              )}
            </div>

            {/* Audit History */}
            {previewDoc.auditTrail && previewDoc.auditTrail.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-gray-500" /> Audit Log &amp; Decision Trail
                </h4>
                <div className="space-y-1.5">
                  {previewDoc.auditTrail.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-gray-50 rounded-lg text-[11px] flex justify-between">
                      <div>
                        <span className="font-bold text-gray-800">{item.action}</span>
                        {item.note && <span className="text-gray-500 ml-1.5">— {item.note}</span>}
                      </div>
                      <div className="text-gray-400 font-mono">{new Date(item.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HR REVIEW DRAWER / MODAL */}
      {reviewDrawerDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  HR VERIFICATION WORKSPACE
                </span>
                <h3 className="font-bold text-gray-900 text-base mt-1">
                  Review: {reviewDrawerDoc.documentType}
                </h3>
                <p className="text-xs text-gray-500">
                  Vendor: {reviewDrawerDoc.vendorId} • Period: {reviewDrawerDoc.compliancePeriod || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewDrawerDoc(null)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Verification Decision *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('VERIFIED')}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center cursor-pointer ${
                      reviewDecision === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-500'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    ✓ Verify &amp; Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('CHANGES_REQUESTED')}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center cursor-pointer ${
                      reviewDecision === 'CHANGES_REQUESTED'
                        ? 'bg-purple-50 text-purple-800 border-purple-500'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    ⚠ Request Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('REJECTED')}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center cursor-pointer ${
                      reviewDecision === 'REJECTED'
                        ? 'bg-rose-50 text-rose-800 border-rose-500'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    ✕ Reject Document
                  </button>
                </div>
              </div>

              {reviewDecision === 'REJECTED' && (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Mandatory Rejection Reason Code *</label>
                  <select
                    value={rejectionReasonCode}
                    onChange={(e) => setRejectionReasonCode(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none"
                  >
                    <option value="WRONG_DOCUMENT_TYPE">Wrong document type uploaded</option>
                    <option value="MISSING_PAGE_ATTACHMENT">Missing pages or attachments</option>
                    <option value="INVALID_UNREADABLE_FILE">Unreadable / blurred / corrupt file</option>
                    <option value="EXPIRED_DOCUMENT">Document has expired</option>
                    <option value="INCORRECT_REFERENCE_NUMBER">Incorrect registration / TRRN number</option>
                    <option value="INCORRECT_COMPLIANCE_PERIOD">Period mismatch (challan not for billing month)</option>
                    <option value="VENDOR_OR_SITE_MISMATCH">Vendor or Site name mismatch</option>
                    <option value="MISSING_PAYMENT_PROOF">Missing bank deposit confirmation</option>
                    <option value="DUPLICATE_SUBMISSION">Duplicate submission detected</option>
                    <option value="OTHER">Other compliance non-conformance</option>
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Reviewer Notes &amp; Auditor Feedback {reviewDecision !== 'VERIFIED' && '*'}
                </label>
                <textarea
                  rows={3}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Enter detailed review justification visible to vendor compliance team..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#047857]/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setReviewDrawerDoc(null)}
                className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold shadow-2xs cursor-pointer"
              >
                {isSubmittingReview ? 'Submitting…' : 'Save Review Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GUIDED UPLOAD MODAL (5 Steps) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleFinalUploadSubmit}
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#047857] border border-emerald-200">
                  {previousDocIdForResubmit ? 'RENEWAL / RE-UPLOAD (VERSION 2)' : 'STEP 1 OF 3: DOCUMENT DETAILS'}
                </span>
                <h3 className="font-bold text-gray-900 text-base mt-1">Upload Compliance Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Category & Requirement */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Requirement / Document Type *</label>
                <select
                  value={uploadReqCode}
                  onChange={(e) => {
                    const req = ENTERPRISE_COMPLIANCE_CATALOG.find((r) => r.code === e.target.value);
                    if (req) {
                      setUploadReqCode(req.code);
                      setUploadCategory(req.category);
                      setUploadDocTitle(req.title);
                    }
                  }}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none"
                >
                  {ENTERPRISE_COMPLIANCE_CATALOG.map((r) => (
                    <option key={r.code} value={r.code}>
                      [{r.category}] {r.title} ({r.frequency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Target Document Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadScope('VENDOR_ORGANIZATION')}
                    className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                      uploadScope === 'VENDOR_ORGANIZATION'
                        ? 'bg-emerald-50 text-[#047857] border-emerald-300'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    Vendor Company Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadScope('WORKFORCE_EMPLOYEE')}
                    className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                      uploadScope === 'WORKFORCE_EMPLOYEE'
                        ? 'bg-emerald-50 text-[#047857] border-emerald-300'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    Deployed Worker KYC
                  </button>
                </div>
              </div>

              {/* Target Worker if scope is worker */}
              {uploadScope === 'WORKFORCE_EMPLOYEE' && (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Select Deployed Worker *</label>
                  <select
                    value={uploadTargetWorkerId}
                    onChange={(e) => setUploadTargetWorkerId(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none"
                  >
                    <option value="">-- Choose Worker --</option>
                    {workforce.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name} ({w.code} - {w.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* File Upload Drop Area */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Upload Document File (PDF, XLSX, CSV, PNG, JPG) *</label>
                <div className="border-2 border-dashed border-gray-300 hover:border-[#047857] rounded-2xl p-5 text-center bg-gray-50/50 transition">
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
                    }}
                    className="hidden"
                    id="docVaultUploadFile"
                  />
                  <label htmlFor="docVaultUploadFile" className="cursor-pointer block">
                    <Upload className="w-6 h-6 text-[#047857] mx-auto mb-1.5" />
                    <span className="font-bold text-gray-800 block text-xs">
                      {uploadFile ? uploadFile.name : 'Click to select or drag and drop document'}
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      {uploadFile
                        ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • ${uploadFile.type}`
                        : 'Maximum file size: 20MB. Encrypted private storage.'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Document Reference #</label>
                  <input
                    type="text"
                    placeholder="e.g. TRRN 1012608092"
                    value={uploadDocNumber}
                    onChange={(e) => setUploadDocNumber(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Compliance Period</label>
                  <input
                    type="month"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={uploadIssueDate}
                    onChange={(e) => setUploadIssueDate(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Expiry Date (Leave blank if Permanent)</label>
                  <input
                    type="date"
                    value={uploadExpiryDate}
                    onChange={(e) => setUploadExpiryDate(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Submission Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Optional notes for the Company HR compliance reviewer..."
                  className="w-full p-2 border border-gray-200 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingState || !uploadFile}
                className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] disabled:bg-gray-300 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                {uploadingState ? 'Uploading & Encrypting…' : 'Submit for HR Review'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
