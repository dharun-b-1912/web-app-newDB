// src/features/storage/StorageAdministrationView.tsx
// ============================================================================
// JOY PeopleHR — Enterprise Storage Administration & Document Vault Explorer
// Human-Readable Multi-Tenant Tree, Entity Resolution & Private Signed URL Preview
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  Eye,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Users,
  Briefcase,
  Layers,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Upload,
  Lock,
  FileSpreadsheet,
  AlertTriangle,
  User,
  Trash2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { enterpriseStorageService } from '../../services/document/enterpriseStorageService';
import { api } from '../../services/api';
import {
  StorageDocumentRecord,
  StorageDocumentCategory,
  StorageEntityType,
  StorageVerificationStatus,
} from '../../types/storage';

export function StorageAdministrationView() {
  const { user } = useAuth();
  const { primaryRole } = usePermission();

  // State
  const [documents, setDocuments] = useState<StorageDocumentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: StorageEntityType | 'ALL';
    id?: string;
    label: string;
    subCategory?: StorageDocumentCategory | 'ALL';
  }>({
    type: 'ALL',
    label: 'All Storage Objects',
    subCategory: 'ALL',
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Hierarchy Expansion States
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'hr-internal': true,
    'vendor-orgs': true,  // Keep vendor section visible by default
    'client-orgs': false,
  });

  // Sidebar collapse toggle
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Entities Master Data
  const [employees, setEmployees] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Preview & Verification Modals
  const [previewDoc, setPreviewDoc] = useState<StorageDocumentRecord | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [verifyModalDoc, setVerifyModalDoc] = useState<StorageDocumentRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadEntityType, setUploadEntityType] = useState<StorageEntityType>('EMPLOYEE');
  const [uploadEntityId, setUploadEntityId] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<StorageDocumentCategory>('STATUTORY_DOCUMENT');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Load Data
  const loadStorageData = async () => {
    setLoading(true);
    try {
      // 1. Fetch documents, employees, vendors in parallel safely
      const [docsResult, empResult, vendorResult] = await Promise.allSettled([
        enterpriseStorageService.listDocuments(),
        api.getEmployees(),
        api.getVendors(),
      ]);

      const docs: StorageDocumentRecord[] =
        docsResult.status === 'fulfilled' && Array.isArray(docsResult.value) ? docsResult.value : [];

      const empData = empResult.status === 'fulfilled' ? empResult.value : [];
      const allEmps = Array.isArray(empData) ? empData : (empData as any)?.data || [];
      setEmployees(allEmps);

      const vData = vendorResult.status === 'fulfilled' ? vendorResult.value : [];
      const allVendors = Array.isArray(vData) ? vData : (vData as any)?.data || [];
      setVendors(allVendors);

      // Enrich documents with human readable names
      const enrichedDocs = docs.map(doc => {
        let entityName = doc.entity_id;
        let entityCode = '';
        if (doc.entity_type === 'EMPLOYEE' || doc.employee_id) {
          const emp = allEmps.find((e: any) => e.id === doc.entity_id || e.id === doc.employee_id);
          if (emp) {
            entityName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || doc.entity_id;
            entityCode = emp.employee_code || emp.code || '';
          }
        } else if (doc.entity_type === 'VENDOR' || doc.vendor_id) {
          const vnd = allVendors.find((v: any) => v.id === doc.entity_id || v.id === doc.vendor_id);
          if (vnd) {
            entityName = vnd.trade_name || vnd.legal_name || vnd.name || vnd.company_name || doc.entity_id;
            entityCode = vnd.vendor_code || vnd.code || '';
          }
        }
        return {
          ...doc,
          entity_display_name: entityName,
          entity_code: entityCode,
        };
      });

      setDocuments(enrichedDocs);
    } catch (err) {
      console.error('[StorageAdministrationView] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorageData();
  }, []);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Preview Document Handler
  const handleOpenPreview = async (doc: StorageDocumentRecord) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewSignedUrl(null);
    try {
      const signed = await enterpriseStorageService.getSignedUrl(doc.bucket_id, doc.object_path);
      if (signed?.signedUrl) {
        setPreviewSignedUrl(signed.signedUrl);
      }
    } catch (e) {
      console.error('Failed to generate preview URL:', e);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle Verification
  const handleUpdateVerification = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    const actor = user?.name || user?.email || 'HR Administrator';
    await enterpriseStorageService.updateVerificationStatus(
      docId,
      status,
      actor,
      status === 'REJECTED' ? rejectionReason : undefined
    );
    setVerifyModalDoc(null);
    setRejectionReason('');
    await loadStorageData();
  };

  // Handle Document Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadEntityId) return;

    setIsUploading(true);
    try {
      await enterpriseStorageService.uploadDocument({
        organizationId: 'org-joy-01',
        entityType: uploadEntityType,
        entityId: uploadEntityId,
        employeeId: uploadEntityType === 'EMPLOYEE' ? uploadEntityId : undefined,
        vendorId: uploadEntityType === 'VENDOR' ? uploadEntityId : undefined,
        fileCategory: uploadCategory,
        documentType: uploadCategory.replace('_', ' '),
        fileName: uploadFile.name,
        file: uploadFile,
        uploadedBy: user?.name || user?.email || 'HR Administrator',
      });
      setUploadFile(null);
      await loadStorageData();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // 1. Entity Filter
      if (selectedEntity.type !== 'ALL') {
        if (doc.entity_type !== selectedEntity.type) return false;
        if (selectedEntity.id && doc.entity_id !== selectedEntity.id) return false;
        if (selectedEntity.subCategory && selectedEntity.subCategory !== 'ALL' && doc.file_category !== selectedEntity.subCategory) {
          return false;
        }
      }

      // 2. Category Filter
      if (categoryFilter !== 'ALL' && doc.file_category !== categoryFilter) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'ALL' && doc.verification_status !== statusFilter) {
        return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (doc.display_file_name || '').toLowerCase().includes(q);
        const matchesEntity = (doc.entity_display_name || '').toLowerCase().includes(q);
        const matchesCode = (doc.entity_code || '').toLowerCase().includes(q);
        const matchesPath = (doc.object_path || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEntity && !matchesCode && !matchesPath) return false;
      }

      return true;
    });
  }, [documents, selectedEntity, categoryFilter, statusFilter, searchQuery]);

  // Total Storage Size Calculation
  const totalSizeBytes = useMemo(() => {
    return documents.reduce((acc, doc) => acc + (doc.file_size_bytes || 0), 0);
  }, [documents]);

  const pendingVerificationCount = useMemo(() => {
    return documents.filter(d => d.verification_status === 'PENDING').length;
  }, [documents]);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Top Banner / Breadcrumb & Controls */}
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-indigo-400 uppercase">
            <Building2 className="w-4 h-4" />
            <span>Joy Corporate Solution</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">JOY PeopleHR Enterprise Storage</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1 flex items-center gap-3">
            <span>Multi-Tenant Document Vault & Media Storage</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Lock className="w-3 h-3" /> Private-by-Default
            </span>
          </h1>
        </div>

        {/* Global Storage Metrics */}
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-slate-400">Total Vaulted Files</div>
            <div className="text-base font-bold text-white">{documents.length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-slate-400">Total Encrypted Size</div>
            <div className="text-base font-bold text-indigo-400">{formatFileSize(totalSizeBytes)}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-slate-400">Pending Verification</div>
            <div className={`text-base font-bold ${pendingVerificationCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {pendingVerificationCount}
            </div>
          </div>
          <button
            onClick={loadStorageData}
            disabled={loading}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Refresh Storage Index"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content: Split Tree Explorer + Document Data Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Collapsible Human-Readable Business Navigation Tree */}
        <div className={`${sidebarCollapsed ? 'w-10' : 'w-64'} flex-shrink-0 bg-slate-950/60 border-r border-slate-800/80 flex flex-col overflow-y-auto transition-all duration-200`}>
          <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" /> Navigator
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0 ml-auto"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {sidebarCollapsed ? (
            /* Mini icon rail when collapsed */
            <div className="flex flex-col items-center gap-3 py-3">
              <button
                onClick={() => { setSidebarCollapsed(false); setSelectedEntity({ type: 'EMPLOYEE', label: 'All Employee Documents', subCategory: 'ALL' }); }}
                className="p-2 rounded-lg text-blue-400 hover:bg-slate-800 transition-colors" title="Employee Files"
              >
                <Briefcase className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setSidebarCollapsed(false); setSelectedEntity({ type: 'VENDOR', label: 'All Vendor Documents', subCategory: 'ALL' }); }}
                className="p-2 rounded-lg text-amber-400 hover:bg-slate-800 transition-colors" title="Vendor Organizations"
              >
                <Users className="w-4 h-4" />
              </button>
            </div>
          ) : (
          <div className="p-2 space-y-1 text-sm">
            {/* 1. HR Internal Section */}
            <div>
              <button
                onClick={() => toggleNode('hr-internal')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-800/60 text-slate-200 font-medium text-xs"
              >
                <div className="flex items-center gap-2">
                  {expandedNodes['hr-internal'] ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  <span>HR Internal & Workforce</span>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                  {employees.length}
                </span>
              </button>

              {expandedNodes['hr-internal'] && (
                <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-slate-800 ml-3.5 my-1">
                  {/* Category Shortcuts */}
                  <button
                    onClick={() => setSelectedEntity({ type: 'EMPLOYEE', label: 'All Employee Documents', subCategory: 'ALL' })}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 transition-colors ${
                      selectedEntity.type === 'EMPLOYEE' && !selectedEntity.id && selectedEntity.subCategory === 'ALL'
                        ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Folder className="w-3 h-3 text-amber-400" />
                    <span>All Employee Files</span>
                  </button>

                  <button
                    onClick={() => setSelectedEntity({ type: 'EMPLOYEE', label: 'Profile Media Vault', subCategory: 'PROFILE_PHOTO' })}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 transition-colors ${
                      selectedEntity.subCategory === 'PROFILE_PHOTO'
                        ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3 text-purple-400" />
                    <span>Profile Photos (WebP)</span>
                  </button>

                  <button
                    onClick={() => setSelectedEntity({ type: 'EMPLOYEE', label: 'Statutory & KYC Vault', subCategory: 'STATUTORY_DOCUMENT' })}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 transition-colors ${
                      selectedEntity.subCategory === 'STATUTORY_DOCUMENT'
                        ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span>Statutory & Compliance</span>
                  </button>

                  {/* Employees List */}
                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1">Active Employees</div>
                    {employees.slice(0, 15).map(emp => {
                      const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || emp.id;
                      const isSelected = selectedEntity.id === emp.id;
                      return (
                        <button
                          key={emp.id}
                          onClick={() => setSelectedEntity({
                            type: 'EMPLOYEE',
                            id: emp.id,
                            label: `${empName} (${emp.employee_code || 'EMP'})`,
                            subCategory: 'ALL'
                          })}
                          className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-medium'
                              : 'text-slate-300 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="w-3 h-3 flex-shrink-0 text-slate-400" />
                            <span className="truncate">{empName}</span>
                          </div>
                          {emp.employee_code && (
                            <span className="text-[10px] text-slate-400 font-mono ml-1">{emp.employee_code}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Vendor Organizations Section */}
            <div>
              <button
                onClick={() => toggleNode('vendor-orgs')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-800/60 text-slate-200 font-medium text-xs"
              >
                <div className="flex items-center gap-2">
                  {expandedNodes['vendor-orgs'] ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Vendor Organizations</span>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                  {vendors.length}
                </span>
              </button>

              {expandedNodes['vendor-orgs'] && (
                <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-slate-800 ml-3.5 my-1">
                  <button
                    onClick={() => setSelectedEntity({ type: 'VENDOR', label: 'All Vendor Documents', subCategory: 'ALL' })}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 transition-colors ${
                      selectedEntity.type === 'VENDOR' && !selectedEntity.id
                        ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Folder className="w-3 h-3 text-amber-400" />
                    <span>All Vendor Documents</span>
                  </button>

                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 flex items-center justify-between">
                      <span>Partner Vendors</span>
                      <span className="text-[10px] text-slate-500 font-mono">{vendors.length} Total</span>
                    </div>
                    {vendors.length === 0 ? (
                      <div className="px-2 py-2 text-[11px] text-slate-500 italic">
                        No vendor records registered.
                      </div>
                    ) : (
                      vendors.map(vnd => {
                        const vndName = vnd.trade_name || vnd.legal_name || vnd.name || vnd.company_name || vnd.id;
                        const vndCode = vnd.vendor_code || vnd.code || '';
                        const isSelected = selectedEntity.id === vnd.id;
                        const docCount = documents.filter(d => d.entity_id === vnd.id || d.vendor_id === vnd.id).length;

                        return (
                          <button
                            key={vnd.id}
                            onClick={() => setSelectedEntity({
                              type: 'VENDOR',
                              id: vnd.id,
                              label: `${vndName} ${vndCode ? `(${vndCode})` : ''}`,
                              subCategory: 'ALL'
                            })}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-medium'
                                : 'text-slate-300 hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                              <span className="truncate font-medium">{vndName}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {vndCode && (
                                <span className="text-[9.5px] px-1 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-semibold">
                                  {vndCode}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                {docCount}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Client & Billing Exports Section */}
            <div>
              <button
                onClick={() => toggleNode('client-orgs')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-800/60 text-slate-200 font-medium text-xs"
              >
                <div className="flex items-center gap-2">
                  {expandedNodes['client-orgs'] ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Billing & Workbooks</span>
                </div>
              </button>

              {expandedNodes['client-orgs'] && (
                <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-slate-800 ml-3.5 my-1">
                  <button
                    onClick={() => setSelectedEntity({ type: 'BILLING', label: 'Billing Exports & Invoices', subCategory: 'ALL' })}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 transition-colors ${
                      selectedEntity.type === 'BILLING'
                        ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>Client Invoices & Annexures</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Right Side: Document Table & Filters */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/50">
          {/* Header & Quick Action Bar */}
          <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80">
            <div>
              <div className="text-xs text-slate-400">Current Scope:</div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>{selectedEntity.label}</span>
                <span className="text-xs font-normal text-slate-400">
                  ({filteredDocuments.length} document{filteredDocuments.length === 1 ? '' : 's'})
                </span>
              </div>
            </div>

            {/* Upload Action */}
            <div className="flex items-center gap-2">
              <form onSubmit={handleUploadSubmit} className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadFile ? uploadFile.name : 'Upload Vault Document'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        setUploadEntityId(selectedEntity.id || (employees[0]?.id || 'emp-1'));
                      }
                    }}
                  />
                </label>
                {uploadFile && (
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    {isUploading ? 'Uploading...' : 'Confirm'}
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Search and Category Filters */}
          <div className="p-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by file name, employee, vendor, or path..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Categories</option>
                <option value="PROFILE_PHOTO">Profile Photos</option>
                <option value="STATUTORY_DOCUMENT">Statutory & KYC</option>
                <option value="IDENTITY_DOCUMENT">Identity Proofs</option>
                <option value="BANK_DOCUMENT">Bank & Cheques</option>
                <option value="CONTRACT">Contracts & Letters</option>
                <option value="COMPLIANCE_PROOF">Compliance Proofs</option>
                <option value="PAYSLIP">Payslips</option>
                <option value="BILLING_EXPORT">Billing Exports</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending Review</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Document Table */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Reading multi-tenant document vault metadata...</span>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl">
                <FolderOpen className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">No storage documents found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  There are no documents matching the selected scope or filter in this tenant.
                </p>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                      <th className="py-3 px-4">Document / File Name</th>
                      <th className="py-3 px-3">Entity & Ownership</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Bucket & Path</th>
                      <th className="py-3 px-3">Size</th>
                      <th className="py-3 px-3">Verification</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                    {filteredDocuments.map(doc => {
                      const isProfile = doc.file_category === 'PROFILE_PHOTO';
                      return (
                        <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* File Name & Icon */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {isProfile ? (
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                  <FileText className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-slate-200 hover:text-indigo-300 cursor-pointer" onClick={() => handleOpenPreview(doc)}>
                                  {doc.display_file_name || doc.original_file_name}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-xs">{doc.original_file_name}</div>
                              </div>
                            </div>
                          </td>

                          {/* Entity Name */}
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-300">
                              {doc.entity_display_name || doc.entity_id}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {doc.entity_type} {doc.entity_code ? `· ${doc.entity_code}` : ''}
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                              isProfile
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : doc.file_category === 'STATUTORY_DOCUMENT'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : doc.file_category === 'COMPLIANCE_PROOF'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {doc.file_category.replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Bucket & Path */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 text-[11px] text-slate-300 font-mono">
                              <Lock className="w-2.5 h-2.5 text-emerald-400" />
                              <span>{doc.bucket_id}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]" title={doc.object_path}>
                              {doc.object_path}
                            </div>
                          </td>

                          {/* Size */}
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {formatFileSize(doc.file_size_bytes)}
                          </td>

                          {/* Verification Status */}
                          <td className="py-3 px-3">
                            {doc.verification_status === 'VERIFIED' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                              </span>
                            ) : doc.verification_status === 'REJECTED' ? (
                              <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-medium" title={doc.rejection_reason || 'Rejected'}>
                                <XCircle className="w-3.5 h-3.5" /> Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-medium">
                                <Clock className="w-3.5 h-3.5" /> Pending
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenPreview(doc)}
                                className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-indigo-400 transition-colors"
                                title="Inspect & Preview (Signed URL)"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {doc.verification_status === 'PENDING' && (
                                <button
                                  onClick={() => setVerifyModalDoc(doc)}
                                  className="p-1.5 rounded hover:bg-emerald-950/60 text-emerald-400 transition-colors"
                                  title="Verify or Reject"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">{previewDoc.display_file_name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{previewDoc.bucket_id} · {previewDoc.object_path}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto my-4 flex items-center justify-center min-h-[300px] bg-slate-950 rounded-xl border border-slate-800/80 p-4">
              {previewLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Generating secure 1-hour signed URL...</span>
                </div>
              ) : previewSignedUrl ? (
                previewDoc.file_category === 'PROFILE_PHOTO' || previewDoc.mime_type.startsWith('image/') ? (
                  <img
                    src={previewSignedUrl}
                    alt={previewDoc.display_file_name}
                    className="max-h-96 max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="text-center p-6">
                    <FileText className="w-16 h-16 text-indigo-400 mx-auto mb-3" />
                    <p className="text-xs text-slate-300 font-medium">Encrypted Document Asset</p>
                    <a
                      href={previewSignedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Full Document in Secure Tab
                    </a>
                  </div>
                )
              ) : (
                <div className="text-center text-slate-400 text-xs">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <span>Document preview could not be loaded via signed URL.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
              <div className="text-slate-500">
                Uploaded by <span className="text-slate-300 font-medium">{previewDoc.uploaded_by}</span> on {new Date(previewDoc.uploaded_at).toLocaleDateString()}
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Action Modal */}
      {verifyModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Verify Document Compliance</h3>
            <p className="text-xs text-slate-400 mb-4">
              Review and update statutory verification status for <span className="text-slate-200 font-semibold">{verifyModalDoc.display_file_name}</span>.
            </p>

            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Rejection Reason (if rejecting):</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Document image is blurry or expired..."
                className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setVerifyModalDoc(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateVerification(verifyModalDoc.id, 'REJECTED')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                Reject Document
              </button>
              <button
                onClick={() => handleUpdateVerification(verifyModalDoc.id, 'VERIFIED')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                Verify & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
