import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  Send,
  Download,
  Eye,
  PenTool,
  ShieldCheck,
  ShieldAlert,
  Share2,
  Lock,
  HardDrive,
  Users,
  Building,
  RefreshCw,
  Layers,
  History,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { documentService } from '../../services/document/documentService';
import { documentSecurityService } from '../../services/document/documentSecurityService';
import { documentSharingService } from '../../services/document/documentSharingService';
import { esignService } from '../../services/document/esignService';
import { documentAuditService } from '../../services/document/documentAuditService';
import { documentVerificationService } from '../../services/document/documentVerificationService';
import { hrEventBus } from '../../services/hrEventBus';
import {
  DocumentMaster,
  DocumentCategory,
  DocumentTypeMaster,
  DocumentSummaryMetrics,
  DocumentSecurityStatus,
  DocumentSubjectType,
  DocumentVerificationStatus,
  DocumentClassification,
  EsignRequest,
  DocumentShare,
  DocumentAuditLog,
} from '../../types';

import { UploadDocumentModal } from './components/UploadDocumentModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { DocumentDetailDrawer } from './components/DocumentDetailDrawer';
import { CreateEsignModal } from './components/CreateEsignModal';
import { ShareDocumentModal } from './components/ShareDocumentModal';

export const DocumentManagementView: React.FC = () => {
  const { showToast } = useToast();

  // Navigation and operational tabs
  const [activeTab, setActiveTab] = useState<
    | 'all_documents'
    | 'my_documents'
    | 'employee_documents'
    | 'vendor_documents'
    | 'verification_queue'
    | 'esign'
    | 'expiring'
    | 'shared'
    | 'audit'
  >('all_documents');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [verifFilter, setVerifFilter] = useState<DocumentVerificationStatus | 'all'>('all');
  const [classFilter, setClassFilter] = useState<DocumentClassification | 'all'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Data states
  const [documents, setDocuments] = useState<DocumentMaster[]>([]);
  const [totalDocsCount, setTotalDocsCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [metrics, setMetrics] = useState<DocumentSummaryMetrics | null>(null);
  const [securityStatus, setSecurityStatus] = useState<DocumentSecurityStatus | null>(null);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [esignRequests, setEsignRequests] = useState<EsignRequest[]>([]);
  const [sharedLinks, setSharedLinks] = useState<DocumentShare[]>([]);
  const [auditLogs, setAuditLogs] = useState<DocumentAuditLog[]>([]);

  // Modals and Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [isEsignModalOpen, setIsEsignModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  const [activeDocument, setActiveDocument] = useState<DocumentMaster | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Load Data
  const loadData = () => {
    try {
      const summary = documentService.getSummaryMetrics();
      setMetrics(summary);

      const sec = documentSecurityService.getSecurityCenterStatus();
      setSecurityStatus(sec);

      const cats = documentService.getCategories();
      setCategories(cats);

      const esigns = esignService.getEsignRequests();
      setEsignRequests(esigns);

      const shares = documentSharingService.getShares();
      setSharedLinks(shares);

      const logs = documentAuditService.getLogs(undefined, 50);
      setAuditLogs(logs);

      // Fetch primary paginated list based on active tab
      const tabFilter = activeTab === 'all_documents' ? undefined : activeTab;
      const res = documentService.getDocuments({
        search: searchQuery,
        categoryCode: categoryFilter,
        verificationStatus: verifFilter,
        classification: classFilter,
        tab: tabFilter,
        page: currentPage,
        limit: 10,
      });

      setDocuments(res.items);
      setTotalDocsCount(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('Error loading documents:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, searchQuery, categoryFilter, verifFilter, classFilter, currentPage]);

  // Realtime Event Bus Subscription
  useEffect(() => {
    const unsubDoc = hrEventBus.subscribe('document.*', () => loadData());
    const unsubEsign = hrEventBus.subscribe('esign.*', () => loadData());
    const unsubShare = hrEventBus.subscribe('share.*', () => loadData());

    return () => {
      unsubDoc();
      unsubEsign();
      unsubShare();
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Document repository synchronized.', 'success');
    }, 400);
  };

  const getVerificationBadge = (status: DocumentVerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return <Badge variant="emerald">VERIFIED</Badge>;
      case 'PENDING_VERIFICATION':
      case 'UPLOADED':
        return <Badge variant="amber">PENDING REVIEW</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="blue">UNDER REVIEW</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">REJECTED</Badge>;
      case 'EXPIRED':
        return <Badge variant="rose">EXPIRED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getClassificationBadge = (cls: DocumentClassification) => {
    switch (cls) {
      case 'restricted':
        return <Badge variant="purple" className="text-[10px]">RESTRICTED</Badge>;
      case 'highly_confidential':
        return <Badge variant="rose" className="text-[10px]">CONFIDENTIAL +</Badge>;
      case 'confidential':
        return <Badge variant="amber" className="text-[10px]">CONFIDENTIAL</Badge>;
      case 'internal':
        return <Badge variant="blue" className="text-[10px]">INTERNAL</Badge>;
      case 'public_internal':
        return <Badge variant="neutral" className="text-[10px]">PUBLIC INTERNAL</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'WorkForceOS', href: '/' },
              { label: 'Documents & E-Signature' },
            ]}
          />
          <h1 className="text-2xl font-black tracking-tight text-gray-900 mt-1">
            Enterprise Document Repository & E-Signature Engine
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Cryptographic storage, subject-scoped RBAC, multi-party e-sign workflows, and compliance audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="text-xs font-bold"
          >
            Sync
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEsignModalOpen(true)}
            leftIcon={<PenTool className="w-3.5 h-3.5 text-[#07563D]" />}
            className="text-xs font-bold border-gray-300 hover:bg-gray-100"
          >
            Create E-Sign
          </Button>

          <Button
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold shadow-sm"
          >
            Ingest Document
          </Button>
        </div>
      </div>

      {/* Live SQL-Backed Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-[#07563D]/40 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Documents</span>
            <FileText className="w-4 h-4 text-[#07563D]" />
          </div>
          <div className="text-2xl font-black text-gray-900">{metrics?.total_documents ?? 0}</div>
          <span className="text-[10px] text-gray-400 font-medium">Across all subjects</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics?.pending_verification ?? 0}</div>
          <span className="text-[10px] text-amber-700/80 font-medium">Verification queue</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-red-400 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expiring in 30d</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600">{metrics?.expiring_in_30_days ?? 0}</div>
          <span className="text-[10px] text-red-600/80 font-medium">Action required</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-emerald-400 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">E-Sign Completed</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics?.esign_completed ?? 0}</div>
          <span className="text-[10px] text-emerald-700/80 font-medium">Signed copies</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-purple-400 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Restricted KYC</span>
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600">{metrics?.restricted_documents ?? 0}</div>
          <span className="text-[10px] text-purple-700/80 font-medium">Enveloped KMS</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-blue-400 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Storage Volume</span>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">{metrics?.total_storage_formatted ?? '0 MB'}</div>
          <span className="text-[10px] text-blue-700/80 font-medium">Encrypted bucket</span>
        </Card>
      </div>

      {/* Technical Security Status Center */}
      <div className="p-3.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="font-bold tracking-wide">Document Security Status Center:</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Private Storage Key
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            TLS 1.3 Transport
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            KMS Envelope Encryption
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Malware Scan Verified
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Immutable Audit Ledger
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Realtime Sync Active
          </span>
        </div>
      </div>

      {/* Main Operational Tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all_documents', label: 'All Documents' },
              { id: 'my_documents', label: 'My Documents' },
              { id: 'employee_documents', label: 'Employee Files' },
              { id: 'vendor_documents', label: 'Vendor & Worker Files' },
              { id: 'verification_queue', label: `Verification Queue (${metrics?.pending_verification ?? 0})` },
              { id: 'esign', label: `E-Signature (${esignRequests.length})` },
              { id: 'expiring', label: `Expiring Soon (${metrics?.expiring_in_30_days ?? 0})` },
              { id: 'shared', label: `Shared Links (${sharedLinks.length})` },
              { id: 'audit', label: 'Audit Trail' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Search & Multi-Filters Strip (for document tables) */}
        {(activeTab === 'all_documents' ||
          activeTab === 'my_documents' ||
          activeTab === 'employee_documents' ||
          activeTab === 'vendor_documents' ||
          activeTab === 'expiring') && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by employee name, ID, document code, or title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#07563D]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-[#07563D]"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={verifFilter}
                onChange={e => setVerifFilter(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-[#07563D]"
              >
                <option value="all">All Verification</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING_VERIFICATION">Pending Review</option>
                <option value="REJECTED">Rejected</option>
                <option value="EXPIRED">Expired</option>
              </select>

              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-[#07563D]"
              >
                <option value="all">All Classifications</option>
                <option value="restricted">Restricted</option>
                <option value="confidential">Confidential</option>
                <option value="internal">Internal</option>
                <option value="public_internal">Public Internal</option>
              </select>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MASTER & FILTERED DOCUMENT LISTS */}
        {/* ========================================================================= */}
        {(activeTab === 'all_documents' ||
          activeTab === 'my_documents' ||
          activeTab === 'employee_documents' ||
          activeTab === 'vendor_documents' ||
          activeTab === 'expiring') && (
          <Card className="border border-gray-200/80 shadow-xs overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="font-bold text-gray-900 text-xs">Document Title & Code</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Subject / Entity</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Category</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Security</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Version</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Verification</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Expiry</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs font-bold text-gray-700">No documents found matching filters</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Try clearing search terms or click '+ Ingest Document' to add a new file.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map(doc => (
                    <TableRow
                      key={doc.id}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                      onClick={() => {
                        setActiveDocument(doc);
                        setIsDetailDrawerOpen(true);
                      }}
                    >
                      {/* Title & Code */}
                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-[#07563D]/10 text-[#07563D] rounded-xl shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-gray-900 text-xs line-clamp-1 block">
                              {doc.title}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 block">
                              {doc.document_type_code} • {doc.current_version?.file_name}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Subject Entity */}
                      <TableCell>
                        <div>
                          <span className="font-bold text-gray-900 text-xs block">
                            {doc.subject_name || doc.subject_id}
                          </span>
                          <Badge variant="neutral" className="text-[9px] mt-0.5">
                            {doc.subject_type.toUpperCase()}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <span className="text-xs font-medium text-gray-700">{doc.category_code}</span>
                      </TableCell>

                      {/* Security Classification */}
                      <TableCell>{getClassificationBadge(doc.classification)}</TableCell>

                      {/* Version & Size */}
                      <TableCell>
                        <span className="text-xs font-mono font-bold text-gray-800">
                          V{doc.version_count || 1}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          {doc.file_size}
                        </span>
                      </TableCell>

                      {/* Verification Status */}
                      <TableCell>{getVerificationBadge(doc.verification_status)}</TableCell>

                      {/* Expiry */}
                      <TableCell>
                        {doc.expires_at ? (
                          <div>
                            <span className="text-xs font-bold text-gray-900 block">{doc.expires_at}</span>
                            {doc.days_until_expiry !== undefined && (
                              <span
                                className={`text-[10px] font-bold ${
                                  doc.days_until_expiry <= 7
                                    ? 'text-red-600'
                                    : doc.days_until_expiry <= 30
                                    ? 'text-amber-600'
                                    : 'text-gray-400'
                                }`}
                              >
                                {doc.days_until_expiry < 0 ? 'Expired' : `${doc.days_until_expiry}d left`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Never</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveDocument(doc);
                              setIsPreviewModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveDocument(doc);
                              setIsShareModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Server Pagination Toolbar */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <div>
                Showing <strong>{documents.length}</strong> of <strong>{totalDocsCount}</strong> total documents
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-bold text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-7 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VERIFICATION QUEUE */}
        {/* ========================================================================= */}
        {activeTab === 'verification_queue' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start justify-between text-xs text-amber-900">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <span className="font-extrabold text-sm block">
                    {metrics?.pending_verification ?? 0} Documents Awaiting Verification
                  </span>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Review identity cards, tax forms, and qualification certificates against statutory standards.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents
                .filter(d => d.verification_status !== 'VERIFIED')
                .map(doc => (
                  <Card key={doc.id} className="p-5 border border-gray-200/80 bg-white space-y-3 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-extrabold text-gray-900 text-sm block">{doc.title}</span>
                        <span className="text-xs text-gray-500">
                          Subject: <strong className="text-gray-800">{doc.subject_name || doc.subject_id}</strong> (
                          {doc.subject_type})
                        </span>
                      </div>
                      <Badge variant="amber">{doc.verification_status}</Badge>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1 font-mono text-gray-600">
                      <div>File: {doc.current_version?.file_name}</div>
                      <div>Uploaded: {new Date(doc.created_at).toLocaleDateString()} by {doc.created_by}</div>
                      <div>Classification: {doc.classification.toUpperCase()}</div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveDocument(doc);
                          setIsPreviewModalOpen(true);
                        }}
                        className="text-xs h-8"
                      >
                        Inspect File
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          documentVerificationService.verifyDocument(doc.id, 'Verified via review queue.');
                          showToast('Document verified.', 'success');
                          loadData();
                        }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 font-bold"
                      >
                        Approve & Verify
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: E-SIGNATURE WORKFLOWS */}
        {/* ========================================================================= */}
        {activeTab === 'esign' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-900">Active E-Signature Requests</h3>
              <Button
                size="sm"
                onClick={() => setIsEsignModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
              >
                New E-Sign Request
              </Button>
            </div>

            <div className="space-y-3">
              {esignRequests.map(req => (
                <Card key={req.id} className="p-5 border border-gray-200 bg-white space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-[#07563D]" />
                        <h4 className="font-extrabold text-sm text-gray-900">{req.title}</h4>
                      </div>
                      <span className="text-xs text-gray-500 mt-0.5 block">
                        Initiated by <strong>{req.initiator_name}</strong> • Mode: {req.signing_mode}
                      </span>
                    </div>
                    <Badge variant={req.status === 'Completed' ? 'emerald' : 'amber'}>
                      {req.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Signers Progress Bar & Badges */}
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      Signer Participants ({req.participants?.length || 0})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {(req.participants || []).map(p => (
                        <div
                          key={p.id}
                          className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-gray-900 block">{p.name}</span>
                            <span className="text-[10px] text-gray-400">{p.role} • {p.email}</span>
                          </div>
                          <Badge variant={p.status === 'SIGNED' ? 'emerald' : 'neutral'} className="text-[9px]">
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* E-sign Quick Sign Action simulation */}
                  {req.status !== 'Completed' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <Button
                        size="sm"
                        onClick={() => {
                          const firstPending = req.participants?.find(p => p.status !== 'SIGNED');
                          if (firstPending) {
                            esignService.signDocument({
                              esignRequestId: req.id,
                              participantId: firstPending.id,
                            });
                            showToast(`Signed as ${firstPending.name} with digital certificate.`, 'success');
                            loadData();
                          }
                        }}
                        className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
                      >
                        Execute Next Digital Signature
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SHARED DOCUMENT LINKS */}
        {/* ========================================================================= */}
        {activeTab === 'shared' && (
          <Card className="border border-gray-200/80 shadow-xs overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="font-bold text-gray-900 text-xs">Shared With Email</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Shared By</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Granted Capabilities</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Access Count</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Expires At</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharedLinks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-gray-400 text-xs">
                      No active shared document links. Click 'Share Link' on any document to create a time-bounded link.
                    </TableCell>
                  </TableRow>
                ) : (
                  sharedLinks.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-bold text-gray-900 text-xs">{s.shared_with_email}</TableCell>
                      <TableCell className="text-xs text-gray-700">{s.shared_by_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[10px]">
                          {s.can_view && <Badge variant="neutral">View</Badge>}
                          {s.can_download && <Badge variant="blue">Download</Badge>}
                          {s.can_print && <Badge variant="amber">Print</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{s.access_count} / {s.max_access_count}</TableCell>
                      <TableCell className="text-xs font-mono text-gray-700">
                        {new Date(s.expires_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {!s.revoked_at ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              documentSharingService.revokeShare(s.id);
                              showToast('Share link revoked.', 'success');
                              loadData();
                            }}
                            className="text-xs h-7 text-red-600 hover:bg-red-50"
                          >
                            Revoke
                          </Button>
                        ) : (
                          <Badge variant="rose">REVOKED</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: IMMUTABLE AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <Card className="border border-gray-200/80 shadow-xs overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="font-bold text-gray-900 text-xs">Timestamp</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Actor</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Action</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Document ID</TableHead>
                  <TableHead className="font-bold text-gray-900 text-xs">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-400 text-xs">
                      No audit events logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map(log => (
                    <TableRow key={log.id} className="text-xs">
                      <TableCell className="font-mono text-[11px] text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-gray-900 block">{log.actor_name}</span>
                        <span className="text-[10px] text-gray-400">{log.actor_role}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="purple" className="text-[10px] font-bold font-mono">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-gray-600">
                        {log.document_id || 'System'}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-gray-500 max-w-md truncate">
                        {JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Secure Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        document={activeDocument}
        onRefresh={loadData}
      />

      {/* 360 Document Detail Drawer */}
      <DocumentDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        document={activeDocument}
        onRefresh={loadData}
        onOpenPreview={doc => {
          setActiveDocument(doc);
          setIsPreviewModalOpen(true);
        }}
        onOpenShare={doc => {
          setActiveDocument(doc);
          setIsShareModalOpen(true);
        }}
      />

      {/* Create E-Sign Modal */}
      <CreateEsignModal
        isOpen={isEsignModalOpen}
        onClose={() => setIsEsignModalOpen(false)}
        onSuccess={loadData}
        documents={documents}
        defaultDocumentId={activeDocument?.id}
      />

      {/* Time-bounded Share Modal */}
      <ShareDocumentModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        document={activeDocument}
      />
    </div>
  );
};
export default DocumentManagementView;
